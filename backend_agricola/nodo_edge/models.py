from django.db import models
from django.contrib.auth.models import User

# Tabla 1: Perfil para cumplir el requisito de "diversos tipos de usuarios"
class PerfilUsuario(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    es_jefe_terreno = models.BooleanField(default=False, help_text="Designa si el usuario tiene privilegios de jefatura.")

    def __str__(self):
        rol = "Jefe" if self.es_jefe_terreno else "Operario"
        return f"{self.usuario.username} - {rol}"

# Tabla 2: El flujo core del sistema (Registro de telemetría)
class RegistroTelemetria(models.Model):
    temperatura = models.DecimalField(max_digits=5, decimal_places=2)
    humedad = models.DecimalField(max_digits=5, decimal_places=2)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    operario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    alerta_helada = models.BooleanField(default=False)

    def __str__(self):
        return f"Temp: {self.temperatura}°C a las {self.fecha_registro.strftime('%H:%M')}"