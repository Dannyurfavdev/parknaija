from django.db import models
from apps.users.models import User
from apps.listings.models import ParkingSpace


class AvailabilityReport(models.Model):
    """
    Community-driven real-time status updates.
    Drivers report whether a space is available, full, or gone.
    Like Waze — but for parking.
    """

    class ReportStatus(models.TextChoices):
        AVAILABLE = "available", "Available ✅"
        FULL = "full", "Full 🔴"
        GONE = "gone", "Space No Longer Exists ❌"
        UNSAFE = "unsafe", "Feels Unsafe ⚠️"

    space = models.ForeignKey(
        ParkingSpace, on_delete=models.CASCADE, related_name="reports"
    )
    reported_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reports"
    )
    status = models.CharField(max_length=20, choices=ReportStatus.choices)
    comment = models.TextField(blank=True, max_length=300)
    reported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "availability_reports"
        ordering = ["-reported_at"]

    def __str__(self):
        return f"{self.space.name} — {self.status} @ {self.reported_at:%Y-%m-%d %H:%M}"
