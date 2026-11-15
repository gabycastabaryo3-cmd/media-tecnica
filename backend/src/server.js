import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import reportesRoutes from './routes/reportes.js';
import rutasRoutes from './routes/rutas.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Registro simple de peticiones
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.originalUrl}`);
  next();
});

// --- Rutas de la API ---
app.use('/api/auth', authRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/rutas', rutasRoutes);

app.get('/health', (_req, res) => {
  res.json({
    estado: 'ok',
    servicio: 'PINPOINT GPS API',
    version: '1.0.0',
    hora: new Date().toISOString(),
  });
});

app.get('/', (_req, res) => {
  res.json({
    nombre: 'PINPOINT GPS API',
    descripcion: 'Navegación GPS que prioriza la seguridad sobre la velocidad',
    endpoints: {
      auth: ['POST /api/auth/register', 'POST /api/auth/login'],
      reportes: [
        'GET /api/reportes?lat=&lng=&radio=',
        'POST /api/reportes',
        'POST /api/reportes/:id/validar',
        'GET /api/reportes/tipos',
      ],
      rutas: ['POST /api/rutas/segura', 'GET /api/rutas/historial'],
      salud: ['GET /health'],
    },
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Manejador de errores
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

app.listen(PORT, () => {
  console.log(`PINPOINT GPS API escuchando en http://localhost:${PORT}`);
});

export default app;
