/* ==========================================================================
   PINPOINT GPS — lógica de la interfaz
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------ referencias --------------------------- */

  const $ = (sel) => document.querySelector(sel);

  const el = {
    estadoApi: $('#estado-api'),
    modoDatos: $('#modo-datos'),
    btnUbicacion: $('#btn-ubicacion'),
    btnSesion: $('#btn-sesion'),

    chips: $('#chips'),
    origen: $('#origen'),
    destino: $('#destino'),
    btnOrigenUbicacion: $('#btn-origen-ubicacion'),
    btnIntercambiar: $('#btn-intercambiar'),
    btnRuta: $('#btn-ruta'),

    resultado: $('#resultado-ruta'),
    rutaDistancia: $('#ruta-distancia'),
    rutaTiempo: $('#ruta-tiempo'),
    rutaRiesgo: $('#ruta-riesgo'),
    rutaVeredicto: $('#ruta-veredicto'),
    rutaAlertas: $('#ruta-alertas'),

    formReporte: $('#form-reporte'),
    tipoIncidente: $('#tipo-incidente'),
    nivelPeligro: $('#nivel-peligro'),
    nivelValor: $('#nivel-valor'),
    descripcion: $('#descripcion'),
    coordenadasReporte: $('#coordenadas-reporte'),

    listaReportes: $('#lista-reportes'),

    btnAuxilio: $('#btn-auxilio'),

    modal: $('#modal'),
    modalCerrar: $('#modal-cerrar'),
    tabs: document.querySelectorAll('.tab'),
    formSesion: $('#form-sesion'),
    campoNombre: document.querySelector('.campo-nombre'),
    sesionNombre: $('#sesion-nombre'),
    sesionCorreo: $('#sesion-correo'),
    sesionPassword: $('#sesion-password'),
    sesionError: $('#sesion-error'),
    sesionEnviar: $('#sesion-enviar'),

    avisos: $('#avisos'),
  };

  const estado = {
    ubicacion: null,        // { lat, lng } del usuario
    puntoMapa: null,        // último punto tocado en el mapa
    tab: 'login',
    tipos: [],
    auxilioArmado: false,
    temporizadorAuxilio: null,
  };

  /* ------------------------------ utilidades ---------------------------- */

  function aviso(texto, tipo = '') {
    const nodo = document.createElement('div');
    nodo.className = `aviso ${tipo}`.trim();
    nodo.textContent = texto;
    el.avisos.appendChild(nodo);

    setTimeout(() => {
      nodo.style.opacity = '0';
      nodo.style.transition = 'opacity .25s';
      setTimeout(() => nodo.remove(), 260);
    }, tipo === 'error' ? 7000 : 4200);
  }

  const fmtDistancia = (m) =>
    m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`;

  const fmtTiempo = (s) => {
    const min = Math.max(1, Math.round(s / 60));
    return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
  };

  function hace(fechaISO) {
    const min = Math.round((Date.now() - new Date(fechaISO).getTime()) / 60000);
    if (min < 1) return 'ahora mismo';
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h} h`;
    return `hace ${Math.round(h / 24)} d`;
  }

  /* ------------------------------ geolocalización ----------------------- */

  function pedirUbicacion() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Este navegador no soporta geolocalización'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(new Error(err.message || 'No se pudo obtener la ubicación')),
        { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 },
      );
    });
  }

  async function usarMiUbicacion() {
    try {
      const u = await pedirUbicacion();
      estado.ubicacion = u;
      Mapa.marcarUsuario(u.lat, u.lng);
      Mapa.centrarEn(u.lat, u.lng, 16);
      el.origen.value = 'Mi ubicación';
      aviso('Ubicación obtenida', 'ok');
      await cargarReportes(u);
      return u;
    } catch (err) {
      aviso(`No se pudo ubicar: ${err.message}. Toca el mapa para elegir un punto.`, 'error');
      return null;
    }
  }

  /* ------------------------------ geocodificación ----------------------- */

  /** Búsqueda de direcciones con Nominatim (OpenStreetMap). */
  async function buscarDireccion(texto) {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=es' +
      `&countrycodes=co&q=${encodeURIComponent(texto)}`;
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) throw new Error('No se pudo buscar la dirección');
    return resp.json();
  }

  async function geocodificar(texto) {
    // Nominatim a veces no reconoce el sitio tal como se escribe: se prueban
    // variantes antes de rendirse.
    const variantes = [
      texto,
      `${texto}, Medellín, Antioquia, Colombia`,
      `${texto}, Medellín`,
      `${texto}, Colombia`,
    ];

    for (const variante of variantes) {
      const datos = await buscarDireccion(variante);
      if (datos && datos.length) {
        return {
          lat: Number(datos[0].lat),
          lng: Number(datos[0].lon),
          nombre: datos[0].display_name,
        };
      }
    }

    throw new Error(`No encontramos «${texto}». Toca el mapa para fijar el destino.`);
  }

  async function resolverPunto(texto, respaldo) {
    if (respaldo) return respaldo;
    if (texto && texto.trim() && texto !== 'Mi ubicación') {
      const g = await geocodificar(texto.trim());
      return { lat: g.lat, lng: g.lng };
    }
    if (estado.ubicacion) return estado.ubicacion;
    return Mapa.getCentro();
  }

  /* ------------------------------ reportes ------------------------------ */

  function renderLista(reportes) {
    el.listaReportes.innerHTML = '';

    if (!reportes || reportes.length === 0) {
      el.listaReportes.innerHTML = '<li class="vacio">Sin reportes por ahora.</li>';
      return;
    }

    for (const rep of reportes.slice(0, 20)) {
      const nivel = rep.nivel_peligro || 3;
      const li = document.createElement('li');
      li.innerHTML = `
        <div>
          <strong>${rep.tipo}</strong>
          <small>${rep.descripcion || 'Sin descripción'} · ${hace(rep.fecha_creacion)}</small>
        </div>
        <span class="nivel-tag n${nivel}">${nivel}</span>`;
      li.addEventListener('click', () => {
        Mapa.centrarEn(rep.lat, rep.lng, 17);
      });
      el.listaReportes.appendChild(li);
    }
  }

  async function cargarReportes(punto = null) {
    const p = punto || estado.ubicacion || Mapa.getCentro();
    const lista = await API.reportes({ lat: p.lat, lng: p.lng, radio: 2500 });
    Mapa.pintarReportes(lista);
    renderLista(lista);
    actualizarEstadoApi();
    return lista;
  }

  async function cargarTipos() {
    const tipos = await API.tipos();
    estado.tipos = tipos;
    el.tipoIncidente.innerHTML = '<option value="">Selecciona un tipo</option>';
    for (const t of tipos) {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.nombre;
      el.tipoIncidente.appendChild(opt);
    }
  }

  /* ------------------------------ ruta segura --------------------------- */

  async function calcularRuta() {
    el.btnRuta.disabled = true;
    el.btnRuta.textContent = 'Calculando…';

    try {
      const origen = await resolverPunto(el.origen.value, estado.ubicacion);
      const destino = await resolverPunto(el.destino.value, estado.puntoMapa);

      const ruta = await API.rutaSegura(origen, destino);

      Mapa.dibujarRuta(ruta);
      mostrarResultado(ruta);
      actualizarEstadoApi();
    } catch (err) {
      aviso(err.message || 'No se pudo calcular la ruta', 'error');
    } finally {
      el.btnRuta.disabled = false;
      el.btnRuta.textContent = 'Calcular ruta segura';
    }
  }

  function mostrarResultado(ruta) {
    el.resultado.classList.remove('oculto');
    el.rutaDistancia.textContent = fmtDistancia(ruta.distancia_metros);
    el.rutaTiempo.textContent = fmtTiempo(ruta.duracion_segundos);
    el.rutaRiesgo.textContent = `${ruta.nivel_riesgo}/5`;

    if (ruta.segura) {
      el.rutaVeredicto.className = 'veredicto segura';
      el.rutaVeredicto.textContent =
        'Ruta segura: no pasa cerca de zonas reportadas por la comunidad.';
      el.rutaAlertas.innerHTML = '';
    } else {
      el.rutaVeredicto.className = 'veredicto riesgo';
      el.rutaVeredicto.textContent =
        `Atención: la ruta pasa cerca de ${ruta.alertas.length} zona(s) de riesgo.`;

      el.rutaAlertas.innerHTML = '';
      for (const a of ruta.alertas) {
        const li = document.createElement('li');
        li.textContent = `${a.tipo} (nivel ${a.nivel_peligro}) a ${a.distancia_ruta} m de la ruta`;
        el.rutaAlertas.appendChild(li);
      }
    }
  }

  /* ------------------------------ reportar ------------------------------ */

  async function enviarReporte(evento) {
    evento.preventDefault();

    if (!el.tipoIncidente.value) {
      aviso('Selecciona el tipo de incidente', 'error');
      return;
    }

    const punto = estado.puntoMapa || estado.ubicacion;
    if (!punto) {
      aviso('Toca el mapa para marcar dónde ocurrió', 'error');
      return;
    }

    if (!API.token()) {
      abrirModal('login');
      aviso('Inicia sesión para enviar reportes');
      return;
    }

    const boton = el.formReporte.querySelector('button[type="submit"]');
    boton.disabled = true;
    boton.textContent = 'Enviando…';

    try {
      await API.crearReporte({
        tipo_incidente_id: Number(el.tipoIncidente.value),
        descripcion: el.descripcion.value.trim() || null,
        lat: punto.lat,
        lng: punto.lng,
        nivel_peligro: Number(el.nivelPeligro.value),
      });

      aviso('Reporte enviado. ¡Gracias por cuidar a la comunidad!', 'ok');
      el.formReporte.reset();
      el.nivelValor.textContent = '3';
      estado.puntoMapa = null;
      el.coordenadasReporte.textContent = 'Ubicación: sin fijar (toca el mapa).';

      await cargarReportes(punto);
    } catch (err) {
      aviso(err.message || 'No se pudo enviar el reporte', 'error');
    } finally {
      boton.disabled = false;
      boton.textContent = 'Enviar reporte';
    }
  }

  /* ------------------------------ sesión -------------------------------- */

  function abrirModal(tab = 'login') {
    el.modal.classList.remove('oculto');
    cambiarTab(tab);
    setTimeout(() => el.sesionCorreo.focus(), 60);
  }

  function cerrarModal() {
    el.modal.classList.add('oculto');
    el.sesionError.classList.add('oculto');
    el.formSesion.reset();
  }

  function cambiarTab(tab) {
    estado.tab = tab;
    el.tabs.forEach((b) => b.classList.toggle('activo', b.dataset.tab === tab));
    el.campoNombre.classList.toggle('oculto', tab !== 'registro');
    el.sesionNombre.required = tab === 'registro';
    el.sesionEnviar.textContent = tab === 'registro' ? 'Crear cuenta' : 'Entrar';
    el.sesionError.classList.add('oculto');
  }

  async function enviarSesion(evento) {
    evento.preventDefault();
    el.sesionError.classList.add('oculto');
    el.sesionEnviar.disabled = true;
    el.sesionEnviar.textContent = 'Procesando…';

    try {
      const correo = el.sesionCorreo.value.trim();
      const password = el.sesionPassword.value;

      if (estado.tab === 'registro') {
        await API.registro(el.sesionNombre.value.trim(), correo, password);
      } else {
        await API.login(correo, password);
      }

      cerrarModal();
      actualizarSesion();
      aviso(`Bienvenido, ${API.usuario()?.nombre || 'conductor'}`, 'ok');
      actualizarEstadoApi();
    } catch (err) {
      el.sesionError.textContent = err.message || 'No se pudo iniciar sesión';
      el.sesionError.classList.remove('oculto');
    } finally {
      el.sesionEnviar.disabled = false;
      el.sesionEnviar.textContent = estado.tab === 'registro' ? 'Crear cuenta' : 'Entrar';
    }
  }

  function actualizarSesion() {
    const u = API.usuario();
    el.btnSesion.textContent = u ? (u.nombre || 'Mi cuenta') : 'Iniciar sesión';

    if (u) {
      el.btnSesion.classList.remove('boton-primario');
      el.btnSesion.classList.add('boton-fantasma');
    } else {
      el.btnSesion.classList.add('boton-primario');
      el.btnSesion.classList.remove('boton-fantasma');
    }
  }

  function alTocarBotonSesion() {
    if (API.usuario()) {
      if (confirm('¿Cerrar sesión?')) {
        API.cerrarSesion();
        actualizarSesion();
        aviso('Sesión cerrada');
      }
    } else {
      abrirModal('login');
    }
  }

  /* ------------------------------ botón auxilio ------------------------- */

  function enviarAuxilio() {
    const punto = estado.ubicacion || Mapa.getCentro();
    aviso(
      `Alerta enviada a tus contactos con tu ubicación (${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)}) — demostración`,
      'error',
    );
    if (estado.ubicacion) Mapa.centrarEn(estado.ubicacion.lat, estado.ubicacion.lng, 17);
  }

  function tocarAuxilio() {
    if (estado.auxilioArmado) {
      clearInterval(estado.temporizadorAuxilio);
      estado.auxilioArmado = false;
      el.btnAuxilio.querySelector('span').textContent = '!';
      el.btnAuxilio.querySelector('em').textContent = 'Auxilio';
      aviso('Alerta cancelada');
      return;
    }

    estado.auxilioArmado = true;
    let segundos = 3;
    el.btnAuxilio.querySelector('span').textContent = segundos;
    el.btnAuxilio.querySelector('em').textContent = 'Cancelar';

    estado.temporizadorAuxilio = setInterval(() => {
      segundos -= 1;
      if (segundos > 0) {
        el.btnAuxilio.querySelector('span').textContent = segundos;
        return;
      }
      clearInterval(estado.temporizadorAuxilio);
      estado.auxilioArmado = false;
      el.btnAuxilio.querySelector('span').textContent = '!';
      el.btnAuxilio.querySelector('em').textContent = 'Auxilio';
      enviarAuxilio();
    }, 1000);
  }

  /* ------------------------------ estado API ---------------------------- */

  function actualizarEstadoApi() {
    const estadoApi = API.getEstado();

    if (estadoApi === 'vivo') {
      el.estadoApi.textContent = 'API conectada';
      el.estadoApi.className = 'pastilla pastilla-ok';
      el.modoDatos.textContent = 'Datos en vivo';
    } else if (estadoApi === 'demo') {
      el.estadoApi.textContent = 'Modo demostración';
      el.estadoApi.className = 'pastilla pastilla-demo';
      el.modoDatos.textContent = 'Datos de ejemplo';
    } else {
      el.estadoApi.textContent = 'Comprobando servicio…';
      el.estadoApi.className = 'pastilla pastilla-neutra';
    }
  }

  /* ------------------------------ eventos ------------------------------- */

  function conectarEventos() {
    // Chips
    el.chips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      el.chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('activo'));
      chip.classList.add('activo');
      Mapa.filtrar(chip.dataset.filtro);
    });

    // Ubicación
    el.btnUbicacion.addEventListener('click', usarMiUbicacion);
    el.btnOrigenUbicacion.addEventListener('click', async () => {
      const u = await usarMiUbicacion();
      if (u) el.origen.value = 'Mi ubicación';
    });

    // Ruta
    el.btnRuta.addEventListener('click', calcularRuta);
    el.btnIntercambiar.addEventListener('click', () => {
      const a = el.origen.value;
      el.origen.value = el.destino.value;
      el.destino.value = a;
    });

    // Mapa
    Mapa.alTocar((punto) => {
      estado.puntoMapa = punto;
      Mapa.marcarReporte(punto.lat, punto.lng);

      if (!el.destino.value.trim()) {
        el.destino.value = `Punto en el mapa (${punto.lat.toFixed(4)}, ${punto.lng.toFixed(4)})`;
      } else {
        el.destino.value = `Punto en el mapa (${punto.lat.toFixed(4)}, ${punto.lng.toFixed(4)})`;
      }

      el.coordenadasReporte.textContent =
        `Ubicación: ${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)}`;
    });

    // Reporte
    el.formReporte.addEventListener('submit', enviarReporte);
    el.nivelPeligro.addEventListener('input', () => {
      el.nivelValor.textContent = el.nivelPeligro.value;
    });

    // Sesión
    el.btnSesion.addEventListener('click', alTocarBotonSesion);
    el.modalCerrar.addEventListener('click', cerrarModal);
    el.modal.addEventListener('click', (e) => {
      if (e.target === el.modal) cerrarModal();
    });
    el.tabs.forEach((b) => b.addEventListener('click', () => cambiarTab(b.dataset.tab)));
    el.formSesion.addEventListener('submit', enviarSesion);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cerrarModal();
    });

    // Auxilio
    el.btnAuxilio.addEventListener('click', tocarAuxilio);
  }

  /* ------------------------------ arranque ------------------------------ */

  async function iniciar() {
    Mapa.crear();
    conectarEventos();
    actualizarSesion();

    const salud = await API.salud();
    actualizarEstadoApi();

    await cargarTipos();
    await cargarReportes();

    if (salud.enLinea) {
      aviso('Conectado a la API de PINPOINT GPS', 'ok');
    } else {
      aviso('API no disponible: mostrando datos de ejemplo. Levanta el backend para ver datos reales.');
    }

    // Intenta ubicar al usuario sin bloquear la carga.
    try {
      const u = await pedirUbicacion();
      estado.ubicacion = u;
      Mapa.marcarUsuario(u.lat, u.lng);
      el.origen.value = 'Mi ubicación';
      await cargarReportes(u);
    } catch {
      /* sin permiso de ubicación: se queda el centro por defecto */
    }
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
