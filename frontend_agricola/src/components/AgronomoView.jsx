import { useState, useEffect } from 'react'

function AgronomoView({ usuario, setUsuarioActivo }) {
  const [telemetriaGeneral, setTelemetriaGeneral] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todo')

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/telemetria/')
        if (response.ok) {
          const data = await response.json()
          // Asegura guardar la lista de la llave "telemetria" o el array directo
          setTelemetriaGeneral(data.telemetria || data || [])
        }
      } catch (error) {
        console.error("Error cargando telemetría", error)
      } finally {
        setCargando(false)
      }
    }
    fetchDatos()
  }, [])

  // Protegemos el filtro para que no falle si la variable no es un array
  const datosFiltrados = (Array.isArray(telemetriaGeneral) ? telemetriaGeneral : []).filter(item => {
    if (filtro === 'todo') return true
    const fechaDato = new Date(item.tiempo) // Cambiado a item.tiempo para InfluxDB
    const diffDias = (new Date() - fechaDato) / (1000 * 3600 * 24)
    if (filtro === 'hoy') return diffDias < 1
    if (filtro === 'semana') return diffDias <= 7
    if (filtro === 'mes') return diffDias <= 30
    return true
  })

  const formatearFecha = (fechaString) => {
    if (!fechaString) return 'Sin fecha';
    return new Date(fechaString).toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="layout-center">
      <div className="card dashboard-wide">
        <header className="dashboard-header">
          <div>
            <h2 className="app-title">Visor de Telemetría</h2>
            <p className="app-subtitle">Bienvenido, <strong>{usuario.username}</strong> (Agrónomo)</p>
          </div>
          <button onClick={() => setUsuarioActivo(null)} className="btn-logout">Cerrar Sesión</button>
        </header>

        <section>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3 className="section-title">Base de Datos Edge (InfluxDB)</h3>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{marginBottom: '1rem', padding: '0.3rem'}}>
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
                    <th>Tipo de Sensor</th>
                    <th>Medición</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {datosFiltrados.map((dato, index) => (
                    <tr key={index}>
                      <td>{formatearFecha(dato.tiempo)}</td>
                      <td>{dato.nodo || 'nodo_01'}</td>
                      <td>{dato.sensor ? dato.sensor.charAt(0).toUpperCase() + dato.sensor.slice(1) : 'Sensor'}</td>
                      <td>{dato.valor} {dato.unidad}</td>
                      <td>
                        {/* Evaluación dinámica de alerta solo para temperatura */}
                        {dato.sensor === 'temperatura' && parseFloat(dato.valor) <= 0 
                          ? <span style={{color: '#f87171', fontWeight: 'bold'}}>Helada Detectada</span> 
                          : <span style={{color: '#6ee7b7'}}>Normal</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {datosFiltrados.length === 0 && (
                <p style={{color: '#94a3b8', textAlign: 'center', marginTop: '1rem'}}>
                  No hay datos registrados para este período.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default AgronomoView