import { useState } from 'react'

function OperarioView({ usuario, setUsuarioActivo }) {
  const [temperatura, setTemperatura] = useState('')
  const [humedad, setHumedad] = useState('')
  const [mensajeForm, setMensajeForm] = useState('')
  const [historialSesion, setHistorialSesion] = useState([])

  const handleEnviarDatos = async (e) => {
    e.preventDefault()
    setMensajeForm('')

    if (temperatura === '' || humedad === '') {
      setMensajeForm('Debes completar ambos campos.')
      return
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/telemetria/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperatura, humedad })
      })
      
      if (response.ok) {
        setMensajeForm(`Dato registrado con éxito. ${temperatura <= 0 ? '¡ALERTA DE HELADA!' : ''}`)
        // Agregar al historial local de la vista
        setHistorialSesion([{ temp: temperatura, hum: humedad, hora: new Date().toLocaleTimeString() }, ...historialSesion])
        setTemperatura('')
        setHumedad('')
      } else {
        setMensajeForm('Error al guardar en la base de datos.')
      }
    } catch (error) {
      setMensajeForm('Error de conexión.')
    }
  }

  return (
    <div className="layout-center">
      <div className="card dashboard-wide">
        <header className="dashboard-header">
          <div>
            <h2 className="app-title">Panel de Control - Registro</h2>
            <p className="app-subtitle">Bienvenido, <strong>{usuario.username}</strong> (Operario)</p>
          </div>
          <button onClick={() => setUsuarioActivo(null)} className="btn-logout">Cerrar Sesión</button>
        </header>

        <div className="layout-grid-2">
          {/* Columna Izquierda: Formulario */}
          <section className="seccion-form">
            <h3 className="section-title">Ingreso de Telemetría</h3>
            <form onSubmit={handleEnviarDatos} className="formulario-grid">
              <div className="campo full-width">
                <label>Temperatura (°C)</label>
                <input type="number" step="0.1" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} />
              </div>
              <div className="campo full-width">
                <label>Humedad (%)</label>
                <input type="number" step="0.1" value={humedad} onChange={(e) => setHumedad(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary btn-save full-width">Guardar Registro</button>
            </form>
            {mensajeForm && (
              <div className={`badge-status ${mensajeForm.includes('Error') || mensajeForm.includes('ALERTA') ? 'status-err' : 'status-ok'}`}>
                {mensajeForm}
              </div>
            )}
          </section>

          {/* Columna Derecha: Historial Local */}
          <section>
            <h3 className="section-title">Últimos Registros (Sesión)</h3>
            <div className="historial-box">
              {historialSesion.length === 0 ? (
                <p style={{color: '#94a3b8', fontSize: '0.85rem'}}>No se han ingresado datos en esta sesión.</p>
              ) : (
                historialSesion.map((item, index) => (
                  <div key={index} className="historial-item">
                    <span>🌡️ {item.temp}°C | 💧 {item.hum}%</span>
                    <span>{item.hora}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default OperarioView