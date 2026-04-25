from rest_framework import serializers, generics, permissions
from django.db.models import Count
from .models import AvailabilityReport
from apps.listings.models import ParkingSpace


class ReportSerializer(serializers.ModelSerializer):
    reported_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AvailabilityReport
        fields = ["id", "space", "status", "comment", "reported_by_name", "reported_at"]
        read_only_fields = ["id", "reported_by_name", "reported_at"]

    def get_reported_by_name(self, obj):
        return obj.reported_by.full_name if obj.reported_by else "Anonymous"

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["reported_by"] = request.user
        return super().create(validated_data)


class SubmitReportView(generics.CreateAPIView):
    """
    POST /api/reports/
    { "space": 5, "status": "full", "comment": "No space as at 8:45am" }
    """
    queryset = AvailabilityReport.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class SpaceReportsView(generics.ListAPIView):
    """
    GET /api/reports/?space=5   — Last 10 reports for a space
    """
    serializer_class = ReportSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        space_id = self.request.query_params.get("space")
        qs = AvailabilityReport.objects.select_related("reported_by", "space")
        if space_id:
            qs = qs.filter(space_id=space_id)
        return qs[:10]
