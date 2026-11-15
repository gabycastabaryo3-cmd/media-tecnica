# PINPOINT GPS

> Guiamos tu viaje con seguridad.

Plataforma de navegación GPS que prioriza la **seguridad** sobre la velocidad: calcula rutas que
evitan zonas de alto riesgo delictivo, usando reportes ciudadanos en tiempo real.

Proyecto de la Media Técnica en **Programación de Software** — I.E. ICOLVEN, ficha **3441673**,
articulado con el **SENA** (Regional Antioquia).

---

## Problema

Los navegadores actuales optimizan tiempo y distancia, no seguridad: pueden llevar al usuario por la
ruta más rápida aunque cruce una zona peligrosa. No existe una forma sencilla de saber por dónde **no**
transitar ni de avisar a alguien si algo ocurre.

## Solución

- **Ruta segura:** el trayecto evita las zonas de riesgo reportadas.
- **Mapa de riesgo:** zonas marcadas por color y nivel de peligro.
- **Reportes ciudadanos (crowdsourcing):** la comunidad reporta y valida incidentes.
- **Botón de auxilio** y ubicación compartida con la familia.

---

## Equipo y roles

| Integrante | Rol |
|---|---|
| Gabriela Castaño | Líder del proyecto (CEO) |
| Oscar Reyes | Desarrollador Backend |
| Haday Rodríguez | Desarrolladora Backend y Datos |
| José Daniel Agudelo | Desarrollador Frontend |
| Salomé Cano | Analista de datos, UI/UX y Ciberseguridad |

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML, CSS, JavaScript, Leaflet.js |
| Mapas | OpenStreetMap |
| Backend / API | Node.js + Express |
| Base de datos | PostgreSQL + PostGIS (Supabase) |

---

## Estructura del repositorio

| Rama | Contenido |
|---|---|
| `main` | Documentación, esquema de base de datos y diagrama entidad-relación |
| `backend` | API REST (autenticación, reportes, motor de ruteo) |
| `frontend` | Mapa interactivo, pantallas y formularios |
| `database` | Scripts SQL y migraciones |

Cada integrante trabaja en su rama e integra sus cambios mediante **Pull Requests** revisados por la
líder del proyecto.

## Base de datos

- [`database/schema.sql`](database/schema.sql) — creación de las 5 tablas, índice espacial GiST y
  funciones `reportes_cercanos()`, `crear_reporte()`, `validar_reporte()` y `guardar_ruta_consultada()`.
- [`docs/ERD.md`](docs/ERD.md) y [`docs/DER.png`](docs/DER.png) — diagrama entidad-relación.

Entidades: `usuarios`, `tipos_incidente`, `reportes`, `reporte_validaciones`, `rutas_consultadas`.

## Cómo ejecutarlo

1. **Base de datos:** ejecutar `database/schema.sql` en el SQL Editor de Supabase.
2. **Backend:** `cd backend && npm install && npm run dev` (ver [`backend/README.md`](backend/README.md)).
3. **Frontend:** `python -m http.server 8080 --directory frontend` y abrir <http://localhost:8080>
   (ver [`frontend/README.md`](frontend/README.md)). Sin backend, la app funciona con datos de ejemplo.

---

## Estado del proyecto

| Bitácora | Tema | Estado |
|---|---|---|
| 1 | Identificación del proyecto | Entregada |
| 2 | Plataforma estratégica (objetivos, misión, visión) | Entregada |
| 3 | Valores, organigrama, logo y eslogan | Entregada |
| 4 | Manual de funciones, reglamento y DOFA | Entregada |
| 5 | Análisis de mercado | Entregada |
| 6 | Análisis de la competencia | Entregada |
| 7 | Estrategias de producto, precio y distribución | En proceso |

## Documentación

- [`docs/presentacion.pptx`](docs/presentacion.pptx) — presentación (10 diapositivas, plantilla SENA).
- [`docs/guion-exposicion.md`](docs/guion-exposicion.md) — guion general de la exposición.
- [`docs/guion-oscar.md`](docs/guion-oscar.md) — guion personal del expositor de backend.
