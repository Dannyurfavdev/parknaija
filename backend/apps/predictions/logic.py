"""
Park Naija AI — Availability Prediction Logic
----------------------------------------------
Hybrid engine:
  Layer 1: Rule-based patterns (time, day, city, area type)
  Layer 2: AI reasoning for nuanced human-language output

Nigerian city-specific knowledge baked in.
"""

from datetime import datetime


# ---------------------------------------------------------------------------
# City + Area congestion profiles
# ---------------------------------------------------------------------------

CITY_PROFILES = {
    "lagos": {
        "rush_hours_am": (7, 10),     # 7:00–10:00
        "rush_hours_pm": (16, 20),    # 16:00–20:00
        "peak_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "worst_areas": ["victoria island", "lekki", "ikeja", "marina", "surulere"],
        "notes": "Lagos has the most severe parking pressure in Nigeria. VI and Lekki are nearly impossible during work hours.",
    },
    "port_harcourt": {
        "rush_hours_am": (7, 9),
        "rush_hours_pm": (16, 19),
        "peak_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "worst_areas": ["rumuola", "old gra", "new gra", "trans amadi", "d-line"],
        "notes": "PH pressure intensifies near oil company offices and GRA zones during weekday mornings.",
    },
    "abuja": {
        "rush_hours_am": (7, 9),
        "rush_hours_pm": (17, 19),
        "peak_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "worst_areas": ["central business district", "wuse 2", "maitama", "garki"],
        "notes": "Abuja has more structured parking than Lagos/PH but CBD and Wuse 2 are highly congested on weekdays.",
    },
}

AREA_PRESSURE = {
    "commercial": 0.85,    # Very high base pressure
    "market": 0.95,        # Near-impossible on weekdays
    "mixed": 0.65,
    "residential": 0.30,
    "religious": 0.40,     # Spikes on Sundays/Fridays
}

DAY_MULTIPLIERS = {
    "monday": 1.1,
    "tuesday": 1.0,
    "wednesday": 1.0,
    "thursday": 1.0,
    "friday": 1.15,    # TGIF surge
    "saturday": 0.75,
    "sunday": 0.55,
}


def _pressure_score(city: str, area_type: str, hour: int, day_name: str) -> float:
    """
    Returns a 0.0–1.0 pressure score. Higher = harder to find parking.
    """
    profile = CITY_PROFILES.get(city, CITY_PROFILES["lagos"])
    base = AREA_PRESSURE.get(area_type, 0.60)
    day_mult = DAY_MULTIPLIERS.get(day_name, 1.0)

    # Rush hour boost
    am_start, am_end = profile["rush_hours_am"]
    pm_start, pm_end = profile["rush_hours_pm"]
    in_rush = (am_start <= hour < am_end) or (pm_start <= hour < pm_end)
    rush_boost = 0.20 if in_rush else 0.0

    # Religious area — Sunday/Friday spike
    religious_boost = 0.0
    if area_type == "religious":
        if day_name == "sunday" or (day_name == "friday" and 12 <= hour < 15):
            religious_boost = 0.40

    # Market area — Saturday surge
    market_boost = 0.0
    if area_type == "market" and day_name == "saturday":
        market_boost = 0.10

    score = (base * day_mult) + rush_boost + religious_boost + market_boost
    return min(score, 1.0)


def _availability_label(pressure: float) -> str:
    if pressure >= 0.80:
        return "Low"
    elif pressure >= 0.50:
        return "Medium"
    else:
        return "High"


def _best_window(city: str, area_type: str, day_name: str) -> str:
    """Find the 2-hour window with lowest pressure in working hours."""
    profile = CITY_PROFILES.get(city, CITY_PROFILES["lagos"])
    best_hour = 9
    best_score = 1.0

    for hour in range(6, 22):
        score = _pressure_score(city, area_type, hour, day_name)
        if score < best_score:
            best_score = score
            best_hour = hour

    end_hour = best_hour + 2
    return f"{best_hour:02d}:00 – {end_hour:02d}:00"


def _avoid_areas(city: str, pressure: float) -> list:
    profile = CITY_PROFILES.get(city, CITY_PROFILES["lagos"])
    if pressure >= 0.70:
        return profile.get("worst_areas", [])[:3]
    return []


def predict_availability(
    city: str,
    area_type: str,
    target_dt: datetime,
    destination: str = "",
) -> dict:
    """
    Main prediction function. Returns structured prediction result.
    """
    hour = target_dt.hour
    day_name = target_dt.strftime("%A").lower()

    pressure = _pressure_score(city, area_type, hour, day_name)
    availability = _availability_label(pressure)
    best_window = _best_window(city, area_type, day_name)
    avoid = _avoid_areas(city, pressure)
    city_profile = CITY_PROFILES.get(city, {})

    # Confidence level
    confidence = "high" if city in CITY_PROFILES else "low"

    # Human-readable summary
    pressure_pct = int(pressure * 100)
    time_str = target_dt.strftime("%I:%M %p")
    day_str = target_dt.strftime("%A")

    summary_parts = [
        f"On {day_str} at {time_str} in a {area_type} area of {city.replace('_', ' ').title()},",
        f"parking demand is estimated at {pressure_pct}%.",
    ]

    if availability == "Low":
        summary_parts.append(
            "Finding a space will be difficult. Consider arriving earlier or using a pre-booked space."
        )
    elif availability == "Medium":
        summary_parts.append(
            "Parking is available but competitive. Have a backup option ready."
        )
    else:
        summary_parts.append(
            "Parking should be relatively easy to find at this time."
        )

    tips = []
    if availability in ["Low", "Medium"]:
        tips.append(f"Best time to park nearby: {best_window}")
        tips.append("Book a listed space in advance using Park Naija AI.")
    if avoid:
        formatted = ", ".join(a.title() for a in avoid)
        tips.append(f"Avoid searching on streets near: {formatted}")
    if city == "lagos":
        tips.append("Consider a park-and-ride approach — park further out and use okada or ride-share for the last mile.")
    if area_type == "market":
        tips.append("Market areas fill up before 9 AM. Arrive early or park 2–3 streets away.")

    return {
        "summary": " ".join(summary_parts),
        "availability": availability,
        "pressure_score": pressure_pct,
        "best_time_window": best_window,
        "areas_to_avoid": avoid,
        "city_context": city_profile.get("notes", ""),
        "tips": tips,
        "confidence": confidence,
        "predicted_for": {
            "city": city,
            "area_type": area_type,
            "day": day_str,
            "time": time_str,
        },
    }
