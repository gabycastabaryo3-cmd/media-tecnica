/* ==========================================================================
   PINPOINT GPS — cliente de la API
   Si la API no responde, la app sigue funcionando en modo demostración con
   datos de ejemplo (útil para mostrar el proyecto sin servidor levantado).
   ========================================================================== */

const API = (() => {
  const BASE =
    localStorage.getItem('pinpoint_api_base') || 'http://localhost:3000';
  const TIMEOUT_MS = 7000;

  /** 'vivo' | 'demo' | 'desconocido' */
  let estado = 'desconocido';

  function getEstado() {
    return estado;
  }

  function getBase() {
    return BASE;
  }

  /* ----------------------------- datos demo ----------------------------- */

  const minutosAtras = (m) => new Date(Date.now() - m * 60000).toISOString();

  const DEMO_TIPOS = [
    { id: 1, nombre: 'Robo a mano armada', nivel_peligro_base: 5 },
    { id: 2, nombre: 'Hurto a personas', nivel_peligro_base: 4 },
    { id: 3, nombre: 'Hurto de vehículo', nivel_peligro_base: 5 },
    { id: 4, nombre: 'Zona oscura', nivel_peligro_base: 3 },
    { id: 5, nombre: 'Calle desolada', nivel_peligro_base: 3 },
    { id: 6, nombre: 'Alteración del orden', nivel_peligro_base: 2 },
  ];

  const DEMO_REPORTES = [
    {
      id: 101, tipo: 'Robo a mano armada', nivel_peligro: 5,
      lat: 6.2518, lng: -75.5735,
      descripcion: 'Hurto con arma a un motociclista', fecha_creacion: minutosAtras(12),
    },
    {
      id: 102, tipo: 'Hurto a personas', nivel_peligro: 4,
      lat: 6.2444, lng: -75.5906,
      descripcion: 'Carterismo en el paradero', fecha_creacion: minutosAtras(35),
    },
    {
      id: 103, tipo: 'Zona oscura', nivel_peligro: 3,
      lat: 6.2389, lng: -75.5785,
      descripcion: 'Cuadra sin alumbrado', fecha_creacion: minutosAtras(80),
    },
    {
      id: 104, tipo: 'Hurto de vehículo', nivel_peligro: 5,
      lat: 6.2609, lng: -75.5861,
      descripcion: 'Robo de moto estacionada', fecha_creacion: minutosAtras(140),
    },
    {
      id: 105, tipo: 'Calle desolada', nivel_peligro: 3,
      lat: 6.2471, lng: -75.5652,
      descripcion: 'Paso peatonal sin tránsito', fecha_creacion: minutosAtras(210),
    },
    {
      id: 106, tipo: 'Alteración del orden', nivel_peligro: 2,
      lat: 6.2557, lng: -75.5934,
      descripcion: 'Riña frente a un bar', fecha_creacion: minutosAtras(300),
    },
  ];

  /* ----------------------------- utilidades ----------------------------- */

  async function pedir(ruta, opciones = {}) {
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), TIMEOUT_MS);

    try {
      const resp = await fetch(`${BASE}${ruta}`, {
        ...opciones,
        signal: control.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(opciones.headers || {}),
        },
      });

      const texto = await resp.text();
      const datos = texto ? JSON.parse(texto) : null;

      if (!resp.ok) {
        throw new Error(datos?.error || `Error ${resp.status}`);
      }

      estado = 'vivo';
      return datos;
    } catch (err) {
      if (estado !== 'demo') {
        console.warn('[api] sin conexión con la API:', err.message);
      }
      estado = 'demo';
      throw err;
    } finally {
      clearTimeout(temporizador);
    }
  }

  function token() {
    return localStorage.getItem('pinpoint_token') || null;
  }

  function conSesion() {
    const t = token();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  function guardarSesion({ token: t, usuario }) {
    if (t) localStorage.setItem('pinpoint_token', t);
    if (usuario) localStorage.setItem('pinpoint_usuario', JSON.stringify(usuario));
  }

  function usuario() {
    try {
      return JSON.parse(localStorage.getItem('pinpoint_usuario') || 'null');
    } catch {
      return null;
    }
  }

  function cerrarSesion() {
    localStorage.removeItem('pinpoint_token');
    localStorage.removeItem('pinpoint_usuario');
  }

  /* ------------------------------- endpoints ---------------------------- */

  async function salud() {
    try {
      const datos = await pedir('/health');
      return { enLinea: true, datos };
    } catch {
      return { enLinea: false, datos: null };
    }
  }

  async function tipos() {
    try {
      return await pedir('/api/reportes/tipos');
    } catch {
      return DEMO_TIPOS;
    }
  }

  async function reportes({ lat, lng, radio } = {}) {
    const qs =
      lat != null && lng != null
        ? `?lat=${lat}&lng=${lng}&radio=${radio ?? 1500}`
        : '';

    try {
      const datos = await pedir(`/api/reportes${qs}`);
      return normalizar(datos.reportes || []);
    } catch {
      return DEMO_REPORTES;
    }
  }

  /** Unifica la forma de los datos: la API anida tipo en tipos_incidente. */
  function normalizar(lista) {
    return lista.map((r) => ({
      id: r.id,
      tipo: r.tipo || r.tipos_incidente?.nombre || 'Incidente',
      nivel_peligro: r.nivel_peligro ?? 3,
      lat: Number(r.lat || r.latitud),
      lng: Number(r.lng || r.longitud),
      descripcion: r.descripcion || '',
      fecha_creacion: r.fecha_creacion || new Date().toISOString(),
    }));
  }

  async function crearReporte(datos) {
    try {
      return await pedir('/api/reportes', {
        method: 'POST',
        headers: conSesion(),
        body: JSON.stringify(datos),
      });
    } catch (err) {
      if (estado === 'demo') {
        // En demo se agrega localmente para que el mapa reaccione.
        const nuevo = {
          id: Date.now(),
          tipo: DEMO_TIPOS.find((t) => t.id === Number(datos.tipo_incidente_id))?.nombre || 'Incidente',
          nivel_peligro: Number(datos.nivel_peligro),
          lat: Number(datos.lat),
          lng: Number(datos.lng),
          descripcion: datos.descripcion || '',
          fecha_creacion: new Date().toISOString(),
        };
        DEMO_REPORTES.unshift(nuevo);
        return { id: nuevo.id, mensaje: 'Reporte guardado en modo demostración' };
      }
      throw err;
    }
  }

  async function validarReporte(id, esUtil) {
    return pedir(`/api/reportes/${id}/validar`, {
      method: 'POST',
      headers: conSesion(),
      body: JSON.stringify({ es_util: esUtil }),
    });
  }

  async function rutaSegura(origen, destino) {
    try {
      return await pedir('/api/rutas/segura', {
        method: 'POST',
        headers: conSesion(),
        body: JSON.stringify({ origen, destino }),
      });
    } catch {
      return rutaDemo(origen, destino);
    }
  }

  /* ----------------------------- ruta demo ------------------------------ */

  function distanciaMetros(a, b) {
    const R = 6371000;
    const rad = (g) => (g * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function rutaDemo(origen, destino) {
    const pasos = 24;
    const coordenadas = [];
    for (let i = 0; i <= pasos; i++) {
      const t = i / pasos;
      // Curva suave para que no se vea como una línea recta perfecta.
      const curva = Math.sin(t * Math.PI) * 0.0012;
      coordenadas.push({
        lat: origen.lat + (destino.lat - origen.lat) * t + curva,
        lng: origen.lng + (destino.lng - origen.lng) * t,
      });
    }

    const alertas = [];
    for (const rep of DEMO_REPORTES) {
      let minimo = Infinity;
      for (const p of coordenadas) {
        const d = distanciaMetros(p, rep);
        if (d < minimo) minimo = d;
      }
      if (minimo <= 200) alertas.push({ ...rep, distancia_ruta: Math.round(minimo) });
    }

    const distancia = distanciaMetros(origen, destino);
    const nivel = alertas.reduce((m, a) => Math.max(m, a.nivel_peligro), 0);

    return {
      motor: 'demostración',
      distancia_metros: Math.round(distancia),
      duracion_segundos: Math.round((distancia / 1000 / 28) * 3600),
      segura: alertas.length === 0,
      nivel_riesgo: nivel,
      alertas,
      coordenadas,
    };
  }

  /* ------------------------------- sesión ------------------------------- */

  async function login(correo, password) {
    try {
      const datos = await pedir('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ correo, password }),
      });
      guardarSesion(datos);
      return datos;
    } catch (err) {
      if (estado === 'demo') {
        // Sesión simulada para poder demostrar los formularios.
        const simulado = {
          token: 'demo',
          usuario: { id: 1, nombre: correo.split('@')[0], correo, reputacion: 0 },
        };
        guardarSesion(simulado);
        return simulado;
      }
      throw err;
    }
  }

  async function registro(nombre, correo, password) {
    try {
      const datos = await pedir('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nombre, correo, password }),
      });
      guardarSesion(datos);
      return datos;
    } catch (err) {
      if (estado === 'demo') {
        const simulado = { token: 'demo', usuario: { id: 1, nombre, correo, reputacion: 0 } };
        guardarSesion(simulado);
        return simulado;
      }
      throw err;
    }
  }

  return {
    getEstado,
    getBase,
    salud,
    tipos,
    reportes,
    crearReporte,
    validarReporte,
    rutaSegura,
    login,
    registro,
    usuario,
    token,
    cerrarSesion,
    distanciaMetros,
  };
})();
