import { useState, useEffect } from 'react'

function OperarioView({ usuario, setUsuarioActivo }) {
  const [telemetria, setTelemetria] = useState([])
  const [temperatura, setTemperatura] = useState('')
  const [humedad, setHumedad] = useState('')
  const [mensajeForm, setMensajeForm] = useState('')
  const [filtro, setFiltro] = useState('todo')
  
  // Estados para edición
  const [editandoId, setEditandoId] = useState(null)
  const [editTemp, setEditTemp] = useState('')
  const [editHum, setEditHum] = useState('')

  const cargarDatos = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/telemetria/')
      if (response.ok) {
        const data = await response.json()
        setTelemetria(data)
      }
    } catch (error) {
      console.error("Error cargando telemetría", error)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const handleEnviarDatos = async (e) => {
    e.preventDefault()
    setMensajeForm('')
    if (temperatura === '' || humedad === '') return setMensajeForm('Completa ambos campos.')

    try {
      const response = await fetch('http://127.0.0.1:8000/api/telemetria/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperatura, humedad })
      })
      if (response.ok) {
        setMensajeForm(`Dato registrado. ${temperatura <= 0 ? '¡ALERTA DE HELADA!' : ''}`)
        setTemperatura('')
        setHumedad('')
        cargarDatos() // Recargar tabla
      }
    } catch (error) {
      setMensajeForm('Error de conexión.')
    }
  }

  const handleActualizarDato = async (id) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/telemetria/${id}/`, {
        method: 'PUT', // O PATCH dependiendo de tu configuración en Django
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperatura: editTemp, humedad: editHum })
      })
      if (response.ok) {
        setEditandoId(null)
        cargarDatos()
      }
    } catch (error) {
      console.error("Error actualizando", error)
    }
  }

  const datosFiltrados = telemetria.filter(item => {
    if (filtro === 'todo') return true
    const fechaDato = new Date(item.fecha || item.created_at) // Ajusta el nombre del campo fecha según tu BD
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
            <h2 className="app-title">Panel de Control - Operario</h2>
            <p className="app-subtitle">Bienvenido, <strong>{usuario.username}</strong></p>
          </div>
          <button onClick={() => setUsuarioActivo(null)} className="btn-logout">Cerrar Sesión</button>
        </header>

        <div className="layout-grid-2">
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
            {mensajeForm && <div className="badge-status">{mensajeForm}</div>}
          </section>

          <section>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3 className="section-title">Historial Global</h3>
              <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{marginBottom: '1rem', padding: '0.3rem'}}>
                <option value="hoy">Hoy</option>
                <option value="semana">Última Semana</option>
                <option value="mes">Último Mes</option>
                <option value="todo">Todo el tiempo</option>
              </select>
            </div>
            
            <div className="historial-box" style={{maxHeight: '400px'}}>
              {datosFiltrados.map((dato) => (
                <div key={dato.id} className="historial-item" style={{flexDirection: 'column', gap: '0.5rem'}}><span style={{fontSize: '0.75rem', color: '#94a3b8'}}>📅 {formatearFecha(dato.fecha)}</span>
                  {editandoId === dato.id ? (
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <input type="number" step="0.1" value={editTemp} onChange={(e)=>setEditTemp(e.target.value)} style={{width: '70px'}}/>
                      <input type="number" step="0.1" value={editHum} onChange={(e)=>setEditHum(e.target.value)} style={{width: '70px'}}/>
                      <button onClick={() => handleActualizarDato(dato.id)} className="btn-save" style={{padding: '0.3rem', borderRadius: '4px'}}>✔</button>
                      <button onClick={() => setEditandoId(null)} style={{padding: '0.3rem', borderRadius: '4px'}}>✖</button>
                    </div>
                  ) : (
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span>🌡️ {dato.temperatura}°C | 💧 {dato.humedad}%</span>
                      <button onClick={() => { setEditandoId(dato.id); setEditTemp(dato.temperatura); setEditHum(dato.humedad); }} style={{background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '4px', cursor: 'pointer'}}>Editar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default OperarioView