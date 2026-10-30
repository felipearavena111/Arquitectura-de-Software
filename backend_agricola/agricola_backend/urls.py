from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from nodo_edge import views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Autenticación JWT (PostgreSQL)
    path('api/login/', views.login_api, name='login_api'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Rutas de telemetría (InfluxDB) - protegidas con JWT
    path('api/telemetria/', views.RecepcionTelemetriaView.as_view(), name='registrar_telemetria'),
    path('api/telemetria/nodo/<str:nodo_id>/', views.ConsultaTelemetriaView.as_view(), name='consultar_telemetria'),
]
