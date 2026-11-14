FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencias del sistema necesarias para compilar psycopg2 si hiciera falta
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Aplica migraciones, carga usuarios de prueba e inicia Django accesible desde fuera
CMD ["sh", "-c", "python manage.py migrate && python manage.py loaddata usuarios_prueba.json && python manage.py runserver 0.0.0.0:8000"]