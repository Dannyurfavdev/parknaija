from django.urls import path
from .views import ExtractionView

urlpatterns = [
    path("", ExtractionView.as_view(), name="extract-listing"),
]
