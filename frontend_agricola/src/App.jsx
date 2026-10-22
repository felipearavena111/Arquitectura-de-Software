import { useState } from 'react'
import './App.css'

function App() {
  // Estados para el Login
  const [usuarioActivo, setUsuarioActivo] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorLogin, setErrorLogin] = useState('')

  // Estados para el Formulario IoT
  const [temperatura, setTemperatura] = useState('')
  const [humedad, setHumedad] = useState('')
  const [mensajeForm, setMensajeForm] = useState('')

  // Función para Iniciar Sesión
  const handleLogin = async (e) => {
    e.preventDefault()
    setErrorLogin('')
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await response.json()

      if (response.ok) {
        setUsuarioActivo(data) // Guardamos los datos del usuario logueado
      } else {
        setErrorLogin(data.error || 'Credenciales inválidas') // Manejo de error de credenciales
      }
    } catch (error) {
      setErrorLogin('Error de conexión con el servidor Edge.')
    }
  }

  // Función para Enviar Datos de Telemetría
  const handleEnviarDatos = async (e) => {
    e.preventDefault()
    setMensajeForm('')

    // Validación básica pedida en rúbrica
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
        setMensajeForm(`Dato registrado con éxito. ${temperatura <= 0 ? '¡ALERTA DE HELADA ACTIVADA!' : ''}`)
        setTemperatura('')
        setHumedad('')
      } else {
        setMensajeForm('Error al guardar en la base de datos.')
      }
    } catch (error) {
      setMensajeForm('Error de conexión.')
    }
  }

  // PANTALLA 1: LOGIN (Si no hay usuario activo)
  if (!usuarioActivo) {
    return (
      <div className="layout-center">
        <div className="card login-card">
          <h2 className="app-title">Nodo Edge Agrícola</h2>
          <p className="app-subtitle">Ingreso al Sistema</p>

          <form onSubmit={handleLogin} className="formulario">
            <div className="campo">
              <label htmlFor="user">Usuario</label>
              <input 
                id="user"
                type="text" 
                placeholder="Ej: postgre" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
              />
            </div>

            <div className="campo">
              <label htmlFor="pass">Contraseña</label>
              <input 
                id="pass"
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            <button type="submit" className="btn-primary">Iniciar Sesión</button>
          </form>

          {errorLogin && <p className="badge-error">{errorLogin}</p>}
        </div>
      </div>
    )
  }

  // PANTALLA 2: DASHBOARD (Si el usuario inició sesión correctamente)
  return (
    <div className="layout-center">
      <div className="card dashboard-card">
        <header className="dashboard-header">
          <div>
            <h2 className="app-title">Panel de Control</h2>
            <p className="app-subtitle">
              Bienvenido, <strong>{usuarioActivo.username}</strong> ({usuarioActivo.es_jefe ? 'Jefe de Terreno' : 'Operario'})
            </p>
          </div>
          <button onClick={() => setUsuarioActivo(null)} className="btn-logout">
            Cerrar Sesión
          </button>
        </header>

        <section className="seccion-form">
          <h3 className="section-title">Registro Manual de Telemetría</h3>
          <form onSubmit={handleEnviarDatos} className="formulario-grid">
            <div className="campo">
              <label>Temperatura (°C)</label>
              <input 
                type="number" 
                step="0.1" 
                placeholder="Ej: 18.5"
                value={temperatura} 
                onChange={(e) => setTemperatura(e.target.value)} 
              />
            </div>

            <div className="campo">
              <label>Humedad (%)</label>
              <input 
                type="number" 
                step="0.1" 
                placeholder="Ej: 65.0"
                value={humedad} 
                onChange={(e) => setHumedad(e.target.value)} 
              />
            </div>

            <button type="submit" className="btn-primary btn-save full-width">
              Guardar Registro local
            </button>
          </form>

          {mensajeForm && (
            <div className={`badge-status ${mensajeForm.includes('❌') || mensajeForm.includes('⚠️') ? 'status-err' : 'status-ok'}`}>
              {mensajeForm}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default App