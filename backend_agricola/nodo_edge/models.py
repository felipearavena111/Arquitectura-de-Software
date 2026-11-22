from django.db import models
from django.contrib.auth.models import User

class PerfilUsuario(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    es_jefe = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username

class RegistroTelemetria(models.Model):
    temperatura = models.FloatField()
    humedad = models.FloatField()
    alerta_helada = models.BooleanField(default=False)
    fecha = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if float(self.temperatura) <= 0:
            self.alerta_helada = True
        else:
            self.alerta_helada = False
        super().save(*args, **kwargs)

class ControlRiego(models.Model):
    encendido = models.BooleanField(default=False)
    modo = models.CharField(max_length=20, default="MANUAL")  # "AUTOMATICO" o "MANUAL"
    motivo = models.CharField(max_length=150, default="Sistema en espera")
    ultima_temperatura = models.FloatField(null=True, blank=True)
    actualizado_por = models.CharField(max_length=50, default="Sistema")
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Riego {'ENCENDIDO' if self.encendido else 'APAGADO'} ({self.modo})"