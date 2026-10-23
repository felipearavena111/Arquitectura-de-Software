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