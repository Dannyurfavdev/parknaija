"""
Park Naija AI — Parking Score Algorithm
-----------------------------------------
Score: 0–100 composite based on:
  - Distance (40 pts max)    — closer is better
  - Price fairness (30 pts)  — within budget and market rate
  - Availability (20 pts)    — based on area pressure + capacity
  - Trust/Features (10 pts)  — verified, security, CCTV, covered
"""

from apps.listings.models import ParkingSpace


# Average market rates per city (NGN/hr) — update as data grows
MARKET_RATES = {
    "lagos": 1500,
    "port_harcourt": 1000,
    "abuja": 1200,
}


def score_parking_space(
    space: ParkingSpace,
    distance_km: float | None,
    budget_per_hour: float | None,
    duration_hours: float,
    area_pressure: float,
) -> dict:
    """
    Returns a score dict with total_score (0–100), breakdown, and a human-readable reason.
    """

    # --- Distance Score (40 pts) ---
    if distance_km is None:
        distance_score = 20  # No location data — neutral
        distance_note = "Distance unknown"
    elif distance_km <= 0.2:
        distance_score = 40
        distance_note = f"{distance_km} km — right next to destination"
    elif distance_km <= 0.5:
        distance_score = 33
        distance_note = f"{distance_km} km — short walk"
    elif distance_km <= 1.0:
        distance_score = 24
        distance_note = f"{distance_km} km — manageable"
    elif distance_km <= 2.0:
        distance_score = 14
        distance_note = f"{distance_km} km — far, consider ride-share"
    else:
        distance_score = 5
        distance_note = f"{distance_km} km — very far"

    # --- Price Score (30 pts) ---
    price = float(space.price_per_hour)
    market_rate = MARKET_RATES.get(space.city, 1200)

    if budget_per_hour:
        budget = float(budget_per_hour)
        if price <= budget * 0.7:
            price_score = 30
            price_note = f"₦{price}/hr — well within budget"
        elif price <= budget:
            price_score = 22
            price_note = f"₦{price}/hr — within budget"
        elif price <= budget * 1.2:
            price_score = 12
            price_note = f"₦{price}/hr — slightly over budget"
        else:
            price_score = 3
            price_note = f"₦{price}/hr — over budget"
    else:
        # No budget given — score against market rate
        if price <= market_rate * 0.75:
            price_score = 30
            price_note = f"₦{price}/hr — below market rate"
        elif price <= market_rate:
            price_score = 22
            price_note = f"₦{price}/hr — fair market rate"
        elif price <= market_rate * 1.5:
            price_score = 12
            price_note = f"₦{price}/hr — above average"
        else:
            price_score = 5
            price_note = f"₦{price}/hr — premium pricing"

    if space.price_is_negotiable:
        price_score = min(price_score + 3, 30)
        price_note += " (negotiable)"

    # --- Availability Score (20 pts) ---
    # Lower pressure = higher availability score
    availability_score = int((1 - area_pressure) * 20)
    availability_label = (
        "Low" if area_pressure >= 0.80
        else "Medium" if area_pressure >= 0.50
        else "High"
    )
    availability_note = f"Area demand is {availability_label.lower()}"

    # Capacity bonus — larger lots are more likely to have space
    if space.capacity >= 10:
        availability_score = min(availability_score + 3, 20)
    elif space.capacity >= 5:
        availability_score = min(availability_score + 1, 20)

    # --- Trust & Features Score (10 pts) ---
    trust_score = 0
    trust_notes = []

    if space.is_verified:
        trust_score += 4
        trust_notes.append("verified")
    if space.has_security:
        trust_score += 2
        trust_notes.append("security")
    if space.has_cctv:
        trust_score += 2
        trust_notes.append("CCTV")
    if space.is_covered:
        trust_score += 2
        trust_notes.append("covered")

    trust_note = ", ".join(trust_notes) if trust_notes else "no special features"

    # --- Total ---
    total = distance_score + price_score + availability_score + trust_score

    # --- Human-readable reason ---
    reasons = []
    if distance_score >= 33:
        reasons.append("very close to your destination")
    if price_score >= 22:
        reasons.append("competitively priced")
    if availability_score >= 12:
        reasons.append("good availability at this time")
    if space.is_verified:
        reasons.append("admin-verified space")
    if space.has_security:
        reasons.append("has on-site security")

    if reasons:
        reason = "Recommended because it is " + ", and ".join(reasons) + "."
    else:
        reason = "Best available option given current filters."

    return {
        "total_score": total,
        "availability_label": availability_label,
        "reason": reason,
        "breakdown": {
            "distance": {"score": distance_score, "max": 40, "note": distance_note},
            "price": {"score": price_score, "max": 30, "note": price_note},
            "availability": {"score": availability_score, "max": 20, "note": availability_note},
            "trust_features": {"score": trust_score, "max": 10, "note": trust_note},
        },
    }
