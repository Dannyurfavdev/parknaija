"""
POST /api/recommendations/
Returns top 3 parking spaces for a given destination, time, and budget.
Combines DB query + Haversine distance + Parking Score algorithm.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from datetime import datetime
from apps.listings.models import ParkingSpace
from apps.predictions.logic import _pressure_score
from .scoring import score_parking_space


class RecommendationView(APIView):
    """
    POST /api/recommendations/
    Body:
    {
        "city": "port_harcourt",
        "lat": 4.8156,
        "lng": 7.0498,
        "datetime": "2024-03-15T08:30:00",
        "duration_hours": 3,
        "budget_per_hour": 2000,        // optional
        "area_type": "commercial"       // optional hint
    }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        city = request.data.get("city", "").strip().lower()
        lat = request.data.get("lat")
        lng = request.data.get("lng")
        datetime_str = request.data.get("datetime", "")
        duration_hours = float(request.data.get("duration_hours", 1))
        budget_per_hour = request.data.get("budget_per_hour")
        area_type = request.data.get("area_type", "mixed")

        if not city:
            return Response(
                {"error": "city is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse datetime
        try:
            target_dt = datetime.fromisoformat(datetime_str) if datetime_str else datetime.now()
        except ValueError:
            return Response(
                {"error": "Invalid datetime format. Use ISO 8601."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch active, verified spaces in city
        qs = ParkingSpace.objects.filter(
            city=city,
            status=ParkingSpace.Status.ACTIVE,
        ).select_related("submitted_by")

        # Budget filter (give 20% headroom)
        if budget_per_hour:
            qs = qs.filter(price_per_hour__lte=float(budget_per_hour) * 1.2)

        spaces = list(qs)

        if not spaces:
            return Response({
                "message": "No active parking spaces found for this city and filters.",
                "recommendations": [],
                "tip": "Try relaxing the budget or check back later — new spaces are added daily."
            }, status=status.HTTP_200_OK)

        # Score every space
        hour = target_dt.hour
        day_name = target_dt.strftime("%A").lower()
        area_pressure = _pressure_score(city, area_type, hour, day_name)

        scored = []
        for space in spaces:
            distance_km = space.distance_to(lat, lng) if (lat and lng) else None
            score_data = score_parking_space(
                space=space,
                distance_km=distance_km,
                budget_per_hour=float(budget_per_hour) if budget_per_hour else None,
                duration_hours=duration_hours,
                area_pressure=area_pressure,
            )
            scored.append((space, distance_km, score_data))

        # Sort by score descending, take top 3
        scored.sort(key=lambda x: x[2]["total_score"], reverse=True)
        top3 = scored[:3]

        recommendations = []
        for space, distance_km, score_data in top3:
            total_cost = float(space.price_per_hour) * duration_hours
            recommendations.append({
                "id": space.id,
                "name": space.name,
                "address": space.address,
                "city": space.city,
                "area_type": space.area_type,
                "price_per_hour": float(space.price_per_hour),
                "price_is_negotiable": space.price_is_negotiable,
                "estimated_total_cost": round(total_cost, 2),
                "capacity": space.capacity,
                "distance_km": distance_km,
                "availability": score_data["availability_label"],
                "parking_score": score_data["total_score"],
                "score_breakdown": score_data["breakdown"],
                "why_recommended": score_data["reason"],
                "features": {
                    "has_security": space.has_security,
                    "is_covered": space.is_covered,
                    "has_cctv": space.has_cctv,
                    "is_verified": space.is_verified,
                },
                "available_from": str(space.available_from) if space.available_from else None,
                "available_until": str(space.available_until) if space.available_until else None,
                "notes": space.notes,
            })

        # Overall situation summary
        availability_label = (
            "Low" if area_pressure >= 0.80
            else "Medium" if area_pressure >= 0.50
            else "High"
        )

        return Response({
            "query": {
                "city": city,
                "datetime": target_dt.isoformat(),
                "duration_hours": duration_hours,
                "budget_per_hour": budget_per_hour,
            },
            "situation": {
                "overall_availability": availability_label,
                "pressure_score": int(area_pressure * 100),
                "spaces_evaluated": len(spaces),
            },
            "recommendations": recommendations,
        }, status=status.HTTP_200_OK)
