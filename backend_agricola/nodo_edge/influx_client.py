import os
from datetime import datetime, timedelta
from django.conf import settings
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS


class TelemetryInfluxClient:
    def __init__(self):
        self.url = getattr(settings, 'INFLUXDB_URL', os.getenv('INFLUXDB_URL', 'http://influxdb:8086'))
        self.token = getattr(settings, 'INFLUXDB_TOKEN', os.getenv('INFLUXDB_TOKEN', 'mi-token-agricola-123'))
        self.org = getattr(settings, 'INFLUXDB_ORG', os.getenv('INFLUXDB_ORG', 'mi_organizacion_agricola'))
        self.bucket = getattr(settings, 'INFLUXDB_BUCKET', os.getenv('INFLUXDB_BUCKET', 'telemetria_sensores'))

        self.client = InfluxDBClient(url=self.url, token=self.token, org=self.org)
        self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
        self.query_api = self.client.query_api()
        self.delete_api = self.client.delete_api()

    def guardar_telemetria(self, nodo_id, tipo_sensor, valor, unidad="", timestamp=None):
        point = (
            Point("telemetria_nodo")
            .tag("nodo_id", str(nodo_id))
            .tag("tipo_sensor", str(tipo_sensor))
            .field("valor", float(valor))
            .tag("unidad", str(unidad))
        )
        if timestamp is not None:
            point = point.time(timestamp)
        self.write_api.write(bucket=self.bucket, org=self.org, record=point)

    def editar_telemetria(self, nodo_id, tiempo_iso, tipo_sensor, nuevo_valor, unidad=""):
        dt = datetime.fromisoformat(tiempo_iso.replace("Z", "+00:00"))
        start = (dt - timedelta(seconds=1)).isoformat()
        stop = (dt + timedelta(seconds=1)).isoformat()

        predicate = f'_measurement="telemetria_nodo" AND nodo_id="{nodo_id}" AND tipo_sensor="{tipo_sensor}"'
        self.delete_api.delete(start, stop, predicate, bucket=self.bucket, org=self.org)
        self.guardar_telemetria(nodo_id, tipo_sensor, float(nuevo_valor), unidad, timestamp=dt)

    def obtener_telemetria_reciente(self, nodo_id=None, rango_tiempo="-365d"):
        rango = str(rango_tiempo).strip()
        if rango in ("-24h", "-todo", "-all", "-0", "-", ""):
            rango = "-365d"
        elif not rango.startswith("-"):
            rango = f"-{rango}"

        filtro_nodo = f'|> filter(fn: (r) => r["nodo_id"] == "{nodo_id}")' if nodo_id else ""
        flux_query = f'''
        from(bucket: "{self.bucket}")
          |> range(start: {rango})
          |> filter(fn: (r) => r["_measurement"] == "telemetria_nodo")
          |> filter(fn: (r) => r["_field"] == "valor")
          {filtro_nodo}
          |> sort(columns: ["_time"], desc: true)
        '''
        try:
            tables = self.query_api.query(flux_query, org=self.org)
            resultados = []
            for table in tables:
                for record in table.records:
                    resultados.append({
                        "tiempo": record.get_time().isoformat(),
                        "nodo": record.values.get("nodo_id", "nodo_01"),
                        "sensor": record.values.get("tipo_sensor", "sensor"),
                        "valor": record.get_value(),
                        "unidad": record.values.get("unidad", ""),
                    })
            return resultados
        except Exception as e:
            print(f"Error al consultar InfluxDB 2.7: {e}")
            return []

    def cerrar(self):
        self.client.close()