import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { firmarToken } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/register
 * Crea un usuario y devuelve el token de sesión.
 */
router.post('/register', async (req, res, next) => {
  try {
    const { nombre, correo, password, telefono } = req.body || {};

    if (!nombre || !correo || !password) {
      return res.status(400).json({ error: 'nombre, correo y password son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const { data: existe } = await supabase
      .from('usuarios')
      .select('id')
      .eq('correo', correo.toLowerCase())
      .maybeSingle();

    if (existe) {
      return res.status(409).json({ error: 'Ese correo ya está registrado' });
    }

    // Nunca se guarda la contraseña en texto plano: solo el hash.
    const password_hash = await bcrypt.hash(password, 10);

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .insert({
        nombre,
        correo: correo.toLowerCase(),
        telefono: telefono || null,
        password_hash,
      })
      .select('id, nombre, correo, reputacion, fecha_registro')
      .single();

    if (error) throw error;

    return res.status(201).json({ usuario, token: firmarToken(usuario) });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/auth/login
 * Valida credenciales y devuelve el token.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { correo, password } = req.body || {};

    if (!correo || !password) {
      return res.status(400).json({ error: 'correo y password son obligatorios' });
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, password_hash, reputacion, estado')
      .eq('correo', correo.toLowerCase())
      .maybeSingle();

    if (error || !usuario) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    if (usuario.estado === 'suspendido_por_spam') {
      return res.status(403).json({ error: 'Cuenta suspendida por reportes falsos' });
    }

    const ok = await bcrypt.compare(password, usuario.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    delete usuario.password_hash;
    return res.json({ usuario, token: firmarToken(usuario) });
  } catch (err) {
    return next(err);
  }
});

export default router;
