from django.urls import path
from .views import whatsapp_webhook, whatsapp_status

urlpatterns = [
    path("webhook/", whatsapp_webhook, name="whatsapp-webhook"),
    path("status/",  whatsapp_status,  name="whatsapp-status"),
]
