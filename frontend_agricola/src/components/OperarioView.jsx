import { useState, useEffect, useRef } from "react";
import { apiFetch, cerrarSesion } from "../api";

function OperarioView({ usuario, setUsuarioActivo }) {
  const [telemetria, setTelemetria] = useState([]);
  const [temperatura, setTemperatura] = useState("");
  const [humedad, setHumedad] = useState("");
  const [mensajeForm, setMensajeForm] = useState("");
  const [filtro, setFiltro] = useState("todo");
  const [estadoRiego, setEstadoRiego] = useState(null);

  // Estados para edición inline en el historial
  const [editandoClave, setEditandoClave] = useState(null);
  const [editTemp, setEditTemp] = useState("");
  const [editHum, setEditHum] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  // Estados del simulador Random Walk (parte en 4.0°C y 65% humedad)
  const [simTemp, setSimTemp] = useState(4.0);
  const [simHum, setSimHum] = useState(65.0);
  const [simulacionActiva, setSimulacionActiva] = useState(false);
  const simRef = useRef({ temp: 4.0, hum: 65.0 });

  const cargarDatos = async () => {
    try {
      const response = await apiFetch("/telemetria/");
      if (response.ok) {
        const data = await response.json();
        setTelemetria(data.telemetria || data || []);
      }
    } catch (error) {
      console.error("Error cargando telemetría", error);
    }
  };

  const cargarEstadoRiego = async () => {
    try {
      const response = await apiFetch("/riego/");
      if (response.ok) {
        const data = await response.json();
        setEstadoRiego(data);
      }
    } catch (error) {
      console.error("Error cargando estado de riego", error);
    }
  };

  useEffect(() => {
    cargarDatos();
    cargarEstadoRiego();
  }, []);

  // Paso de caminata aleatoria suave (Random Walk)
  const ejecutarPasoSimulacion = async () => {
    const deltaTemp = Math.random() * 3.0 - 1.5; // [-1.5, +1.5]
    const deltaHum = Math.random() * 6.0 - 3.0;  // [-3.0, +3.0]

    const nuevaTemp = Number(
      Math.min(30, Math.max(-10, simRef.current.temp + deltaTemp)).toFixed(1)
    );
    const nuevaHum = Number(
      Math.min(100, Math.max(0, simRef.current.hum + deltaHum)).toFixed(1)
    );

    simRef.current = { temp: nuevaTemp, hum: nuevaHum };
    setSimTemp(nuevaTemp);
    setSimHum(nuevaHum);

    try {
      const response = await apiFetch("/telemetria/", {
        method: "POST",
        body: JSON.stringify({ temperatura: nuevaTemp, humedad: nuevaHum }),
      });
      if (response.ok) {
        setMensajeForm(
          nuevaTemp < 0
            ? `Simulación (${nuevaTemp}°C / ${nuevaHum}%): ¡ALERTA DE HELADA! Riego activado.`
            : `Simulación registrada: ${nuevaTemp}°C y ${nuevaHum}% humedad.`
        );
        cargarDatos();
        cargarEstadoRiego();
      }
    } catch (error) {
      console.error("Error en simulación", error);
    }
  };

  useEffect(() => {
    if (!simulacionActiva) return;
    const intervalo = setInterval(() => {
      ejecutarPasoSimulacion();
    }, 60000); // Envía una lectura cada 1 minuto
    return () => clearInterval(intervalo);
  }, [simulacionActiva]);

  const handleEnviarDatos = async (e) => {
    e.preventDefault();
    setMensajeForm("");
    if (temperatura === "" || humedad === "")
      return setMensajeForm("Completa ambos campos.");

    try {
      const response = await apiFetch("/telemetria/", {
        method: "POST",
        body: JSON.stringify({ temperatura, humedad }),
      });
      if (response.ok) {
        const tempNum = parseFloat(temperatura);
        setMensajeForm(
          tempNum < 0
            ? "¡Dato registrado! ALERTA DE HELADA (< 0°C): Riego anti-helada activado."
            : "Dato registrado correctamente.",
        );
        setTemperatura("");
        setHumedad("");
        cargarDatos();
        cargarEstadoRiego();
      } else if (response.status === 403) {
        setMensajeForm("No tienes permisos para registrar datos.");
      } else if (response.status !== 401) {
        setMensajeForm("No se pudo registrar el dato.");
      }
    } catch (error) {
      setMensajeForm("Error de conexión.");
    }
  };

  const iniciarEdicion = (reg) => {
    setEditandoClave(reg.clave);
    setEditTemp(reg.tempValor !== undefined ? String(reg.tempValor) : "");
    setEditHum(reg.humValor !== undefined ? String(reg.humValor) : "");
  };

  const guardarEdicion = async (reg) => {
    setGuardandoEdit(true);
    try {
      const response = await apiFetch("/telemetria/", {
        method: "PUT",
        body: JSON.stringify({
          nodo: reg.nodo,
          tiempo: reg.tiempo,
          tiempo_temp: reg.tiempoTemp,
          tiempo_hum: reg.tiempoHum,
          temperatura: editTemp,
          humedad: editHum,
        }),
      });
      if (response.ok) {
        setEditandoClave(null);
        setMensajeForm("Registro actualizado correctamente.");
        cargarDatos();
        cargarEstadoRiego();
      } else {
        setMensajeForm("No se pudo actualizar el registro.");
      }
    } catch (error) {
      setMensajeForm("Error de conexión al editar.");
    } finally {
      setGuardandoEdit(false);
    }
  };

  const datosFiltrados = (Array.isArray(telemetria) ? telemetria : []).filter(
    (item) => {
      if (filtro === "todo") return true;
      const fechaDato = new Date(item.tiempo);
      const diffDias = (new Date() - fechaDato) / (1000 * 3600 * 24);
      if (filtro === "hoy") return diffDias < 1;
      if (filtro === "semana") return diffDias <= 7;
      if (filtro === "mes") return diffDias <= 30;
      return true;
    },
  );

  // Agrupa temperatura y humedad enviadas en el mismo evento (mismo nodo y segundo exacto)
  const registrosAgrupados = Object.values(
    datosFiltrados.reduce((acc, item) => {
      const nodo = item.nodo || "nodo_01";
      const fechaObj = item.tiempo ? new Date(item.tiempo) : null;
      const claveSegundo =
        fechaObj && !isNaN(fechaObj)
          ? `${nodo}_${fechaObj.getFullYear()}-${fechaObj.getMonth()}-${fechaObj.getDate()}_${fechaObj.getHours()}:${fechaObj.getMinutes()}:${fechaObj.getSeconds()}`
          : `${nodo}_sin_fecha`;

      if (!acc[claveSegundo]) {
        acc[claveSegundo] = {
          clave: claveSegundo,
          tiempo: item.tiempo,
          tiempoTemp: null,
          tiempoHum: null,
          nodo,
          temperatura: null,
          humedad: null,
          tempValor: undefined,
          humValor: undefined,
        };
      }

      if (item.sensor === "temperatura") {
        acc[claveSegundo].temperatura = `${item.valor}${item.unidad || "°C"}`;
        acc[claveSegundo].tempValor = parseFloat(item.valor);
        acc[claveSegundo].tiempoTemp = item.tiempo;
      } else if (item.sensor === "humedad") {
        acc[claveSegundo].humedad = `${item.valor}${item.unidad || "%"}`;
        acc[claveSegundo].humValor = parseFloat(item.valor);
        acc[claveSegundo].tiempoHum = item.tiempo;
      }

      if (
        item.tiempo &&
        (!acc[claveSegundo].tiempo ||
          new Date(item.tiempo) > new Date(acc[claveSegundo].tiempo))
      ) {
        acc[claveSegundo].tiempo = item.tiempo;
      }

      return acc;
    }, {}),
  ).sort((a, b) => new Date(b.tiempo) - new Date(a.tiempo));

  const formatearFecha = (fechaString) => {
    if (!fechaString) return "Sin fecha";
    return new Date(fechaString).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="layout-center">
      <div className="card dashboard-wide">
        <header className="dashboard-header">
          <div>
            <h2 className="app-title">Panel de Control - Operario</h2>
            <p className="app-subtitle">
              Bienvenido, <strong>{usuario.username}</strong>
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {estadoRiego && (
              <span
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "999px",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  backgroundColor: estadoRiego.encendido
                    ? "rgba(34, 197, 94, 0.15)"
                    : "rgba(148, 163, 184, 0.15)",
                  color: estadoRiego.encendido ? "#4ade80" : "#cbd5e1",
                  border: `1px solid ${estadoRiego.encendido ? "#22c55e" : "#475569"}`,
                }}
              >
                Riego Anti-helada:{" "}
                {estadoRiego.encendido
                  ? `ACTIVO (${estadoRiego.modo})`
                  : "APAGADO"}
              </span>
            )}

            <button
              onClick={() => {
                cerrarSesion();
                setUsuarioActivo(null);
              }}
              className="btn-logout"
            >
              Cerrar Sesión
            </button>
          </div>
        </header>

        <div className="layout-grid-2">
          <section className="seccion-form">
            <h3 className="section-title">Ingreso de Telemetría</h3>
            <form onSubmit={handleEnviarDatos} className="formulario-grid">
              <div className="campo full-width">
                <label>Temperatura (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={temperatura}
                  onChange={(e) => setTemperatura(e.target.value)}
                />
              </div>
              <div className="campo full-width">
                <label>Humedad (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={humedad}
                  onChange={(e) => setHumedad(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary btn-save full-width">
                Guardar Registro
              </button>
            </form>

            {/* Bloque Simulador Random Walk */}
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                borderRadius: "8px",
                backgroundColor: "#0f172a",
                border: "1px solid #334155",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <strong style={{ color: "#38bdf8", fontSize: "0.9rem" }}>
                  Simulador Sensor (Random Walk)
                </strong>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Actual: {simTemp}°C | {simHum}%
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.75rem" }}>
                Inicia en 4.0°C / 65% y varía suavemente (±1.5°C y ±3% por minuto).
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={ejecutarPasoSimulacion}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #38bdf8",
                    backgroundColor: "transparent",
                    color: "#38bdf8",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                  }}
                >
                  Simular 1 Lectura
                </button>
                <button
                  type="button"
                  onClick={() => setSimulacionActiva(!simulacionActiva)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: simulacionActiva ? "#ef4444" : "#38bdf8",
                    color: simulacionActiva ? "#fff" : "#0f172a",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                  }}
                >
                  {simulacionActiva ? "Detener Auto (1m)" : "Auto Simular (1m)"}
                </button>
              </div>
            </div>

            {mensajeForm && <div className="badge-status">{mensajeForm}</div>}
          </section>

          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 className="section-title">Historial Global</h3>
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                style={{ marginBottom: "1rem", padding: "0.3rem" }}
              >
                <option value="hoy">Hoy</option>
                <option value="semana">Última Semana</option>
                <option value="mes">Último Mes</option>
                <option value="todo">Todo el tiempo</option>
              </select>
            </div>

            <div className="historial-box" style={{ maxHeight: "430px" }}>
              {registrosAgrupados.map((reg) => {
                const esHelada =
                  reg.tempValor !== undefined && reg.tempValor < 0;
                const estaEditando = editandoClave === reg.clave;

                return (
                  <div
                    key={reg.clave}
                    className="historial-item"
                    style={{
                      flexDirection: "column",
                      gap: "0.5rem",
                      borderLeft: esHelada
                        ? "3px solid #f87171"
                        : "3px solid #10b981",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        📅 {formatearFecha(reg.tiempo)} | Nodo: {reg.nodo}
                      </span>
                      {esHelada && !estaEditando && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            color: "#f87171",
                          }}
                        >
                          HELADA
                        </span>
                      )}
                    </div>

                    {estaEditando ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                        <label style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                          Temp (°C):
                          <input
                            type="number"
                            step="0.1"
                            value={editTemp}
                            onChange={(e) => setEditTemp(e.target.value)}
                            style={{ width: "75px", marginLeft: "0.3rem", padding: "0.2rem 0.4rem" }}
                          />
                        </label>
                        <label style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                          Hum (%):
                          <input
                            type="number"
                            step="0.1"
                            value={editHum}
                            onChange={(e) => setEditHum(e.target.value)}
                            style={{ width: "75px", marginLeft: "0.3rem", padding: "0.2rem 0.4rem" }}
                          />
                        </label>
                        <div style={{ display: "flex", gap: "0.4rem", marginLeft: "auto" }}>
                          <button
                            type="button"
                            disabled={guardandoEdit}
                            onClick={() => guardarEdicion(reg)}
                            style={{
                              background: "#10b981",
                              border: "none",
                              color: "#0f172a",
                              fontWeight: "bold",
                              borderRadius: "4px",
                              cursor: "pointer",
                              padding: "0.25rem 0.6rem",
                            }}
                          >
                            {guardandoEdit ? "..." : "Guardar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoClave(null)}
                            style={{
                              background: "transparent",
                              border: "1px solid #64748b",
                              color: "#cbd5e1",
                              borderRadius: "4px",
                              cursor: "pointer",
                              padding: "0.25rem 0.6rem",
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "1rem",
                            alignItems: "center",
                          }}
                        >
                          {reg.temperatura !== null && (
                            <span
                              style={{
                                color: esHelada ? "#f87171" : "#f8fafc",
                                fontWeight: esHelada ? "bold" : "normal",
                              }}
                            >
                              🌡️ Temp: <strong>{reg.temperatura}</strong>
                            </span>
                          )}
                          {reg.humedad !== null && (
                            <span>
                              💧 Humedad: <strong>{reg.humedad}</strong>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => iniciarEdicion(reg)}
                          style={{
                            background: "transparent",
                            border: "1px solid #38bdf8",
                            color: "#38bdf8",
                            borderRadius: "4px",
                            cursor: "pointer",
                            padding: "0.2rem 0.5rem",
                          }}
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {registrosAgrupados.length === 0 && (
                <p style={{ color: "#94a3b8", textAlign: "center" }}>
                  No hay datos registrados aún.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default OperarioView;