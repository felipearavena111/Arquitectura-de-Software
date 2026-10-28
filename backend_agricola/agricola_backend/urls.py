from django.contrib import admin
from django.urls import path
from nodo_edge import views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Ruta de autenticación (PostgreSQL)
    path('api/login/', views.login_api, name='login_api'),
    
    # Rutas de telemetría (InfluxDB)
    path('api/telemetria/', views.RecepcionTelemetriaView.as_view(), name='registrar_telemetria'),
    path('api/telemetria/nodo/<str:nodo_id>/', views.ConsultaTelemetriaView.as_view(), name='consultar_telemetria'),
]