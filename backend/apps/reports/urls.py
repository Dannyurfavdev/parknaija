from django.urls import path
from .views import SubmitReportView, SpaceReportsView

urlpatterns = [
    path("", SubmitReportView.as_view(), name="submit-report"),
    path("list/", SpaceReportsView.as_view(), name="list-reports"),
]
