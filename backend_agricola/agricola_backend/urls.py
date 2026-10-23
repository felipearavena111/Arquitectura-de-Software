from django.contrib import admin
from django.urls import path
from nodo_edge import views

urlpatterns = [
    path('admin/', admin.site.urls),
    # Ruta de autenticación restaurada
    path('api/login/', views.login_api, name='login_api'),
    # Rutas de telemetría
    path('api/telemetria/', views.telemetria_list, name='telemetria_list'),
    path('api/telemetria/<int:pk>/', views.telemetria_detail, name='telemetria_detail'),
]