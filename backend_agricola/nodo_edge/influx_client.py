# backend_agricola/nodo_edge/influx_client.py
from django.conf import settings
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class TelemetryInfluxClient:
    def __init__(self):
        self.client = InfluxDBClient(
            url=settings.INFLUXDB_URL,
            token=settings.INFLUXDB_TOKEN,  # Pasa la cadena vacía
            org=settings.INFLUXDB_ORG,
            verify_ssl=False
        )
        self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
        self.query_api = self.client.query_api()

    def guardar_telemetria(self, nodo_id, tipo_sensor, valor, unidad=""):
        point = (
            Point("telemetria_nodo")
            .tag("nodo_id", str(nodo_id))
            .tag("tipo_sensor", str(tipo_sensor))
            .field("valor", float(valor))
        )
        if unidad:
            point = point.tag("unidad", str(unidad))

        self.write_api.write(
            bucket=settings.INFLUXDB_BUCKET,
            org=settings.INFLUXDB_ORG,
            record=point
        )

    def obtener_telemetria_reciente(self, nodo_id, rango_tiempo="-24h"):
        query = f'''
        from(bucket: "{settings.INFLUXDB_BUCKET}")
            |> range(start: {rango_tiempo})
            |> filter(fn: (r) => r["_measurement"] == "telemetria_nodo")
            |> filter(fn: (r) => r["nodo_id"] == "{nodo_id}")
        '''
        result = self.query_api.query(org=settings.INFLUXDB_ORG, query=query)
        
        datos = []
        for table in result:
            for record in table.records:
                datos.append({
                    "tiempo": record.get_time(),
                    "sensor": record.values.get("tipo_sensor"),
                    "valor": record.get_value(),
                })
        return datos

    def cerrar(self):
        self.client.close()