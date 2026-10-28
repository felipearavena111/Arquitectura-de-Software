import requests
from django.conf import settings
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

class TelemetryInfluxClient:
    def __init__(self):
        self.url = getattr(settings, 'INFLUXDB_URL', 'http://localhost:8181')
        self.token = getattr(settings, 'INFLUXDB_TOKEN', '')
        self.org = getattr(settings, 'INFLUXDB_ORG', 'mi_organizacion_agricola')
        self.bucket = getattr(settings, 'INFLUXDB_BUCKET', 'telemetria_sensores')
        
        # Cliente v2 (Solo para escritura rápida)
        self.client = InfluxDBClient(url=self.url, token=self.token, org=self.org)
        self.write_api = self.client.write_api(write_options=SYNCHRONOUS)

    def guardar_telemetria(self, nodo_id, tipo_sensor, valor, unidad=""):
        point = Point("telemetria_nodo") \
            .tag("nodo_id", str(nodo_id)) \
            .tag("tipo_sensor", str(tipo_sensor)) \
            .field("valor", float(valor)) \
            .tag("unidad", str(unidad))
        
        self.write_api.write(bucket=self.bucket, org=self.org, record=point)

    def obtener_telemetria_reciente(self, nodo_id=None, rango_tiempo="-24h"):
        query_url = f"{self.url}/api/v3/query_sql"
        
        headers = {
            "Content-Type": "application/json"
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        filtro_nodo = f"WHERE nodo_id = '{nodo_id}'" if nodo_id else ""
        sql_query = f"SELECT time, nodo_id, tipo_sensor, valor, unidad FROM telemetria_nodo {filtro_nodo} ORDER BY time DESC LIMIT 50"

        # ¡ÚLTIMA CORRECCIÓN AQUÍ! Se cambió "query" por "q"
        payload = {
            "db": self.bucket,
            "q": sql_query,
            "format": "json"
        }

        try:
            response = requests.post(query_url, json=payload, headers=headers)
            
            if response.status_code == 200:
                raw_data = response.json()
                lista_cruda = []
                
                if isinstance(raw_data, list):
                    lista_cruda = raw_data
                elif isinstance(raw_data, dict):
                    lista_cruda = raw_data.get("data", raw_data.get("results", []))

                datos_formateados = []
                for item in lista_cruda:
                    datos_formateados.append({
                        "tiempo": item.get("time"),
                        "nodo": item.get("nodo_id"),
                        "sensor": item.get("tipo_sensor"),
                        "valor": item.get("valor"),
                        "unidad": item.get("unidad", "")
                    })
                return datos_formateados
            else:
                print(f"Error HTTP InfluxDB ({response.status_code}): {response.text}")
                return []
        except Exception as e:
            print(f"Error de conexión con InfluxDB 3: {e}")
            return []

    def cerrar(self):
        if hasattr(self, 'client'):
            self.client.close()