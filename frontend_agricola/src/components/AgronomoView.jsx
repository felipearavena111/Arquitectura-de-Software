import { useState, useEffect } from 'react'
import { apiFetch, cerrarSesion } from '../api'

function AgronomoView({ usuario, setUsuarioActivo }) {
  const [pestanaActiva, setPestanaActiva] = useState('telemetria') // 'telemetria' | 'riego'
  const [telemetriaGeneral, setTelemetriaGeneral] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todo')

  // Estado del control de riego anti-helada (PostgreSQL)
  const [estadoRiego, setEstadoRiego] = useState({
    encendido: false,
    modo: 'MANUAL',
    motivo: 'Cargando estado...',
    ultima_temperatura: null,
    actualizado_por: 'Sistema',
    actualizado_en: null,
  })
  const [cargandoRiego, setCargandoRiego] = useState(false)
  const [mensajeRiego, setMensajeRiego] = useState('')

  const fetchTelemetria = async () => {
    try {
      const response = await apiFetch('/telemetria/')
      if (response.ok) {
        const data = await response.json()
        setTelemetriaGeneral(data.telemetria || data || [])
      }
    } catch (error) {
      console.error('Error cargando telemetría', error)
    } finally {
      setCargando(false)
    }
  }

  const fetchEstadoRiego = async () => {
    try {
      const response = await apiFetch('/riego/')
      if (response.ok) {
        const data = await response.json()
        setEstadoRiego(data)
      }
    } catch (error) {
      console.error('Error cargando estado de riego', error)
    }
  }

  useEffect(() => {
    fetchTelemetria()
    fetchEstadoRiego()

    const intervaloSync = setInterval(() => {
      fetchTelemetria()
      fetchEstadoRiego()
    }, 4000)

    return () => clearInterval(intervaloSync)
  }, [])

  const cambiarEstadoRiego = async (nuevoEstado) => {
    setCargandoRiego(true)
    setMensajeRiego('')
    try {
      const response = await apiFetch('/riego/', {
        method: 'POST',
        body: JSON.stringify({ encendido: nuevoEstado }),
      })
      if (response.ok) {
        const data = await response.json()
        setEstadoRiego(data)
        setMensajeRiego(
          nuevoEstado
            ? 'Riego anti-helada encendido manualmente.'
            : 'Riego anti-helada apagado manualmente.'
        )
      } else {
        setMensajeRiego('Error al actualizar el estado del riego.')
      }
    } catch (error) {
      console.error('Error al cambiar estado de riego', error)
      setMensajeRiego('Error de conexión con el servidor.')
    } finally {
      setCargandoRiego(false)
    }
  }

  const datosFiltrados = (Array.isArray(telemetriaGeneral) ? telemetriaGeneral : []).filter(item => {
    if (filtro === 'todo') return true
    const fechaDato = new Date(item.tiempo)
    const diffDias = (new Date() - fechaDato) / (1000 * 3600 * 24)
    if (filtro === 'hoy') return diffDias < 1
    if (filtro === 'semana') return diffDias <= 7
    if (filtro === 'mes') return diffDias <= 30
    return true
  })

  // Agrupa temperatura y humedad enviadas en el mismo evento (mismo nodo y segundo exacto)
  const registrosAgrupados = Object.values(
    datosFiltrados.reduce((acc, item) => {
      const nodo = item.nodo || 'nodo_01'
      const fechaObj = item.tiempo ? new Date(item.tiempo) : null
      const claveSegundo =
        fechaObj && !isNaN(fechaObj)
          ? `${nodo}_${fechaObj.getFullYear()}-${fechaObj.getMonth()}-${fechaObj.getDate()}_${fechaObj.getHours()}:${fechaObj.getMinutes()}:${fechaObj.getSeconds()}`
          : `${nodo}_sin_fecha`

      if (!acc[claveSegundo]) {
        acc[claveSegundo] = {
          tiempo: item.tiempo,
          nodo,
          temperatura: null,
          humedad: null,
          tempValor: undefined,
        }
      }

      if (item.sensor === 'temperatura') {
        acc[claveSegundo].temperatura = `${item.valor} ${item.unidad || '°C'}`
        acc[claveSegundo].tempValor = parseFloat(item.valor)
      } else if (item.sensor === 'humedad') {
        acc[claveSegundo].humedad = `${item.valor} ${item.unidad || '%'}`
      }

      if (
        item.tiempo &&
        (!acc[claveSegundo].tiempo ||
          new Date(item.tiempo) > new Date(acc[claveSegundo].tiempo))
      ) {
        acc[claveSegundo].tiempo = item.tiempo
      }

      return acc
    }, {})
  ).sort((a, b) => new Date(b.tiempo) - new Date(a.tiempo))

  const formatearFecha = (fechaString) => {
    if (!fechaString) return 'Sin fecha'
    return new Date(fechaString).toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }

  return (
    <div className="layout-center">
      <div className="card dashboard-wide">
        <header className="dashboard-header">
          <div>
            <h2 className="app-title">Panel Jefe de Terreno / Agrónomo</h2>
            <p className="app-subtitle">Bienvenido, <strong>{usuario.username}</strong></p>
          </div>
          <button
            onClick={() => {
              cerrarSesion()
              setUsuarioActivo(null)
            }}
            className="btn-logout"
          >
            Cerrar Sesión
          </button>
        </header>

        {/* Barra de navegación por pestañas */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setPestanaActiva('telemetria')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              backgroundColor: pestanaActiva === 'telemetria' ? '#10b981' : '#1e293b',
              color: pestanaActiva === 'telemetria' ? '#0f172a' : '#cbd5e1',
            }}
          >
            Visor de Telemetría (InfluxDB)
          </button>

          <button
            type="button"
            onClick={() => {
              setPestanaActiva('riego')
              fetchEstadoRiego()
            }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              backgroundColor: pestanaActiva === 'riego' ? '#38bdf8' : '#1e293b',
              color: pestanaActiva === 'riego' ? '#0f172a' : '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            Control Riego Anti-helada
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: estadoRiego.encendido ? '#22c55e' : '#ef4444',
                display: 'inline-block',
              }}
            />
          </button>
        </div>

        {/* PESTAÑA 1: TELEMETRÍA INFLUXDB */}
        {pestanaActiva === 'telemetria' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="section-title">Base de Datos Edge (InfluxDB)</h3>
              <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ marginBottom: '1rem', padding: '0.3rem' }}>
                <option value="hoy">Hoy</option>
                <option value="semana">Última Semana</option>
                <option value="mes">Último Mes</option>
                <option value="todo">Todo el tiempo</option>
              </select>
            </div>

            {cargando ? (
              <p style={{ color: '#94a3b8' }}>Sincronizando con InfluxDB...</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha / Hora</th>
                      <th>Nodo</th>
                      <th>Temperatura</th>
                      <th>Humedad</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosAgrupados.map((reg, index) => {
                      const esHelada = reg.tempValor !== undefined && reg.tempValor < 0
                      return (
                        <tr key={index}>
                          <td>{formatearFecha(reg.tiempo)}</td>
                          <td>{reg.nodo}</td>
                          <td style={{ color: esHelada ? '#f87171' : '#f8fafc', fontWeight: esHelada ? 'bold' : 'normal' }}>
                            {reg.temperatura || '—'}
                          </td>
                          <td>{reg.humedad || '—'}</td>
                          <td>
                            {esHelada
                              ? <span style={{ color: '#f87171', fontWeight: 'bold' }}>Helada Detectada</span>
                              : <span style={{ color: '#6ee7b7' }}>Normal</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {registrosAgrupados.length === 0 && (
                  <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '1rem' }}>
                    No hay datos registrados para este período.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* PESTAÑA 2: CONTROL DE RIEGO ANTI-HELADA */}
        {pestanaActiva === 'riego' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="section-title" style={{ margin: 0 }}>Sistema de Aspersión Anti-helada (PostgreSQL)</h3>
              <button
                type="button"
                onClick={fetchEstadoRiego}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #475569',
                  backgroundColor: 'transparent',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Actualizar Estado
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#0f172a',
                border: `1px solid ${estadoRiego.encendido ? '#22c55e' : '#334155'}`,
                borderRadius: '10px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block' }}>ESTADO ACTUAL DE VÁLVULAS</span>
                  <strong style={{ fontSize: '1.5rem', color: estadoRiego.encendido ? '#4ade80' : '#f87171' }}>
                    {estadoRiego.encendido ? 'ENCENDIDO (ACTIVO)' : 'APAGADO (EN ESPERA)'}
                  </strong>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block' }}>MODO DE OPERACIÓN</span>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      backgroundColor: estadoRiego.modo === 'AUTOMATICO' ? '#f59e0b' : '#38bdf8',
                      color: '#0f172a',
                    }}
                  >
                    {estadoRiego.modo}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', borderTop: '1px solid #1e293b', paddingTop: '1rem', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block' }}>Motivo / Último evento:</span>
                  <span style={{ color: '#e2e8f0' }}>{estadoRiego.motivo}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block' }}>Última temperatura registrada:</span>
                  <span style={{ color: estadoRiego.ultima_temperatura !== null && estadoRiego.ultima_temperatura < 0 ? '#f87171' : '#6ee7b7', fontWeight: 'bold' }}>
                    {estadoRiego.ultima_temperatura !== null ? `${estadoRiego.ultima_temperatura} °C` : 'Sin lecturas aún'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block' }}>Accionado por:</span>
                  <span style={{ color: '#e2e8f0' }}>
                    {estadoRiego.actualizado_por} {estadoRiego.actualizado_en ? `(${formatearFecha(estadoRiego.actualizado_en)})` : ''}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={cargandoRiego || estadoRiego.encendido}
                onClick={() => cambiarEstadoRiego(true)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: cargandoRiego || estadoRiego.encendido ? 'not-allowed' : 'pointer',
                  backgroundColor: estadoRiego.encendido ? '#1e293b' : '#22c55e',
                  color: estadoRiego.encendido ? '#64748b' : '#0f172a',
                }}
              >
                Encender Riego Manualmente
              </button>

              <button
                type="button"
                disabled={cargandoRiego || !estadoRiego.encendido}
                onClick={() => cambiarEstadoRiego(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: cargandoRiego || !estadoRiego.encendido ? 'not-allowed' : 'pointer',
                  backgroundColor: !estadoRiego.encendido ? '#1e293b' : '#ef4444',
                  color: !estadoRiego.encendido ? '#64748b' : '#ffffff',
                }}
              >
                Apagar Riego Manualmente
              </button>
            </div>

            {mensajeRiego && (
              <p style={{ marginTop: '1rem', color: '#38bdf8', fontWeight: 'bold', textAlign: 'center' }}>
                {mensajeRiego}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export default AgronomoView