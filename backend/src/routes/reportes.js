import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requiereAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/reportes?lat=6.24&lng=-75.58&radio=500
 * Devuelve los reportes activos dentro de un radio (metros).
 * Sin coordenadas devuelve los últimos reportes activos.
 */
router.get('/', async (req, res, next) => {
  try {
    const { lat, lng, radio } = req.query;

    if (lat && lng) {
      const { data, error } = await supabase.rpc('reportes_cercanos', {
        lat: Number(lat),
        lng: Number(lng),
        radio_metros: Number(radio) || 500,
      });
      if (error) throw error;
      return res.json({ total: data.length, reportes: data });
    }

    const { data, error } = await supabase
      .from('reportes')
      .select(`
        id, descripcion, latitud, longitud, nivel_peligro, estado, fecha_creacion,
        tipos_incidente ( nombre ),
        usuarios ( nombre )
      `)
      .eq('estado', 'activo')
      .order('fecha_creacion', { ascending: false })
      .limit(100);

    if (error) throw error;
    return res.json({ total: data.length, reportes: data });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/reportes
 * Registra un reporte geolocalizado. Requiere sesión.
 * Body: { tipo_incidente_id, descripcion, lat, lng, nivel_peligro }
 */
router.post('/', requiereAuth, async (req, res, next) => {
  try {
    const { tipo_incidente_id, descripcion, lat, lng, nivel_peligro } = req.body || {};

    if (!tipo_incidente_id || lat == null || lng == null || !nivel_peligro) {
      return res.status(400).json({ error: 'Faltan tipo_incidente_id, lat, lng o nivel_peligro' });
    }
    if (nivel_peligro < 1 || nivel_peligro > 5) {
      return res.status(400).json({ error: 'nivel_peligro debe estar entre 1 y 5' });
    }

    // La función SQL arma la geometría (SRID 4326) a partir de lat/lng.
    const { data, error } = await supabase.rpc('crear_reporte', {
      p_usuario_id: req.usuario.id,
      p_tipo_incidente_id: Number(tipo_incidente_id),
      p_descripcion: descripcion || null,
      p_lat: Number(lat),
      p_lng: Number(lng),
      p_nivel_peligro: Number(nivel_peligro),
    });

    if (error) throw error;
    return res.status(201).json({ id: data, mensaje: 'Reporte registrado' });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/reportes/:id/validar
 * La comunidad confirma o desmiente un reporte (crowdsourcing).
 * Body: { es_util: true | false }
 */
router.post('/:id/validar', requiereAuth, async (req, res, next) => {
  try {
    const { es_util } = req.body || {};
    if (typeof es_util !== 'boolean') {
      return res.status(400).json({ error: 'es_util debe ser true o false' });
    }

    const { error } = await supabase.rpc('validar_reporte', {
      p_reporte_id: Number(req.params.id),
      p_usuario_id: req.usuario.id,
      p_es_util: es_util,
    });

    if (error) throw error;
    return res.json({ mensaje: 'Validación registrada' });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/reportes/tipos — catálogo para el formulario del frontend. */
router.get('/tipos', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('tipos_incidente')
      .select('id, nombre, nivel_peligro_base')
      .order('nivel_peligro_base', { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

export default router;
