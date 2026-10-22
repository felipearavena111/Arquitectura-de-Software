import { useState } from 'react'
import './App.css'
import Login from './components/Login'
import OperarioView from './components/OperarioView'
import AgronomoView from './components/AgronomoView'

function App() {
  const [usuarioActivo, setUsuarioActivo] = useState(null)

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