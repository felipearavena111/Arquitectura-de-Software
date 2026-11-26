import { useState, useEffect } from 'react'
import './App.css'
import Login from './components/Login'
import OperarioView from './components/OperarioView'
import AgronomoView from './components/AgronomoView'
import { obtenerUsuarioGuardado, guardarUsuario, cerrarSesion } from './api'

function App() {
  const [usuarioActivo, setUsuarioActivoState] = useState(() => obtenerUsuarioGuardado())

  const setUsuarioActivo = (usuario) => {
    if (usuario) {
      guardarUsuario(usuario)
    } else {
      cerrarSesion()
    }
    setUsuarioActivoState(usuario)
  }

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

  // Si es Agrónomo, muestra su vista de solo lectura y control de riego
  if (usuarioActivo.es_jefe) {
    return <AgronomoView usuario={usuarioActivo} setUsuarioActivo={setUsuarioActivo} />
  }

  // Si es Operario, muestra el formulario y su historial
  return <OperarioView usuario={usuarioActivo} setUsuarioActivo={setUsuarioActivo} />
}

export default App