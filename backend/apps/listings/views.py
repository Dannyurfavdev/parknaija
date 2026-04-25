from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import ParkingSpace
from .serializers import ParkingSpaceSerializer, ParkingSpaceCreateSerializer, AdminUpdateSerializer


class ParkingSpaceViewSet(viewsets.ModelViewSet):
    """
    CRUD for parking spaces.

    GET  /api/listings/              — List all active & verified spaces
    POST /api/listings/              — Submit a new space (authenticated)
    GET  /api/listings/{id}/         — Space detail
    PATCH/PUT /api/listings/{id}/    — Update (owner or admin)
    DELETE /api/listings/{id}/       — Delete (owner or admin)

    Query Params:
        ?city=lagos
        ?area_type=commercial
        ?lat=6.5244&lng=3.3792       — Injects distance into results
        ?search=ikeja                — Full text search on name/address
        ?ordering=price_per_hour     — Sort results
    """
    queryset = ParkingSpace.objects.filter(
        status=ParkingSpace.Status.ACTIVE
    ).select_related("submitted_by")

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["city", "area_type", "status", "is_verified", "has_security"]
    search_fields = ["name", "address", "description", "notes"]
    ordering_fields = ["price_per_hour", "capacity", "created_at"]

    def get_serializer_class(self):
        # Admin PATCH requests (approve/reject/activate) use a dedicated serializer
        # that allows status and is_verified to be changed
        if self.action in ["update", "partial_update"]:
            if self.request.user.is_authenticated and self.request.user.is_staff:
                return AdminUpdateSerializer
            return ParkingSpaceCreateSerializer
        if self.action == "create":
            return ParkingSpaceCreateSerializer
        return ParkingSpaceSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        # Admins can see all statuses
        if self.request.user.is_authenticated and self.request.user.is_staff:
            return ParkingSpace.objects.all().select_related("submitted_by")
        return qs