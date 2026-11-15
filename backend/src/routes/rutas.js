import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { authOpcional } from '../middleware/auth.js';
import { calcularRutaSegura, distanciaMetros } from '../services/routing.js';

const router = Router();

/**
 * POST /api/rutas/segura
 * Body: { origen: {lat, lng}, destino: {lat, lng} }
 *
 * Calcula la ruta, la cruza con los reportes de riesgo activos y la guarda
 * en el historial (rutas_consultadas). Funciona con o sin sesión.
 */
router.post('/segura', authOpcional, async (req, res, next) => {
  try {
    const { origen, destino } = req.body || {};

    if (!origen?.lat || !origen?.lng || !destino?.lat || !destino?.lng) {
      return res.status(400).json({
        error: 'Se requieren origen y destino con lat y lng',
      });
    }

    const o = { lat: Number(origen.lat), lng: Number(origen.lng) };
    const d = { lat: Number(destino.lat), lng: Number(destino.lng) };

    // 1. Traer los reportes activos que puedan afectar el corredor.
    //    Se consulta un radio amplio alrededor del punto medio.
    const medio = { lat: (o.lat + d.lat) / 2, lng: (o.lng + d.lng) / 2 };
    const radio = Math.max(
      1000,
      Math.round(distanciaMetros(o.lat, o.lng, d.lat, d.lng) / 2 + 1000),
    );

    const { data: cercanos, error: errRep } = await supabase.rpc('reportes_cercanos', {
      lat: medio.lat,
      lng: medio.lng,
      radio_metros: radio,
    });
    if (errRep) throw errRep;

    // 2. Calcular la ruta y evaluar el riesgo.
    const resultado = await calcularRutaSegura(o, d, cercanos || []);

    // 3. Guardar en el historial (si falla, no se rompe la respuesta).
    try {
      const linea = resultado.coordenadas.map((p) => `${p.lng} ${p.lat}`).join(', ');
      const { error } = await supabase.rpc('guardar_ruta_consultada', {
        p_usuario_id: req.usuario?.id ?? null,
        p_origen_lat: o.lat,
        p_origen_lng: o.lng,
        p_destino_lat: d.lat,
        p_destino_lng: d.lng,
        p_linea_wkt: `LINESTRING(${linea})`,
        p_distancia_metros: resultado.distancia_metros,
        p_tiempo_segundos: resultado.duracion_segundos,
      });
      if (error) console.warn('[rutas] no se guardó el historial:', error.message);
    } catch (e) {
      console.warn('[rutas] historial:', e.message);
    }

    return res.json(resultado);
  } catch (err) {
    return next(err);
  }
});

/** GET /api/rutas/historial — últimas rutas del usuario autenticado. */
router.get('/historial', authOpcional, async (req, res, next) => {
  try {
    let query = supabase
      .from('rutas_consultadas')
      .select('id, distancia_metros, tiempo_estimado_segundos, fecha_consulta')
      .order('fecha_consulta', { ascending: false })
      .limit(20);

    if (req.usuario) query = query.eq('usuario_id', req.usuario.id);

    const { data, error } = await query;
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

export default router;
