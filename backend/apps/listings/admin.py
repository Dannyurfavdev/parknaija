from django.contrib import admin
from .models import ParkingSpace


@admin.register(ParkingSpace)
class ParkingSpaceAdmin(admin.ModelAdmin):
    list_display = [
        "name", "city", "area_type", "price_per_hour",
        "capacity", "status", "is_verified", "source", "created_at"
    ]
    list_filter = ["city", "area_type", "status", "is_verified", "source"]
    search_fields = ["name", "address", "description"]
    list_editable = ["status", "is_verified"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("Basic Info", {"fields": ("name", "description", "city", "area_type", "address")}),
        ("Location", {"fields": ("latitude", "longitude")}),
        ("Pricing & Capacity", {"fields": ("price_per_hour", "price_is_negotiable", "capacity")}),
        ("Availability", {"fields": ("available_from", "available_until", "available_days")}),
        ("Features", {"fields": ("has_security", "is_covered", "has_cctv", "notes")}),
        ("Status", {"fields": ("status", "is_verified", "source", "submitted_by")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
