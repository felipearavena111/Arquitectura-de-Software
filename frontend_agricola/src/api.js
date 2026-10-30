const API_URL = "http://127.0.0.1:8000/api";

export function guardarSesion({ access, refresh }) {
  if (access) localStorage.setItem("jwt_access", access);
  if (refresh) localStorage.setItem("jwt_refresh", refresh);
}

export function cerrarSesion() {
  localStorage.removeItem("jwt_access");
  localStorage.removeItem("jwt_refresh");
}

// Usa el refresh token para obtener un nuevo access token.
async function refrescarAccess() {
  const refresh = localStorage.getItem("jwt_refresh");
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    guardarSesion({ access: data.access, refresh: data.refresh });
    return true;
  } catch {
    return false;
  }
}

// fetch autenticado: agrega el Bearer, y ante un 401 intenta refrescar
// el token una vez y reintenta. Si no se puede, cierra la sesión.
export async function apiFetch(path, options = {}) {
  const hacerPeticion = () =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: `Bearer ${localStorage.getItem("jwt_access")}`,
      },
    });

  let res = await hacerPeticion();
  if (res.status === 401 && (await refrescarAccess())) {
    res = await hacerPeticion();
  }
  if (res.status === 401) {
    cerrarSesion();
    window.dispatchEvent(new Event("sesion-expirada"));
  }
  return res;
}
