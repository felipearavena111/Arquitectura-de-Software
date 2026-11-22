from datetime import datetime, timezone
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PerfilUsuario, ControlRiego
from .permissions import EsOperario, EsAgronomo
from .influx_client import TelemetryInfluxClient


# 1. AUTENTICACIÓN CON JWT (PostgreSQL)
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login_api(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)

    if user is not None:
        refresh = RefreshToken.for_user(user)

        es_jefe = False
        try:
            perfil = PerfilUsuario.objects.get(user=user)
            es_jefe = perfil.es_jefe
        except PerfilUsuario.DoesNotExist:
            pass

        return Response({
            'username': user.username,
            'es_jefe': es_jefe,
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }, status=status.HTTP_200_OK)
    else:
        return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)


# 2. VISTAS DE TELEMETRÍA (InfluxDB)
class RecepcionTelemetriaView(APIView):
    def get_permissions(self):
        if self.request.method in ('POST', 'PUT'):
            return [IsAuthenticated(), EsOperario()]
        return [IsAuthenticated()]

    def get(self, request):
        rango = request.query_params.get("rango", "-24h")
        nodo_id = request.query_params.get("nodo_id", "nodo_01")
        influx = TelemetryInfluxClient()
        try:
            datos = influx.obtener_telemetria_reciente(nodo_id, rango_tiempo=rango)
            return Response({"telemetria": datos})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            influx.cerrar()

    def post(self, request):
        nodo_id = request.data.get("nodo_id") or request.data.get("nodo") or "nodo_01"
        temperatura = request.data.get("temperatura")
        humedad = request.data.get("humedad")
        ahora = datetime.now(timezone.utc)

        influx = TelemetryInfluxClient()
        try:
            registros_procesados = 0

            if temperatura is not None and temperatura != "":
                temp_val = float(temperatura)
                influx.guardar_telemetria(nodo_id, "temperatura", temp_val, "°C", timestamp=ahora)
                registros_procesados += 1

                riego, _ = ControlRiego.objects.get_or_create(pk=1)
                riego.ultima_temperatura = temp_val
                if temp_val < 0:
                    riego.encendido = True
                    riego.modo = "AUTOMATICO"
                    riego.motivo = f"Alerta de helada detectada ({temp_val}°C)"
                    riego.actualizado_por = "Sensor Automático"
                riego.save()

            if humedad is not None and humedad != "":
                influx.guardar_telemetria(nodo_id, "humedad", float(humedad), "%", timestamp=ahora)
                registros_procesados += 1

            if registros_procesados == 0:
                tipo_sensor = request.data.get("tipo_sensor", "sensor_general")
                valor = request.data.get("valor")
                unidad = request.data.get("unidad", "")

                if valor is None:
                    return Response(
                        {"error": "Faltan parámetros requeridos: envía (temperatura/humedad) o (valor)."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                influx.guardar_telemetria(nodo_id, tipo_sensor, float(valor), unidad, timestamp=ahora)

            return Response({"status": "Telemetría guardada en InfluxDB"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            influx.cerrar()

    def put(self, request):
        nodo_id = request.data.get("nodo") or "nodo_01"
        tiempo_temp = request.data.get("tiempo_temp") or request.data.get("tiempo")
        tiempo_hum = request.data.get("tiempo_hum") or request.data.get("tiempo")
        temperatura = request.data.get("temperatura")
        humedad = request.data.get("humedad")

        if not tiempo_temp and not tiempo_hum:
            return Response({"error": "Falta el timestamp del registro a editar."}, status=status.HTTP_400_BAD_REQUEST)

        influx = TelemetryInfluxClient()
        try:
            if temperatura is not None and temperatura != "" and tiempo_temp:
                temp_val = float(temperatura)
                influx.editar_telemetria(nodo_id, tiempo_temp, "temperatura", temp_val, "°C")

                riego, _ = ControlRiego.objects.get_or_create(pk=1)
                riego.ultima_temperatura = temp_val
                if temp_val < 0:
                    riego.encendido = True
                    riego.modo = "AUTOMATICO"
                    riego.motivo = f"Alerta de helada detectada por corrección ({temp_val}°C)"
                    riego.actualizado_por = f"{request.user.username} (Edición)"
                riego.save()

            if humedad is not None and humedad != "" and tiempo_hum:
                influx.editar_telemetria(nodo_id, tiempo_hum, "humedad", float(humedad), "%")

            return Response({"status": "Registro actualizado en InfluxDB"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            influx.cerrar()


class ConsultaTelemetriaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, nodo_id):
        rango = request.query_params.get("rango", "-24h")
        influx = TelemetryInfluxClient()
        try:
            datos = influx.obtener_telemetria_reciente(nodo_id, rango_tiempo=rango)
            return Response({"nodo_id": nodo_id, "telemetria": datos})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            influx.cerrar()


# 3. CONTROL DE RIEGO ANTI-HELADA (PostgreSQL)
class ControlRiegoView(APIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), EsAgronomo()]
        return [IsAuthenticated()]

    def get(self, request):
        riego, _ = ControlRiego.objects.get_or_create(pk=1)
        return Response({
            "encendido": riego.encendido,
            "modo": riego.modo,
            "motivo": riego.motivo,
            "ultima_temperatura": riego.ultima_temperatura,
            "actualizado_por": riego.actualizado_por,
            "actualizado_en": riego.actualizado_en,
        })

    def post(self, request):
        riego, _ = ControlRiego.objects.get_or_create(pk=1)
        encendido = bool(request.data.get("encendido", False))
        riego.encendido = encendido
        riego.modo = "MANUAL"
        riego.motivo = (
            "Activado manualmente por Jefe de Terreno"
            if encendido
            else "Apagado manualmente por Jefe de Terreno"
        )
        riego.actualizado_por = request.user.username
        riego.save()

        return Response({
            "encendido": riego.encendido,
            "modo": riego.modo,
            "motivo": riego.motivo,
            "ultima_temperatura": riego.ultima_temperatura,
            "actualizado_por": riego.actualizado_por,
            "actualizado_en": riego.actualizado_en,
        }, status=status.HTTP_200_OK)