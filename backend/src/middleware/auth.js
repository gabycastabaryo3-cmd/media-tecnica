import jwt from 'jsonwebtoken';

/** Firma un token de sesión válido por 7 días. */
export function firmarToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, correo: usuario.correo, nombre: usuario.nombre },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

/**
 * Middleware: exige el encabezado "Authorization: Bearer <token>".
 * Si el token es válido deja los datos del usuario en req.usuario.
 */
export function requiereAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token no enviado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.sub, correo: payload.correo, nombre: payload.nombre };
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/** Igual que requiereAuth, pero no bloquea si no hay token (rutas anónimas). */
export function authOpcional(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.usuario = { id: payload.sub, correo: payload.correo, nombre: payload.nombre };
    } catch {
      /* token inválido: se ignora y sigue como anónimo */
    }
  }
  return next();
}
