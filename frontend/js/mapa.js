/* ==========================================================================
   PINPOINT GPS — mapa interactivo (Leaflet + OpenStreetMap)
   ========================================================================== */

const Mapa = (() => {
  const CENTRO = [6.2442, -75.5812]; // Medellín
  const COLORES = { 1: '#4caf50', 2: '#9ccc65', 3: '#f2a600', 4: '#f4702b', 5: '#d93025' };

  let mapa = null;
  let capaRiesgo = null;
  let capaRuta = null;
  let marcadorUsuario = null;
  let marcadorDestino = null;
  let marcadorReporte = null;

  let reportes = [];
  let filtro = 'todos';
  let alTocarMapa = null;

  /* ------------------------------- creación ----------------------------- */

  function crear() {
    mapa = L.map('mapa', {
      center: CENTRO,
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapa);

    capaRiesgo = L.layerGroup().addTo(mapa);
    capaRuta = L.layerGroup().addTo(mapa);

    mapa.on('click', (e) => {
      if (typeof alTocarMapa === 'function') {
        alTocarMapa({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    return mapa;
  }

  /* ------------------------------- reportes ----------------------------- */

  function coincide(rep, f) {
    if (f === 'todos') return true;
    const t = (rep.tipo || '').toLowerCase();
    if (f === 'hurto') return t.includes('hurto') || t.includes('robo');
    if (f === 'vehiculo') return t.includes('veh') || t.includes('moto') || t.includes('autom');
    if (f === 'oscuridad') return t.includes('oscura') || t.includes('desolada');
    if (f === 'orden') return t.includes('orden') || t.includes('riña');
    return true;
  }

  function popupReporte(rep) {
    const nivel = rep.nivel_peligro || 3;
    const hora = new Date(rep.fecha_creacion).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `
      <div style="font-family:inherit;min-width:170px">
        <strong style="color:${COLORES[nivel]}">${rep.tipo}</strong><br>
        ${rep.descripcion ? `<span>${rep.descripcion}</span><br>` : ''}
        <small style="color:#5f6368">Nivel ${nivel}/5 · ${hora}</small>
      </div>`;
  }

  function pintarReportes(lista) {
    reportes = lista || [];
    capaRiesgo.clearLayers();

    for (const rep of reportes) {
      if (!coincide(rep, filtro)) continue;
      if (!Number.isFinite(rep.lat) || !Number.isFinite(rep.lng)) continue;

      const nivel = rep.nivel_peligro || 3;
      const color = COLORES[nivel] || COLORES[3];

      // Halo de la zona de riesgo
      L.circle([rep.lat, rep.lng], {
        radius: 90 + nivel * 35,
        color,
        weight: 1,
        opacity: 0.45,
        fillColor: color,
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(capaRiesgo);

      // Punto del incidente
      L.circleMarker([rep.lat, rep.lng], {
        radius: 6 + nivel,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
        className: 'marcador-riesgo',
      })
        .bindPopup(popupReporte(rep))
        .addTo(capaRiesgo);
    }
  }

  function filtrar(f) {
    filtro = f;
    pintarReportes(reportes);
  }

  function getReportes() {
    return reportes;
  }

  /* -------------------------------- ruta -------------------------------- */

  function limpiarRuta() {
    capaRuta.clearLayers();
    marcadorDestino = null;
  }

  function dibujarRuta(ruta) {
    limpiarRuta();
    if (!ruta || !ruta.coordenadas || ruta.coordenadas.length === 0) return;

    const nivel = ruta.nivel_riesgo || 0;
    const color = nivel === 0 ? '#38aa00' : COLORES[nivel] || COLORES[3];
    const puntos = ruta.coordenadas.map((p) => [p.lat, p.lng]);

    // Sombra de la ruta para que resalte sobre el mapa
    L.polyline(puntos, { color: '#ffffff', weight: 10, opacity: 0.7 }).addTo(capaRuta);

    const linea = L.polyline(puntos, {
      color,
      weight: 6,
      opacity: 0.95,
      lineJoin: 'round',
      dashArray: ruta.segura ? null : '1 0',
    }).addTo(capaRuta);

    const inicio = puntos[0];
    const fin = puntos[puntos.length - 1];

    L.circleMarker(inicio, {
      radius: 7, color: '#ffffff', weight: 2,
      fillColor: '#1a73e8', fillOpacity: 1,
    }).bindPopup('Origen').addTo(capaRuta);

    marcadorDestino = L.circleMarker(fin, {
      radius: 8, color: '#ffffff', weight: 2,
      fillColor: '#1d1d1f', fillOpacity: 1,
    }).bindPopup('Destino').addTo(capaRuta);

    linea.bindPopup(
      `<strong style="color:${color}">${ruta.segura ? 'Ruta segura' : 'Ruta con alertas'}</strong><br>
       ${(ruta.distancia_metros / 1000).toFixed(1)} km ·
       ${Math.round(ruta.duracion_segundos / 60)} min ·
       riesgo ${nivel}/5`,
    );

    mapa.fitBounds(L.latLngBounds(puntos), { padding: [40, 40] });
  }

  /* ------------------------------ ubicación ----------------------------- */

  function marcarUsuario(lat, lng) {
    if (marcadorUsuario) mapa.removeLayer(marcadorUsuario);

    marcadorUsuario = L.circleMarker([lat, lng], {
      radius: 8, color: '#ffffff', weight: 3,
      fillColor: '#1a73e8', fillOpacity: 1,
      className: 'marcador-usuario',
    })
      .bindPopup('Estás aquí')
      .addTo(mapa);

    return marcadorUsuario;
  }

  /** Pin temporal donde el usuario toca para reportar o fijar destino. */
  function marcarReporte(lat, lng) {
    if (marcadorReporte) mapa.removeLayer(marcadorReporte);

    marcadorReporte = L.circleMarker([lat, lng], {
      radius: 9, color: '#ffffff', weight: 3,
      fillColor: '#38aa00', fillOpacity: 1,
    })
      .bindPopup('Punto seleccionado')
      .addTo(mapa);

    return marcadorReporte;
  }

  function centrarEn(lat, lng, zoom = 16) {
    mapa.setView([lat, lng], zoom);
  }

  function encuadrarPuntos(puntos) {
    if (!puntos || puntos.length === 0) return;
    mapa.fitBounds(L.latLngBounds(puntos.map((p) => [p.lat, p.lng])), { padding: [50, 50] });
  }

  function getCentro() {
    const c = mapa.getCenter();
    return { lat: c.lat, lng: c.lng };
  }

  function alTocar(cb) {
    alTocarMapa = cb;
  }

  return {
    crear,
    pintarReportes,
    filtrar,
    getReportes,
    dibujarRuta,
    limpiarRuta,
    marcarUsuario,
    marcarReporte,
    centrarEn,
    encuadrarPuntos,
    getCentro,
    alTocar,
  };
})();
