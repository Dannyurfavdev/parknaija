from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.users.models import User


class ParkingSpace(models.Model):
    """
    Core model. Represents one parking space or lot.
    Uses simple lat/lng floats (no PostGIS required for V1).
    PostGIS upgrade path: swap to django.contrib.gis PointField.
    """

    class City(models.TextChoices):
        LAGOS = "lagos", "Lagos"
        PORT_HARCOURT = "port_harcourt", "Port Harcourt"
        ABUJA = "abuja", "Abuja"

    class AreaType(models.TextChoices):
        COMMERCIAL = "commercial", "Commercial"
        RESIDENTIAL = "residential", "Residential"
        MIXED = "mixed", "Mixed Use"
        MARKET = "market", "Market Area"
        RELIGIOUS = "religious", "Religious/Event Area"

    class Source(models.TextChoices):
        ADMIN = "admin", "Admin Added"
        USER = "user", "User Submitted"
        EXTRACTED = "extracted", "Extracted from Text"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        PENDING = "pending", "Pending Review"

    # Identity
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    city = models.CharField(max_length=20, choices=City.choices)
    area_type = models.CharField(max_length=20, choices=AreaType.choices, default=AreaType.MIXED)
    address = models.TextField()

    # Geolocation (lat/lng for V1 — upgrade to PostGIS for V2)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    # Capacity & Pricing
    capacity = models.PositiveIntegerField(default=1, help_text="Max number of cars")
    price_per_hour = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text="Price in Nigerian Naira (NGN)"
    )
    price_is_negotiable = models.BooleanField(default=False)

    # Availability Window
    available_from = models.TimeField(null=True, blank=True, help_text="e.g. 07:00")
    available_until = models.TimeField(null=True, blank=True, help_text="e.g. 21:00")
    available_days = models.JSONField(
        default=list,
        help_text='e.g. ["monday", "tuesday", "friday"]'
    )

    # Metadata
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.USER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    is_verified = models.BooleanField(default=False, help_text="Manually verified by admin")
    submitted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="submitted_spaces"
    )

    # Features / Tags
    has_security = models.BooleanField(default=False)
    is_covered = models.BooleanField(default=False)
    has_cctv = models.BooleanField(default=False)
    notes = models.TextField(blank=True, help_text="Special instructions, restrictions, landmarks")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "parking_spaces"
        ordering = ["-created_at"]
        verbose_name = "Parking Space"
        verbose_name_plural = "Parking Spaces"

    def __str__(self):
        return f"{self.name} — {self.city} (₦{self.price_per_hour}/hr)"

    @property
    def has_location(self):
        return self.latitude is not None and self.longitude is not None

    def distance_to(self, lat: float, lng: float) -> float | None:
        """
        Returns approximate distance in km using Haversine formula.
        No PostGIS needed for V1.
        """
        if not self.has_location:
            return None
        from math import radians, cos, sin, asin, sqrt
        R = 6371  # Earth radius in km
        lat1, lng1 = radians(self.latitude), radians(self.longitude)
        lat2, lng2 = radians(lat), radians(lng)
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
        return round(2 * R * asin(sqrt(a)), 2)
