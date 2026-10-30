import { useState, useEffect } from 'react'
import './App.css'
import Login from './components/Login'
import OperarioView from './components/OperarioView'
import AgronomoView from './components/AgronomoView'

function App() {
  const [usuarioActivo, setUsuarioActivo] = useState(null)

  // Si el token expira y no se puede refrescar, volver al login
  useEffect(() => {
    const alExpirar = () => setUsuarioActivo(null)
    window.addEventListener('sesion-expirada', alExpirar)
    return () => window.removeEventListener('sesion-expirada', alExpirar)
  }, [])

  // Si no hay sesión, muestra el Login
  if (!usuarioActivo) {
    return <Login setUsuarioActivo={setUsuarioActivo} />
  }

  // Si es Agrónomo, muestra su vista de solo lectura
  if (usuarioActivo.es_jefe) {
    return <AgronomoView usuario={usuarioActivo} setUsuarioActivo={setUsuarioActivo} />
  }

  // Si es Operario, muestra el formulario y su historial
  return <OperarioView usuario={usuarioActivo} setUsuarioActivo={setUsuarioActivo} />
}

export default App