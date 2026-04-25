from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ParkingSpaceViewSet

router = DefaultRouter()
router.register(r"", ParkingSpaceViewSet, basename="parking-space")

urlpatterns = [path("", include(router.urls))]
