from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken  

from .models import PerfilUsuario
from .influx_client import TelemetryInfluxClient


# 1. AUTENTICACIÓN CON JWT (PostgreSQL)
@api_view(['POST'])
@permission_classes([AllowAny])
def login_api(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    
    if user is not None:
        # Generación de tokens JWT para el usuario autenticado
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
            'access': str(refresh.access_token),  # Token de acceso (8 horas)
            'refresh': str(refresh)              # Token de refresco (1 día)
        }, status=status.HTTP_200_OK)
    else:
        return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)


# 2. VISTAS DE TELEMETRÍA (InfluxDB)
class RecepcionTelemetriaView(APIView):
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

        influx = TelemetryInfluxClient()
        try:
            registros_procesados = 0

            if temperatura is not None and temperatura != "":
                influx.guardar_telemetria(nodo_id, "temperatura", float(temperatura), "°C")
                registros_procesados += 1

            if humedad is not None and humedad != "":
                influx.guardar_telemetria(nodo_id, "humedad", float(humedad), "%")
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
                
                influx.guardar_telemetria(nodo_id, tipo_sensor, float(valor), unidad)

            return Response({"status": "Telemetría guardada en InfluxDB"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            influx.cerrar()


class ConsultaTelemetriaView(APIView):
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
            
            
            
            
            