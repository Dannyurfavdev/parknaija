from rest_framework import serializers
from .models import ParkingSpace


class ParkingSpaceSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = ParkingSpace
        fields = [
            "id", "name", "description", "city", "area_type", "address",
            "latitude", "longitude", "capacity", "price_per_hour",
            "price_is_negotiable", "available_from", "available_until",
            "available_days", "source", "status", "is_verified",
            "has_security", "is_covered", "has_cctv", "notes",
            "submitted_by_name", "distance_km", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "source", "created_at", "updated_at"]

    def get_submitted_by_name(self, obj):
        return obj.submitted_by.full_name if obj.submitted_by else "Admin"

    def get_distance_km(self, obj):
        """
        Inject distance from request lat/lng query params if provided.
        Used by recommendation engine.
        """
        request = self.context.get("request")
        if request:
            try:
                lat = float(request.query_params.get("lat", ""))
                lng = float(request.query_params.get("lng", ""))
                return obj.distance_to(lat, lng)
            except (ValueError, TypeError):
                pass
        return None


class ParkingSpaceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingSpace
        fields = [
            "name", "description", "city", "area_type", "address",
            "latitude", "longitude", "capacity", "price_per_hour",
            "price_is_negotiable", "available_from", "available_until",
            "available_days", "has_security", "is_covered", "has_cctv", "notes",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["submitted_by"] = request.user if request else None
        validated_data["source"] = ParkingSpace.Source.USER
        validated_data["status"] = ParkingSpace.Status.PENDING
        return super().create(validated_data)


class AdminUpdateSerializer(serializers.ModelSerializer):
    """
    Used exclusively for admin PATCH requests (approve / reject / activate).
    Allows status and is_verified to be updated — fields the create serializer blocks.
    """
    class Meta:
        model = ParkingSpace
        fields = ["status", "is_verified", "notes"]