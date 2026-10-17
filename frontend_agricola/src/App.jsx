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
        setErrorLogin(data.error) // Manejo de error de credenciales
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
      setMensajeForm('⚠️ Debes completar ambos campos.')
      return
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/telemetria/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperatura, humedad })
      })
      
      if (response.ok) {
        setMensajeForm(`✅ Dato registrado con éxito. ${temperatura <= 0 ? '¡ALERTA DE HELADA ACTIVADA!' : ''}`)
        setTemperatura('')
        setHumedad('')
      } else {
        setMensajeForm('❌ Error al guardar en la base de datos.')
      }
    } catch (error) {
      setMensajeForm('❌ Error de conexión.')
    }
  }

  // PANTALLA 1: LOGIN (Si no hay usuario activo)
  if (!usuarioActivo) {
    return (
      <div className="contenedor">
        <h2>Ingreso - Nodo Edge Agrícola</h2>
        <form onSubmit={handleLogin} className="formulario">
          <input 
            type="text" 
            placeholder="Usuario" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button type="submit">Iniciar Sesión</button>
        </form>
        {errorLogin && <p style={{color: 'red'}}>{errorLogin}</p>}
      </div>
    )
  }

  // PANTALLA 2: DASHBOARD (Si el usuario inició sesión correctamente)
  return (
    <div className="contenedor">
      <h2>Panel de Control - Nodo Edge</h2>
      <p>Bienvenido, <strong>{usuarioActivo.username}</strong> 
         ({usuarioActivo.es_jefe ? 'Jefe de Terreno' : 'Operario'})
      </p>
      
      <div className="tarjeta">
        <h3>Registro Manual de Telemetría</h3>
        <form onSubmit={handleEnviarDatos} className="formulario">
          <label>Temperatura (°C):</label>
          <input 
            type="number" 
            step="0.1" 
            value={temperatura} 
            onChange={(e) => setTemperatura(e.target.value)} 
          />
          <label>Humedad (%):</label>
          <input 
            type="number" 
            step="0.1" 
            value={humedad} 
            onChange={(e) => setHumedad(e.target.value)} 
          />
          <button type="submit">Guardar Registro local</button>
        </form>
        {mensajeForm && <p><strong>{mensajeForm}</strong></p>}
      </div>

      <button onClick={() => setUsuarioActivo(null)} style={{marginTop: '20px'}}>
        Cerrar Sesión
      </button>
    </div>
  )
}

export default App