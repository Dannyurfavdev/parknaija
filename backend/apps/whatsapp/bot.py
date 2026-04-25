"""
Park Naija AI — WhatsApp Bot Brain
------------------------------------
Stateful conversation engine.
Each inbound message goes through:
  1. parse_intent()   → what does the user want?
  2. handle()         → route to correct handler based on current state
  3. handler logic    → transition state, collect data, call APIs
  4. return reply     → plain text string to send back

Design:
  - Pure Python — no Django request objects in here (testable)
  - All DB calls isolated to session_manager.py
  - All AI calls go through apps.extraction.ai_service
  - All message strings live in messages.py
"""

from datetime import datetime, timedelta
import re

from .models import WhatsAppSession
from . import messages as msg
from apps.extraction.ai_service import get_ai_response, parse_json_response
from apps.predictions.logic import predict_availability
from apps.listings.models import ParkingSpace
from apps.recommendations.views import RecommendationView


# ── Intent keywords ───────────────────────────────────────────

INTENTS = {
    "menu":    ["menu", "start", "hi", "hello", "hey", "hola", "oya", "nna", "help me", "options"],
    "find":    ["find", "park", "parking", "1", "where", "space", "spot", "where can i park"],
    "list":    ["list", "submit", "add", "my space", "my compound", "my garage", "2", "earn", "rent"],
    "parse":   ["parse", "extract", "3", "read this", "check this", "what does this say"],
    "predict": ["predict", "availability", "4", "how busy", "can i find", "will i find"],
    "help":    ["help", "commands", "what can you do"],
    "reset":   ["reset", "cancel", "start over", "back", "restart", "quit"],
    "yes":     ["yes", "yeah", "yep", "ok", "okay", "confirm", "sure", "correct", "right"],
    "no":      ["no", "nope", "cancel", "wrong", "incorrect", "stop"],
    "skip":    ["skip", "any", "no budget", "no limit", "doesn't matter"],
    "save":    ["save", "submit", "add this", "yes save", "ok save"],
    "more":    ["more", "search again", "try again", "another"],
    "now":     ["now", "immediately", "asap", "right now", "this moment"],
}

CITY_MAP = {
    "1": "lagos", "lagos": "lagos",
    "2": "port_harcourt", "port harcourt": "port_harcourt",
    "ph": "port_harcourt", "portharcourt": "port_harcourt",
    "3": "abuja", "abuja": "abuja",
}

AREA_MAP = {
    "1": "commercial", "commercial": "commercial",
    "office": "commercial", "bank": "commercial", "mall": "commercial",
    "2": "market", "market": "market", "market area": "market",
    "3": "residential", "residential": "residential", "house": "residential",
    "4": "mixed", "mixed": "mixed", "not sure": "mixed", "anywhere": "mixed",
}


def match_intent(text: str) -> str | None:
    """Return the matched intent string or None."""
    clean = text.strip().lower()
    for intent, keywords in INTENTS.items():
        # Exact match first
        if clean in keywords:
            return intent
        # Substring match — but skip single-char/digit keywords to avoid false positives
        for kw in keywords:
            if len(kw) <= 1:
                continue  # only exact-match single chars like "1","2","3"
            if kw in clean:
                return intent
    return None


def parse_naira(text: str) -> float | None:
    """Parse Nigerian price shorthand: 2k → 2000, 1.5k → 1500, 2000 → 2000."""
    text = text.strip().lower().replace(",", "").replace("₦", "").replace("naira", "")
    match = re.search(r"(\d+\.?\d*)\s*k", text)
    if match:
        return float(match.group(1)) * 1000
    match = re.search(r"(\d+\.?\d*)", text)
    if match:
        val = float(match.group(1))
        return val if val >= 100 else None  # reject suspiciously small numbers
    return None


def parse_time(text: str) -> str | None:
    """Parse time strings into HH:MM format."""
    text = text.strip().lower()
    if text in ("now", "immediately", "asap", "right now"):
        return datetime.now().strftime("%H:%M")

    # 8am / 8:30am / 14:00 / 2pm
    match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", text)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2)) if match.group(2) else 0
        meridiem = match.group(3)
        if meridiem == "pm" and hour != 12:
            hour += 12
        elif meridiem == "am" and hour == 12:
            hour = 0
        return f"{hour:02d}:{minute:02d}"
    return None


def parse_hours_range(text: str):
    """Parse '7am to 9pm' → ('07:00', '21:00')."""
    text = text.lower().replace("–", "to").replace("-", "to")
    if "anytime" in text or "24" in text:
        return "00:00", "23:59"
    parts = re.split(r"\s+to\s+|\s*-\s*", text)
    if len(parts) == 2:
        return parse_time(parts[0]), parse_time(parts[1])
    return None, None


# ── Main handler ──────────────────────────────────────────────

def handle_message(session: WhatsAppSession, inbound_text: str) -> str:
    """
    Entry point for every inbound WhatsApp message.
    Returns the reply string to send back.
    """
    text = inbound_text.strip()
    intent = match_intent(text)
    state = session.state

    session.increment()

    # ── Global overrides (work in any state) ──────────────────
    if intent == "reset" or intent == "menu":
        session.reset()
        return msg.WELCOME

    if intent == "help":
        return msg.HELP

    # ── Route by current state ────────────────────────────────

    # IDLE — fresh conversation
    if state == WhatsAppSession.State.IDLE:
        return _handle_idle(session, text, intent)

    # FIND FLOW
    if state == WhatsAppSession.State.FIND_CITY:
        return _handle_find_city(session, text)

    if state == WhatsAppSession.State.FIND_AREA:
        return _handle_find_area(session, text)

    if state == WhatsAppSession.State.FIND_TIME:
        return _handle_find_time(session, text)

    if state == WhatsAppSession.State.FIND_BUDGET:
        return _handle_find_budget(session, text)

    if state == WhatsAppSession.State.FIND_RESULT:
        return _handle_find_result(session, text, intent)

    # SUBMIT FLOW
    if state == WhatsAppSession.State.SUBMIT_START:
        return _handle_submit_start(session, text)

    if state == WhatsAppSession.State.SUBMIT_NAME:
        return _handle_submit_name(session, text)

    if state == WhatsAppSession.State.SUBMIT_CITY:
        return _handle_submit_city(session, text)

    if state == WhatsAppSession.State.SUBMIT_ADDR:
        return _handle_submit_addr(session, text)

    if state == WhatsAppSession.State.SUBMIT_PRICE:
        return _handle_submit_price(session, text)

    if state == WhatsAppSession.State.SUBMIT_CAP:
        return _handle_submit_cap(session, text)

    if state == WhatsAppSession.State.SUBMIT_HOURS:
        return _handle_submit_hours(session, text, intent)

    # EXTRACT FLOW
    if state == WhatsAppSession.State.EXTRACT_WAIT:
        return _handle_extract(session, text, intent)

    # Fallback
    session.reset()
    return msg.WELCOME


# ── IDLE handler ──────────────────────────────────────────────

def _handle_idle(session, text, intent):
    if intent == "find":
        session.set_state(WhatsAppSession.State.FIND_CITY)
        return msg.ASK_CITY

    if intent == "list":
        session.set_state(WhatsAppSession.State.SUBMIT_START)
        return msg.SUBMIT_INTRO

    if intent == "parse":
        session.set_state(WhatsAppSession.State.EXTRACT_WAIT)
        return msg.EXTRACT_PROMPT

    if intent == "predict":
        session.set_state(WhatsAppSession.State.FIND_CITY)
        session.data["mode"] = "predict"
        session.save()
        return msg.ASK_CITY

    # Smart: if the user pastes a listing-looking message unprompted
    if len(text) > 30 and any(w in text.lower() for w in ["park", "compound", "space", "naira", "per hour", "₦", "k per"]):
        session.set_state(WhatsAppSession.State.EXTRACT_WAIT)
        return _handle_extract(session, text, intent=None)

    return msg.WELCOME


# ── FIND FLOW handlers ────────────────────────────────────────

def _handle_find_city(session, text):
    city = CITY_MAP.get(text.strip().lower())
    if not city:
        return "❓ Please reply with *1* (Lagos), *2* (Port Harcourt), or *3* (Abuja)."

    if session.data.get("mode") == "predict":
        session.set_state(WhatsAppSession.State.FIND_AREA, city=city)
        return msg.ASK_AREA

    session.set_state(WhatsAppSession.State.FIND_AREA, city=city)
    return msg.ASK_AREA


def _handle_find_area(session, text):
    area = AREA_MAP.get(text.strip().lower())
    if not area:
        return "❓ Please reply with *1*, *2*, *3*, or *4* for the area type."

    session.set_state(WhatsAppSession.State.FIND_TIME, area_type=area)

    if session.data.get("mode") == "predict":
        return msg.ASK_TIME
    return msg.ASK_TIME


def _handle_find_time(session, text):
    t = parse_time(text)
    if not t:
        return (
            "❓ I didn't understand that time.\n\n"
            "Please reply like: *8am*, *2pm*, *14:30*, or *now*"
        )

    session.set_state(WhatsAppSession.State.FIND_BUDGET, arrival_time=t)

    if session.data.get("mode") == "predict":
        # Run prediction immediately — no budget needed
        return _run_prediction(session)

    return msg.ASK_BUDGET


def _handle_find_budget(session, text):
    intent = match_intent(text)
    budget = None if intent == "skip" else parse_naira(text)

    if text.strip().lower() not in ("skip", "any", "no budget", "no limit") and budget is None:
        return (
            "❓ I didn't understand that budget.\n\n"
            "Reply with an amount like *1000*, *2k*, or *skip* to see all options."
        )

    session.set_state(WhatsAppSession.State.FIND_RESULT, budget=budget)
    return _run_recommendation(session)


def _run_recommendation(session) -> str:
    """Execute recommendation engine and format result."""
    data = session.data
    city = data.get("city", "lagos")
    area = data.get("area_type", "mixed")
    time_str = data.get("arrival_time", datetime.now().strftime("%H:%M"))
    budget = data.get("budget")

    try:
        # Build target datetime (today at given time)
        hour, minute = map(int, time_str.split(":"))
        target_dt = datetime.now().replace(hour=hour, minute=minute, second=0, microsecond=0)
        if target_dt < datetime.now():
            target_dt += timedelta(days=1)

        # Fetch and score spaces
        from apps.recommendations.scoring import score_parking_space
        from apps.predictions.logic import _pressure_score

        qs = ParkingSpace.objects.filter(city=city, status=ParkingSpace.Status.ACTIVE)
        if budget:
            qs = qs.filter(price_per_hour__lte=budget * 1.2)

        spaces = list(qs[:20])

        if not spaces:
            return (
                f"😔 No active parking spaces found in {city.replace('_', ' ').title()}.\n\n"
                "New spaces are added regularly. Try again later or reply *menu*."
            )

        pressure = _pressure_score(city, area, hour, area)
        day_name = target_dt.strftime("%A").lower()

        scored = []
        for space in spaces:
            score_data = score_parking_space(
                space=space,
                distance_km=None,
                budget_per_hour=budget,
                duration_hours=2,
                area_pressure=pressure,
            )
            scored.append((space, score_data))

        scored.sort(key=lambda x: x[1]["total_score"], reverse=True)
        top3 = scored[:3]

        recs = []
        for space, score_data in top3:
            recs.append({
                "id": space.id,
                "name": space.name,
                "address": space.address,
                "price_per_hour": float(space.price_per_hour),
                "price_is_negotiable": space.price_is_negotiable,
                "capacity": space.capacity,
                "availability": score_data["availability_label"],
                "parking_score": score_data["total_score"],
                "why_recommended": score_data["reason"],
                "distance_km": None,
                "features": {
                    "is_verified": space.is_verified,
                    "has_security": space.has_security,
                    "has_cctv": space.has_cctv,
                    "is_covered": space.is_covered,
                },
            })

        rec_data = {
            "recommendations": recs,
            "situation": {
                "overall_availability": score_data["availability_label"],
                "pressure_score": int(pressure * 100),
            }
        }
        return msg.format_recommendations(rec_data)

    except Exception as e:
        return msg.ERROR_GENERIC


def _run_prediction(session) -> str:
    """Execute availability prediction."""
    data = session.data
    city = data.get("city", "lagos")
    area = data.get("area_type", "mixed")
    time_str = data.get("arrival_time", datetime.now().strftime("%H:%M"))

    try:
        hour, minute = map(int, time_str.split(":"))
        target_dt = datetime.now().replace(hour=hour, minute=minute, second=0)
        pred = predict_availability(city=city, area_type=area, target_dt=target_dt)
        session.reset()
        return msg.format_prediction(pred)
    except Exception:
        session.reset()
        return msg.ERROR_GENERIC


def _handle_find_result(session, text, intent):
    if intent == "more":
        session.reset()
        session.set_state(WhatsAppSession.State.FIND_CITY)
        return msg.ASK_CITY

    session.reset()
    return msg.WELCOME


# ── SUBMIT FLOW handlers ──────────────────────────────────────

def _handle_submit_start(session, text):
    """
    Smart: if the user pastes a large text blob here,
    treat it as an extraction request rather than a name.
    """
    if len(text) > 30 and any(w in text.lower() for w in ["per hour", "naira", "₦", "compound", "cars", "space for"]):
        session.set_state(WhatsAppSession.State.EXTRACT_WAIT)
        return _handle_extract(session, text, intent=None)

    session.set_state(WhatsAppSession.State.SUBMIT_NAME)
    return _handle_submit_name(session, text)


def _handle_submit_name(session, text):
    if len(text) < 3:
        return "❓ Please give a proper name for your parking space (at least 3 characters)."
    session.set_state(WhatsAppSession.State.SUBMIT_CITY, name=text)
    return msg.ASK_SUBMIT_CITY


def _handle_submit_city(session, text):
    city = CITY_MAP.get(text.strip().lower())
    if not city:
        return "❓ Reply *1* (Lagos), *2* (Port Harcourt), or *3* (Abuja)."
    session.set_state(WhatsAppSession.State.SUBMIT_ADDR, city=city)
    return msg.ASK_SUBMIT_ADDR


def _handle_submit_addr(session, text):
    if len(text) < 5:
        return "❓ Please give a more detailed address or landmark so drivers can find you."
    session.set_state(WhatsAppSession.State.SUBMIT_PRICE, address=text)
    return msg.ASK_SUBMIT_PRICE


def _handle_submit_price(session, text):
    price = parse_naira(text)
    if price is None:
        return "❓ I didn't understand that price. Reply like: *1000*, *1500*, or *2k*"
    session.set_state(WhatsAppSession.State.SUBMIT_CAP, price_per_hour=price)
    return msg.ASK_SUBMIT_CAP


def _handle_submit_cap(session, text):
    match = re.search(r"\d+", text)
    if not match:
        return "❓ Please reply with a number, e.g. *1*, *3*, *10*"
    cap = int(match.group())
    session.set_state(WhatsAppSession.State.SUBMIT_HOURS, capacity=cap)
    return msg.ASK_SUBMIT_HOURS


def _handle_submit_hours(session, text, intent):
    from_t, until_t = parse_hours_range(text)
    session.data["available_from"]  = from_t  or "00:00"
    session.data["available_until"] = until_t or "23:59"
    session.state = WhatsAppSession.State.IDLE  # next input = yes/no confirm
    session.save()

    # Show confirmation
    reply = msg.format_submit_confirm(session.data)
    # Temporarily move to SUBMIT_CAP state and overload it as confirm state
    session.set_state("submit_confirm")
    return reply


# ── EXTRACT FLOW handlers ─────────────────────────────────────

def _handle_extract(session, text, intent):
    if intent == "save" and session.data.get("last_extracted"):
        return _save_extracted(session)

    # Run AI extraction
    SYSTEM = """
    You are Park Naija AI — extract parking listing data from informal Nigerian text.
    Return ONLY valid JSON. No markdown, no preamble.
    Schema: {
      "name": string|null, "city": "lagos"|"port_harcourt"|"abuja"|"unknown",
      "address": string, "capacity": integer, "price_per_hour": number,
      "price_is_negotiable": boolean, "available_from": "HH:MM"|null,
      "available_until": "HH:MM"|null, "has_security": boolean,
      "notes": string|null, "confidence": "high"|"medium"|"low",
      "missing_fields": [string]
    }
    Nigerian context: 2k=2000, 1.5k=1500, "gateman"=security guard.
    """

    try:
        raw = get_ai_response(SYSTEM, text)
        extracted = parse_json_response(raw)
        session.data["last_extracted"] = extracted
        session.data["raw_text"]       = text
        session.set_state(WhatsAppSession.State.EXTRACT_WAIT)
        return msg.format_extraction(extracted, extracted.get("confidence", "low"))
    except Exception:
        session.reset()
        return msg.ERROR_GENERIC


def _save_extracted(session) -> str:
    """Save the last extracted listing to the database."""
    ex = session.data.get("last_extracted", {})
    try:
        ParkingSpace.objects.create(
            name=ex.get("name") or "Unnamed Space (WhatsApp)",
            city=ex.get("city") if ex.get("city") != "unknown" else "lagos",
            address=ex.get("address") or "See notes",
            capacity=ex.get("capacity") or 1,
            price_per_hour=ex.get("price_per_hour") or 0,
            price_is_negotiable=ex.get("price_is_negotiable", False),
            available_from=ex.get("available_from"),
            available_until=ex.get("available_until"),
            has_security=ex.get("has_security", False),
            notes=ex.get("notes") or session.data.get("raw_text", ""),
            source=ParkingSpace.Source.EXTRACTED,
            status=ParkingSpace.Status.PENDING,
        )
        session.reset()
        return msg.SUBMIT_SUCCESS
    except Exception:
        session.reset()
        return msg.SUBMIT_FAILED


def _save_manual(session) -> str:
    """Save manually collected listing to the database."""
    data = session.data
    try:
        ParkingSpace.objects.create(
            name=data.get("name", "Unnamed Space"),
            city=data.get("city", "lagos"),
            address=data.get("address", ""),
            capacity=int(data.get("capacity", 1)),
            price_per_hour=float(data.get("price_per_hour", 0)),
            available_from=data.get("available_from"),
            available_until=data.get("available_until"),
            source=ParkingSpace.Source.EXTRACTED,
            status=ParkingSpace.Status.PENDING,
        )
        session.reset()
        return msg.SUBMIT_SUCCESS
    except Exception:
        session.reset()
        return msg.SUBMIT_FAILED
