from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView as SpectacularSwaggerUIView

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),

    # Auth
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # App APIs
    path("api/users/", include("apps.users.urls")),
    path("api/listings/", include("apps.listings.urls")),
    path("api/recommendations/", include("apps.recommendations.urls")),
    path("api/predictions/", include("apps.predictions.urls")),
    path("api/extract/", include("apps.extraction.urls")),
    path("api/reports/", include("apps.reports.urls")),
    path("api/whatsapp/", include("apps.whatsapp.urls")),

    # API Docs (development only)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerUIView.as_view(url_name="schema"), name="swagger-ui"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
