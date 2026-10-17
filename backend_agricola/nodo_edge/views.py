from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import RegistroTelemetria
from .serializers import RegistroTelemetriaSerializer
from django.contrib.auth import authenticate

@api_view(['GET', 'POST'])
def telemetria_api(request):
    if request.method == 'GET':
        registros = RegistroTelemetria.objects.all().order_by('-fecha_registro')
        serializer = RegistroTelemetriaSerializer(registros, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Aquí programamos una regla de negocio: si la temperatura es menor a 0, activa alerta
        datos = request.data.copy()
        if float(datos.get('temperatura', 0)) <= 0:
            datos['alerta_helada'] = True
            
        serializer = RegistroTelemetriaSerializer(data=datos)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

@api_view(['POST'])
def login_api(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    # Lógica de negocio: Validar credenciales
    user = authenticate(username=username, password=password)
    
    if user is not None:
        # Verificar el rol del usuario (diversos tipos de usuario)
        es_jefe = False
        if hasattr(user, 'perfilusuario'):
            es_jefe = user.perfilusuario.es_jefe_terreno
            
        return Response({
            'mensaje': 'Acceso concedido', 
            'username': user.username,
            'es_jefe': es_jefe
        }, status=200)
    else:
        # Manejo de errores exigido en rúbrica
        return Response({'error': 'Credenciales inválidas'}, status=400)