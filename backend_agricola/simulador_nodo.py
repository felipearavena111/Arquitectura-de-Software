import time
import random
import requests

API_URL = "http://localhost:8000/api"
USERNAME = "admin"
PASSWORD = "admin"  # ajusta si cambiaste la clave de admin
NODO_ID = "nodo_01"

def obtener_token():
    resp = requests.post(f"{API_URL}/login/", json={"username": USERNAME, "password": PASSWORD})
    resp.raise_for_status()
    return resp.json()["access"]

def main():
    token = obtener_token()
    headers = {"Authorization": f"Bearer {token}"}

    temperatura = 4.0
    humedad = 65.0

    print(f"Iniciando simulador Random Walk en {NODO_ID} (Ctrl+C para detener)...")
    while True:
        temperatura = round(min(30.0, max(-10.0, temperatura + random.uniform(-1.5, 1.5))), 1)
        humedad = round(min(100.0, max(0.0, humedad + random.uniform(-3.0, 3.0))), 1)

        payload = {"nodo_id": NODO_ID, "temperatura": temperatura, "humedad": humedad}
        resp = requests.post(f"{API_URL}/telemetria/", json=payload, headers=headers)

        if resp.status_code == 401:
            token = obtener_token()
            headers = {"Authorization": f"Bearer {token}"}
            resp = requests.post(f"{API_URL}/telemetria/", json=payload, headers=headers)

        alerta = " [ALERTA HELADA - RIEGO ACTIVADO]" if temperatura < 0 else ""
        print(f"Enviado -> Temp: {temperatura}°C | Humedad: {humedad}% | Status: {resp.status_code}{alerta}")
        time.sleep(60)

if __name__ == "__main__":
    main()