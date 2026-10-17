from rest_framework import serializers
from .models import RegistroTelemetria

class RegistroTelemetriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroTelemetria
        fields = '__all__'