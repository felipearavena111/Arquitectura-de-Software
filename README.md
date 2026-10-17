# Proyecto IoT Agrícola - Nodo Edge (Evaluación 2)
Sistema de mitigación de heladas con topología Edge-First. Este repositorio contiene el flujo vertical completo que incluye autenticación de operarios y registro de telemetría local.

---

## Prerrequisitos
Antes de iniciar, asegúrate de tener instalado en tu sistema:
- Python 3.10+
- Node.js y npm
- PostgreSQL

---

## Instrucciones de Ejecución Local

### Paso 1: Base de Datos
Crea una base de datos local en PostgreSQL utilizando pgAdmin o la terminal:
- **Nombre de la BD:** db_iot_agricola
- **Puerto:** 5432
- **Usuario:** postgres
- **Contraseña:** admin

### Paso 2: Backend (Django / Python)
Abre una terminal, ubícate en la raíz del proyecto y ejecuta los siguientes comandos para levantar la API:

1. Entra a la carpeta del backend:
    cd backend_agricola

2. Crea el entorno virtual:
    python -m venv venv

3. Activa el entorno virtual:
    .\venv\Scripts\activate

4. Instala las dependencias necesarias:
    pip install -r requirements.txt

5. Aplica las migraciones para crear las tablas en PostgreSQL:
    python manage.py migrate

6. Levanta el servidor:
    python manage.py runserver

### Paso 3: Frontend (React / Vite)
Abre una nueva pestaña en tu terminal (dejando el backend corriendo en la anterior) y ejecuta:

1. Entra a la carpeta del frontend:
    cd frontend_agricola

2. Instala las dependencias de Node:
    npm install

3. Levanta la interfaz gráfica:
    npm run dev

---

## Cómo Probar el Software
Una vez que ambos servidores estén corriendo:

1. Ve a tu navegador y abre el Frontend: http://localhost:5173/

2. Inicia sesión con las credenciales de prueba:
   - **Usuario:** admin
   - **Contraseña:** admin

3. Ingresa datos de temperatura y humedad en el panel de control y guárdalos. Nota: Si la temperatura es menor o igual a 0, se activará automáticamente la lógica de alerta por helada.

4. Para verificar que los datos cruzaron la API y se guardaron físicamente en la base de datos, revisa el panel de administrador del Backend en: http://127.0.0.1:8000/admin/nodo_edge/registrotelemetria/