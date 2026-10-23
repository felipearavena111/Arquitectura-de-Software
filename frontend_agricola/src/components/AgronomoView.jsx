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
          setTelemetriaGeneral(data)
        }
      } catch (error) {
        console.error("Error cargando telemetría", error)
      } finally {
        setCargando(false)
      }
    }
    fetchDatos()
  }, [])

  const datosFiltrados = telemetriaGeneral.filter(item => {
    if (filtro === 'todo') return true
    const fechaDato = new Date(item.fecha || item.created_at)
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
            <h3 className="section-title">Base de Datos Edge</h3>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{marginBottom: '1rem', padding: '0.3rem'}}>
              <option value="hoy">Hoy</option>
              <option value="semana">Última Semana</option>
              <option value="mes">Último Mes</option>
              <option value="todo">Todo el tiempo</option>
            </select>
          </div>

          {cargando ? (
            <p style={{ color: '#94a3b8' }}>Sincronizando con PostgreSQL...</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Temperatura</th>
                    <th>Humedad</th>
                    <th>Alerta Helada</th>
                  </tr>
                </thead>
                <tbody>
                  {datosFiltrados.map((dato) => (
                    <tr key={dato.id}>
                      <td>#{dato.id}</td>
                      <td>{formatearFecha(dato.fecha)}</td>
                      <td>{dato.temperatura}°C</td>
                      <td>{dato.humedad}%</td>
                      <td>
                        {dato.alerta_helada ? <span style={{color: '#f87171'}}>Crítica</span> : <span style={{color: '#6ee7b7'}}>Normal</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default AgronomoView