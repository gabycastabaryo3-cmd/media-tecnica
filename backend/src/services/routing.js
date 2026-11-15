/**
 * Motor de rutas seguras de PINPOINT GPS.
 *
 * 1. Le pide la ruta al motor de ruteo (OSRM) entre origen y destino.
 * 2. Cruza la geometría de la ruta contra los reportes de riesgo activos.
 * 3. Devuelve la ruta junto con el nivel de riesgo encontrado.
 *
 * Si el motor de ruteo no responde, se usa una ruta recta como respaldo
 * para que la app nunca se quede sin respuesta.
 */

const OSRM_URL = process.env.OSRM_URL || 'https://router.project-osrm.org';

/** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Pide a OSRM la ruta y devuelve { coordenadas, distancia, duracion }. */
async function pedirRutaOSRM(origen, destino) {
  const coords = `${origen.lng},${origen.lat};${destino.lng},${destino.lat}`;
  const url = `${OSRM_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`OSRM respondió ${resp.status}`);

  const datos = await resp.json();
  if (!datos.routes || datos.routes.length === 0) {
    throw new Error('OSRM no encontró una ruta');
  }

  const ruta = datos.routes[0];
  return {
    // OSRM entrega [lng, lat]; Leaflet necesita [lat, lng].
    coordenadas: ruta.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distancia: ruta.distance,
    duracion: ruta.duration,
  };
}

/** Ruta recta de respaldo cuando el motor de ruteo falla. */
function rutaRecta(origen, destino) {
  const pasos = 20;
  const coordenadas = [];
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    coordenadas.push({
      lat: origen.lat + (destino.lat - origen.lat) * t,
      lng: origen.lng + (destino.lng - origen.lng) * t,
    });
  }
  const distancia = distanciaMetros(origen.lat, origen.lng, destino.lat, destino.lng);
  return { coordenadas, distancia, duracion: (distancia / 1000 / 30) * 3600 };
}

/**
 * Evalúa cuántos reportes de riesgo quedan cerca de la ruta.
 * @param {Array<{lat:number,lng:number}>} coordenadas
 * @param {Array<{lat:number,lng:number,nivel_peligro:number,tipo:string}>} reportes
 * @param {number} umbralMetros distancia a la que se considera "pasa cerca"
 */
export function evaluarRiesgo(coordenadas, reportes, umbralMetros = 150) {
  const alertas = [];

  for (const rep of reportes) {
    let minimo = Infinity;
    for (const punto of coordenadas) {
      const d = distanciaMetros(punto.lat, punto.lng, rep.lat, rep.lng);
      if (d < minimo) minimo = d;
      if (minimo <= umbralMetros) break;
    }
    if (minimo <= umbralMetros) {
      alertas.push({ ...rep, distancia_ruta: Math.round(minimo) });
    }
  }

  const nivel = alertas.reduce((max, a) => Math.max(max, a.nivel_peligro || 0), 0);

  return {
    segura: alertas.length === 0,
    nivel_riesgo: nivel, // 0 = sin reportes cerca, 5 = peligro alto
    alertas: alertas.sort((a, b) => b.nivel_peligro - a.nivel_peligro),
  };
}

/**
 * Calcula la ruta segura completa.
 * @param {{lat:number,lng:number}} origen
 * @param {{lat:number,lng:number}} destino
 * @param {Array} reportes reportes activos cercanos al corredor
 */
export async function calcularRutaSegura(origen, destino, reportes = []) {
  let ruta;
  let motor = 'OSRM';

  try {
    ruta = await pedirRutaOSRM(origen, destino);
  } catch (err) {
    console.warn('[routing] OSRM falló, se usa ruta recta:', err.message);
    ruta = rutaRecta(origen, destino);
    motor = 'respaldo-lineal';
  }

  const riesgo = evaluarRiesgo(ruta.coordenadas, reportes);

  return {
    origen,
    destino,
    motor,
    distancia_metros: Math.round(ruta.distancia),
    duracion_segundos: Math.round(ruta.duracion),
    coordenadas: ruta.coordenadas,
    ...riesgo,
  };
}

export { distanciaMetros };
