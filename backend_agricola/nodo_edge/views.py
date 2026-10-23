from django.contrib.auth import authenticate
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import RegistroTelemetria, PerfilUsuario
from .serializers import RegistroTelemetriaSerializer

# 1. FUNCIÓN DE LOGIN RECUPERADA
@api_view(['POST'])
def login_api(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    
    if user is not None:
        es_jefe = False
        try:
            perfil = PerfilUsuario.objects.get(user=user)
            es_jefe = perfil.es_jefe
        except PerfilUsuario.DoesNotExist:
            pass
            
        return Response({
            'username': user.username,
            'es_jefe': es_jefe
        })
    else:
        return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)

# 2. FUNCIONES DE TELEMETRÍA
@api_view(['GET', 'POST'])
def telemetria_list(request):
    if request.method == 'GET':
        datos = RegistroTelemetria.objects.all().order_by('-fecha')
        serializer = RegistroTelemetriaSerializer(datos, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = RegistroTelemetriaSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT'])
def telemetria_detail(request, pk):
    try:
        dato = RegistroTelemetria.objects.get(pk=pk)
    except RegistroTelemetria.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PUT':
        serializer = RegistroTelemetriaSerializer(dato, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)