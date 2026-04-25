"""
Park Naija AI — WhatsApp Message Templates
--------------------------------------------
All outbound messages live here.
WhatsApp renders plain text only — we use emoji, spacing, and
light ASCII borders to create structure on mobile screens.

Rules:
  - Max ~1600 chars per message (Twilio limit)
  - Use emoji for visual hierarchy (no markdown)
  - Short sentences — Nigerian users read on small screens
  - Always give a clear NEXT STEP at the end of each message
"""


# ── Greeting & Menu ───────────────────────────────────────────

WELCOME = """\
🅿️ *Park Naija AI*

Parking assistant for Lagos, Port Harcourt & Abuja.

What do you want to do?

1️⃣  Find parking near me
2️⃣  List my parking space
3️⃣  Parse a parking message (WhatsApp listing → data)
4️⃣  Check parking availability

Reply with a number or just describe what you need.\
"""

HELP = """\
🅿️ *Park Naija AI — Commands*

*Finding Parking:*
Type  *find*  or  *1*  to start

*Listing Your Space:*
Type  *list*  or  *2*  to add your space

*Parse a Listing:*
Type  *parse*  or  *3*  then paste any parking message

*Check Availability:*
Type  *predict*  or  *4*

*Reset / Start Over:*
Type  *menu*  or  *reset*  at any time

━━━━━━━━━━━━━━
Need help? Reply *help*\
"""

RESET_MSG = """\
🔄 Starting over.

Type *menu* to see options, or just tell me what you need.\
"""

NOT_UNDERSTOOD = """\
🤔 I didn't quite get that.

Type *menu* to see all options, or:
• *find* — find parking
• *list* — list your space
• *parse* — extract a listing
• *help* — all commands\
"""


# ── Find Parking Flow ─────────────────────────────────────────

ASK_CITY = """\
📍 *Find Parking — Step 1 of 4*

Which city are you parking in?

Reply with:
*1* — Lagos
*2* — Port Harcourt
*3* — Abuja\
"""

ASK_AREA = """\
🏙️ *Step 2 of 4 — Area Type*

What kind of area is your destination?

*1* — Commercial (offices, banks, malls)
*2* — Market area
*3* — Residential
*4* — Mixed / not sure\
"""

ASK_TIME = """\
🕐 *Step 3 of 4 — When?*

What time will you arrive?

Reply with the time, e.g:
• *now*
• *8am*
• *2:30pm*
• *14:00*\
"""

ASK_BUDGET = """\
💰 *Step 4 of 4 — Budget* (optional)

What's your max budget per hour? (in Naira)

Examples:
• *1000*  → ₦1,000/hr
• *2k*    → ₦2,000/hr
• *skip*  → show all options\
"""


def format_recommendations(rec_data: dict) -> str:
    """Format top-3 AI recommendations for WhatsApp."""
    recs = rec_data.get("recommendations", [])
    situation = rec_data.get("situation", {})

    if not recs:
        return """\
😔 *No parking found*

No active spaces listed for this search yet.

Try:
• A different city
• Removing your budget
• Checking back later

New spaces are added daily 🙏\
"""

    avail = situation.get("overall_availability", "Unknown")
    pressure = situation.get("pressure_score", 0)

    avail_emoji = {"High": "🟢", "Medium": "🟡", "Low": "🔴"}.get(avail, "⚪")

    lines = [
        f"🅿️ *Top {len(recs)} Parking Options*",
        f"{avail_emoji} Area demand: *{avail}* ({pressure}% full)",
        "",
    ]

    rank_medals = ["🥇", "🥈", "🥉"]

    for i, space in enumerate(recs):
        medal = rank_medals[i] if i < 3 else f"#{i+1}"
        score = space.get("parking_score", 0)
        price = space.get("price_per_hour", 0)
        cap   = space.get("capacity", 1)
        dist  = space.get("distance_km")
        avail_s = space.get("availability", "Unknown")
        neg   = " *(neg.)*" if space.get("price_is_negotiable") else ""

        avail_icon = {"High": "🟢", "Medium": "🟡", "Low": "🔴"}.get(avail_s, "⚪")

        dist_str = f"  📏 {dist} km away\n" if dist is not None else ""

        features = []
        f = space.get("features", {})
        if f.get("is_verified"):   features.append("✓ Verified")
        if f.get("has_security"):  features.append("🛡️ Security")
        if f.get("has_cctv"):      features.append("📷 CCTV")
        if f.get("is_covered"):    features.append("🏠 Covered")
        feat_str = ("  🔧 " + " · ".join(features) + "\n") if features else ""

        reason = space.get("why_recommended", "")
        reason_str = f"  💬 _{reason}_\n" if reason else ""

        block = (
            f"{medal} *{space['name']}*\n"
            f"  📍 {space.get('address', '')}\n"
            f"  💵 ₦{int(price):,}/hr{neg}\n"
            f"  🚗 {cap} car{'s' if cap != 1 else ''} · {avail_icon} {avail_s}\n"
            f"  ⭐ Score: *{score}/100*\n"
            f"{dist_str}"
            f"{feat_str}"
            f"{reason_str}"
        )
        lines.append(block)
        lines.append("─" * 20)

    lines.append("")
    lines.append("Reply *more* to search again")
    lines.append("Reply *report full [space name]* if a space is full")
    lines.append("Reply *menu* for main menu")

    return "\n".join(lines)


def format_prediction(pred_data: dict) -> str:
    """Format availability prediction for WhatsApp."""
    avail = pred_data.get("availability", "Unknown")
    pressure = pred_data.get("pressure_score", 0)
    summary = pred_data.get("summary", "")
    best_window = pred_data.get("best_time_window", "")
    tips = pred_data.get("tips", [])
    avoid = pred_data.get("areas_to_avoid", [])

    avail_emoji = {"High": "🟢", "Medium": "🟡", "Low": "🔴"}.get(avail, "⚪")

    lines = [
        f"🔮 *Parking Availability Prediction*",
        "",
        f"{avail_emoji} *{avail} availability* ({pressure}% demand)",
        "",
        summary,
        "",
    ]

    if best_window:
        lines += [f"⏰ Best time to find parking: *{best_window}*", ""]

    if avoid:
        lines += ["🚫 *Avoid these areas:*"]
        for area in avoid:
            lines.append(f"  • {area.title()}")
        lines.append("")

    if tips:
        lines += ["💡 *Tips:*"]
        for tip in tips:
            lines.append(f"  → {tip}")

    lines += ["", "Reply *find* to search for parking now"]

    return "\n".join(lines)


# ── Submit Flow ───────────────────────────────────────────────

SUBMIT_INTRO = """\
🏠 *List Your Parking Space*

I'll ask you a few quick questions to create your listing.
It'll take about 60 seconds.

You can also just *paste your WhatsApp message* directly
and I'll extract the details automatically.

Ready? Let's start.

What is the *name or description* of your space?
(e.g. "Compound behind GTB Rumuola" or "My garage Lekki Phase 1")\
"""

ASK_SUBMIT_CITY = """\
📍 *Which city?*

*1* — Lagos
*2* — Port Harcourt
*3* — Abuja\
"""

ASK_SUBMIT_ADDR = """\
🗺️ *Full address or landmark?*

Be specific — drivers will use this to find you.

Examples:
• "No 5 Rumuola Road, beside Access Bank"
• "After the Total filling station, Wuse 2"
• "Gate with green paint, opposite Shoprite Lekki"\
"""

ASK_SUBMIT_PRICE = """\
💰 *Price per hour?*

How much will you charge per hour? (in Naira)

Examples: *1000*, *1500*, *2k*, *2500*\
"""

ASK_SUBMIT_CAP = """\
🚗 *How many cars can park?*

Reply with a number, e.g. *1*, *3*, *10*\
"""

ASK_SUBMIT_HOURS = """\
🕐 *What hours are you available?*

Reply in this format:  *7am to 9pm*

Or type *anytime* if available 24/7\
"""

def format_submit_confirm(data: dict) -> str:
    """Show collected listing data for confirmation."""
    return f"""\
✅ *Confirm Your Listing*

Please review before I save it:

🏷️ Name:    {data.get('name', '—')}
📍 City:    {data.get('city', '—').replace('_', ' ').title()}
🗺️ Address: {data.get('address', '—')}
💵 Price:   ₦{int(data.get('price_per_hour', 0)):,}/hr
🚗 Spaces:  {data.get('capacity', 1)} car(s)
🕐 Hours:   {data.get('available_from', '?')} – {data.get('available_until', '?')}

Reply *yes* to submit for review
Reply *no* to cancel and start again\
"""

SUBMIT_SUCCESS = """\
🎉 *Listing Submitted!*

Your space has been received and will go live
after our team reviews it (usually within 24 hours).

Thank you for helping reduce parking chaos in Nigeria! 🇳🇬

Reply *menu* for main options\
"""

SUBMIT_FAILED = """\
😕 *Could not save your listing*

Something went wrong on our end.

Please try again or visit our website to submit directly.

Reply *menu* to start over\
"""


# ── Extract Flow ──────────────────────────────────────────────

EXTRACT_PROMPT = """\
📋 *Parse a Parking Message*

Paste the WhatsApp message or text below and I'll
extract the parking details automatically.

Example:
_"Park for 3 cars beside zenith bank wuse 2,
2k per hour, available weekdays till 9pm"_

Go ahead — paste your message:\
"""

def format_extraction(extracted: dict, confidence: str) -> str:
    """Format AI-extracted listing data."""
    conf_icon = {"high": "✅", "medium": "⚠️", "low": "❓"}.get(confidence, "❓")
    missing = extracted.get("missing_fields", [])

    price = extracted.get("price_per_hour")
    cap   = extracted.get("capacity")

    lines = [
        f"🤖 *Extracted Data* {conf_icon} ({confidence} confidence)",
        "",
        f"🏷️  Name:     {extracted.get('name') or 'Not found'}",
        f"📍  City:     {(extracted.get('city') or 'Unknown').replace('_', ' ').title()}",
        f"🗺️  Address:  {extracted.get('address') or 'Not found'}",
        f"💵  Price:    {'₦{:,}/hr'.format(int(price)) if price else 'Not found'}",
        f"🚗  Capacity: {f'{cap} car(s)' if cap else 'Not found'}",
        f"🕐  From:     {extracted.get('available_from') or '—'}",
        f"🕐  Until:    {extracted.get('available_until') or '—'}",
        f"🛡️  Security: {'Yes' if extracted.get('has_security') else 'No'}",
    ]

    if extracted.get("notes"):
        lines.append(f"📝  Notes:    {extracted['notes'][:80]}")

    if missing:
        lines += ["", f"⚠️ Missing: {', '.join(missing)}"]

    lines += [
        "",
        "Reply *save* to submit this listing for review",
        "Reply *parse* to try another message",
        "Reply *menu* for main menu",
    ]

    return "\n".join(lines)


# ── Misc ──────────────────────────────────────────────────────

PROCESSING = "⏳ Searching for parking options... one moment."
PREDICTING = "🔮 Checking availability patterns... one moment."
EXTRACTING = "🤖 Extracting listing data... one moment."
SAVING     = "💾 Saving your listing..."

ERROR_GENERIC = """\
😕 Something went wrong. Please try again.

Reply *menu* to start over.\
"""
