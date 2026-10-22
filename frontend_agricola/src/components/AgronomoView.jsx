import { useState, useEffect } from 'react'

function AgronomoView({ usuario, setUsuarioActivo }) {
  const [telemetriaGeneral, setTelemetriaGeneral] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    // Llamada GET al backend para traer todos los datos
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
          <h3 className="section-title">Base de Datos Edge</h3>
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
                  {telemetriaGeneral.map((dato) => (
                    <tr key={dato.id}>
                      <td>#{dato.id}</td>
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