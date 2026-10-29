import { useState } from "react";

function Login({ setUsuarioActivo }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorLogin, setErrorLogin] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorLogin("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok) {
        // Guardar token JWT en el almacenamiento local del navegador
        if (data.access) {
          localStorage.setItem("jwt_access", data.access);
          localStorage.setItem("jwt_refresh", data.refresh);
        }

        // INTEGRADO: data ya contiene { username, es_jefe }
        setUsuarioActivo(data.usuario || data);
      } else {
        setErrorLogin(data.error || "Credenciales inválidas");
      }
    } catch (error) {
      setErrorLogin("Error de conexión con el servidor Edge.");
    }
  };

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
              placeholder="Ej: admin"
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
          <button type="submit" className="btn-primary">
            Iniciar Sesión
          </button>
        </form>
        {errorLogin && <p className="badge-error">{errorLogin}</p>}
      </div>
    </div>
  );
}

export default Login;