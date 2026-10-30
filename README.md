# Proyecto IoT Agrícola - Nodo Edge (Evaluación 2)
Plataforma de mitigación de heladas con arquitectura en capas, autenticación JWT, control de acceso por roles (Operario y Agrónomo) y persistencia híbrida.

---

## Prerrequisitos
- Python 3.10+
- Node.js y npm
- PostgreSQL
- InfluxDB 3.x

---

## Instrucciones de Ejecución Local

### Paso 1: InfluxDB 3.x
Descargar influxdb 3 core desde: https://docs.influxdata.com/influxdb3/core/install/

Bajar hasta donde diga "Download and install the latest build artifacts"

Instalar "Windows (AMD64, x86_64) binary" 

Extraer y abrir la carpeta influxdb3-core-3.12.0-windows_amd64

Abre una terminal desde esa carpeta, donde tengas el ejecutable de InfluxDB 3 y ejecuta:

.\influxdb3 serve --node-id PC-node --without-auth

### Paso 2: Base de Datos Relacional (PostgreSQL)
Crea una base de datos local en PostgreSQL:
- **Nombre de la BD:** db_iot_agricola
- **Puerto:** 5432
- **Usuario:** postgres
- **Contraseña:** admin

### Paso 3: Backend (Django REST Framework)
En la raíz del proyecto, ejecuta los siguientes comandos:

1. Entra a la carpeta del backend:
    cd backend_agricola

2. Crea el entorno virtual:
    python -m venv venv

3. Activa el entorno virtual:
    .\venv\Scripts\activate

4. Instala las dependencias necesarias (incluye simplejwt y cliente de InfluxDB):
    pip install -r requirements.txt

5. Aplica las migraciones para crear las tablas en PostgreSQL:
    python manage.py migrate

6. Carga los usuarios y roles de prueba en la base de datos:
    python manage.py loaddata usuarios_prueba.json
    
7. Levanta el servidor:
    python manage.py runserver

### Paso 4: Frontend (React / Vite)
Abre una nueva pestaña en tu terminal (dejando el backend e InfluxDB corriendo) y ejecuta:

1. Entra a la carpeta del frontend:
    cd frontend_agricola

2. Instala las dependencias de Node:
    npm install

3. Levanta la interfaz gráfica:
    npm run dev

---

## Una vez que los tres servicios estén corriendo:

1. Ve a tu navegador y abre el Frontend: http://localhost:5173/

2. Inicia sesión con las credenciales de prueba:
   - *ROL OPERARIO*
   - Usuario: admin
   - Contraseña: admin
  
   - *ROL AGRONOMO*
   - Usuario: agronomo
   - Contraseña: agronomo
