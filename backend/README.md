# PINPOINT GPS — Backend

API REST del proyecto: autenticación, reportes ciudadanos de riesgo y cálculo de
**rutas seguras**. Node.js + Express sobre PostgreSQL/PostGIS en Supabase.

## Requisitos

- Node.js 18 o superior (usa `fetch` nativo)
- Un proyecto de Supabase con el esquema de [`../database/schema.sql`](../database/schema.sql)

## Instalación

```bash
cd backend
npm install
cp .env.example .env      # en Windows: copy .env.example .env
# edita .env con tus credenciales
npm run dev
```

El servidor queda en `http://localhost:3000`.

### Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (por defecto 3000) |
| `SUPABASE_URL` | URL del proyecto en Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo en el servidor, nunca en el frontend) |
| `JWT_SECRET` | Clave para firmar los tokens de sesión |
| `OSRM_URL` | Motor de ruteo (por defecto el servidor público de OSRM) |

## Endpoints

### Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/register` | Crea usuario. Body: `{ nombre, correo, password, telefono? }` |
| `POST` | `/api/auth/login` | Devuelve token. Body: `{ correo, password }` |

Las contraseñas se guardan con **bcrypt** (nunca en texto plano) y la sesión se
maneja con un **JWT** de 7 días. En las rutas protegidas se envía
`Authorization: Bearer <token>`.

### Reportes

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/reportes?lat=&lng=&radio=` | Reportes activos en un radio (metros). Sin coordenadas: últimos 100 |
| `POST` | `/api/reportes` | Crea un reporte (requiere sesión) |
| `POST` | `/api/reportes/:id/validar` | La comunidad confirma o desmiente (`{ es_util: true }`) |
| `GET` | `/api/reportes/tipos` | Catálogo de tipos de incidente |

```json
// POST /api/reportes
{
  "tipo_incidente_id": 2,
  "descripcion": "Hurto a un motociclista",
  "lat": 6.2442,
  "lng": -75.5812,
  "nivel_peligro": 4
}
```

### Rutas seguras

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/rutas/segura` | Calcula la ruta y evalúa el riesgo del trayecto |
| `GET` | `/api/rutas/historial` | Últimas rutas consultadas |

```json
// POST /api/rutas/segura
{
  "origen":  { "lat": 6.2442, "lng": -75.5812 },
  "destino": { "lat": 6.2650, "lng": -75.5900 }
}
```

Respuesta (resumida):

```json
{
  "motor": "OSRM",
  "distancia_metros": 3120,
  "duracion_segundos": 640,
  "segura": false,
  "nivel_riesgo": 5,
  "alertas": [
    { "id": 12, "tipo": "Robo a mano armada", "nivel_peligro": 5, "distancia_ruta": 84 }
  ],
  "coordenadas": [ { "lat": 6.2442, "lng": -75.5812 } ]
}
```

## Cómo se decide si una ruta es segura

1. Se pide la geometría al motor de ruteo (OSRM).
2. Se traen los reportes activos cercanos al corredor con `reportes_cercanos()`.
3. Cada reporte se compara contra los puntos de la ruta con la fórmula de
   Haversine; si pasa a menos de **150 m**, se marca como alerta.
4. `nivel_riesgo` es el máximo nivel de peligro de las alertas encontradas
   (0 = ninguna).

Si OSRM no responde, el servicio devuelve una ruta recta de respaldo para que la
app nunca se quede sin respuesta (se indica en `motor`).

## Estructura

```
backend/
├── package.json
├── .env.example
└── src/
    ├── server.js              # arranque de Express y montaje de rutas
    ├── config/supabase.js     # cliente de Supabase (service role)
    ├── middleware/auth.js     # firma y verificación de JWT
    ├── routes/
    │   ├── auth.js            # registro y login
    │   ├── reportes.js        # CRUD de reportes y validaciones
    │   └── rutas.js           # ruta segura e historial
    └── services/routing.js    # OSRM + evaluación de riesgo
```

## Autor

Oscar Reyes — Desarrollador Backend.
