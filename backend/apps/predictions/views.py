"""
POST /api/predictions/
Predicts parking availability. Results cached in Redis (30-min TTL).
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from datetime import datetime
from .logic import predict_availability


class PredictionView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        city         = request.data.get("city", "").strip().lower()
        area_type    = request.data.get("area_type", "mixed").strip().lower()
        datetime_str = request.data.get("datetime", "")
        destination  = request.data.get("destination", "")

        if not city:
            return Response(
                {"error": "city is required (lagos | port_harcourt | abuja)"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            target_dt = datetime.fromisoformat(datetime_str) if datetime_str else datetime.now()
        except ValueError:
            return Response(
                {"error": "Invalid datetime. Use ISO 8601: 2024-03-15T08:30:00"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Try Redis cache first (30-min TTL, keyed per 2-hour block + day)
        try:
            from apps.core.cache import get_cached_prediction
            result = get_cached_prediction(
                city=city,
                area_type=area_type,
                hour=target_dt.hour,
                day_name=target_dt.strftime("%A").lower(),
            )
        except Exception:
            # Redis unavailable — compute directly, never crash
            result = predict_availability(
                city=city, area_type=area_type,
                target_dt=target_dt, destination=destination,
            )

        return Response(result, status=status.HTTP_200_OK)
