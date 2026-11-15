# PINPOINT GPS — Guion de exposición (10 diapositivas)

**Archivo:** `PINPOINT GPS - EXPOSICION FINAL.pptx` — **10 diapositivas**, mismo diseño SENA.
La versión larga quedó guardada como `PINPOINT GPS - version larga (22 diap).pptx` por si la necesitas.
El archivo original que enviaste no se tocó.

Duración estimada: **6–7 minutos**.

---

## Recorrido diapositiva por diapositiva

| # | Diapositiva | Qué dices | Tiempo |
|---|---|---|---|
| 1 | Portada | "Somos PINPOINT GPS, cinco aprendices de Programación de Software de la ficha 3441673. Nuestro eslogan: guiamos tu viaje con seguridad." | 20 s |
| 2 | Problema y solución | "Moverse en la ciudad implica riesgo de hurto, y los GPS actuales te llevan por la ruta más rápida, no por la más segura. Nosotros invertimos la prioridad: ruta segura, mapa de zonas de riesgo, reportes ciudadanos y botón de auxilio." | 60 s |
| 3 | Justificación y valor agregado | "La gente ya no pregunta cuál es la ruta corta, pregunta por dónde es más seguro, y ninguna app popular responde eso." | 45 s |
| 4 | Objetivo general | Lee el objetivo completo una vez. Luego: "Y eso se baja en cuatro frentes: tecnológico, social, económico y ambiental." | 50 s |
| 5 | **Misión y visión** | Ver sección 1. | 60 s |
| 6 | Competencias | "Dos competencias sostienen el proyecto: construir la interfaz y desarrollar la lógica de negocio con los datos." | 35 s |
| 7 | Impacto social y ambiental | Ver sección 2. | 45 s |
| 8 | Avances: bitácora y repositorio | "Vamos en la bitácora 7; de la 1 a la 6 están entregadas. El código está en GitHub con ramas por área." | 35 s |
| 9 | Avances: frontend y tecnologías | "Así se ve la app: mapa con zonas de riesgo, ruta segura, reportes, login y botón de auxilio." | 45 s |
| 10 | Avances: base de datos y DER | "La base de datos la diseñé e implementé yo." (dilo con seguridad, es tu parte) + señala el diagrama y nombra las 4 relaciones. | 60 s |

---

## 1. Misión y visión (lo que te asignaron)

**Misión:**
> Construir el futuro de la movilidad urbana transformando el miedo en tranquilidad, conectando a las personas con rutas inteligentes que garantizan su libertad y seguridad en cada trayecto.

**Visión:**
> Ser la plataforma líder a nivel nacional que redefina el estándar de la movilidad inteligente, convirtiendo cualquier ciudad del mundo en un territorio seguro donde las personas transiten sin miedo.

**Cómo decirlo (no leer la diapositiva):**
"La misión responde **qué hacemos y para quién**: no vendemos mapas, vendemos tranquilidad; nuestro
negocio no es el GPS, es que la gente deje de tener miedo al salir. La visión responde **dónde
queremos estar**: no queremos ser otra app de mapas en Medellín, queremos que la ruta segura sea el
estándar."

**Si preguntan la diferencia:** "La misión es el presente, lo que hacemos todos los días. La visión
es el futuro, la imagen de la empresa en unos años."

Punto extra: ambas son coherentes con el nombre (*Pinpoint* = señalar con precisión) y con el eslogan,
que es la misión resumida en una frase.

---

## 2. Impacto social y ambiental

**Social:** devuelve la tranquilidad (la seguridad deja de depender de la suerte o de conocer el
barrio), convierte a la comunidad en una red de cuidado mediante reportes, y protege a los más
expuestos: motociclistas, transportadores y trabajadores nocturnos.

**Ambiental:** rutas más fluidas significan menos tiempo de motor encendido y menos emisiones; menos
desvíos significan menos kilómetros. Además es 100 % digital: usa el celular que la persona ya tiene,
sin hardware ni residuos.

**Económico (si preguntan):** evita pérdidas por hurto y ahorra combustible.

---

## 3. Avances (lo que vas a mostrar)

**Bitácora:** 1 a 5 entregadas en Territorium (identificación, plataforma estratégica,
valores/organigrama, manual de funciones y DOFA, análisis de mercado). La 6, análisis de la
competencia con el cuadro de tres competidores, lista. La 7 va en proceso.

**Repositorio:** GitHub con ramas `main`, `frontend`, `backend` y `database`; Pull Requests revisados
por la líder.

**Frontend:** mapa con las zonas de riesgo por color, cálculo de ruta segura con resumen de riesgo,
formulario de reportes, login y botón de auxilio. Si el backend no está corriendo, la app entra en
modo demostración con datos de ejemplo, así se puede mostrar sin depender del servidor.

**Tecnologías:** HTML, CSS, JavaScript y Leaflet.js sobre OpenStreetMap; Node.js + Express en el
backend; PostgreSQL + PostGIS en Supabase para los datos.

**Base de datos (tu parte, dilo con seguridad):**
"La diseñé e implementé yo. PostgreSQL con PostGIS en Supabase: cinco entidades
(`usuarios`, `tipos_incidente`, `reportes`, `reporte_validaciones`, `rutas_consultadas`), con columnas
de geometría `Point` y `LineString` en SRID 4326 para medir distancias reales, y un índice espacial
GiST para consultas del tipo *reportes en un radio de 500 metros*."

**DER:** la diapositiva 10 lo muestra como **imagen** (exportada del archivo
`Diagrama sin título.drawio` que está en Drive; copia en `docs/DER.png` del repositorio).
Al explicarlo, ve señalando las relaciones:
- `usuarios` **1:N** `reportes` (cada reporte tiene un autor)
- `tipos_incidente` **1:N** `reportes` (catálogo que normaliza las categorías)
- `usuarios` **N:M** `reportes` vía `reporte_validaciones` (la comunidad confirma o desmiente)
- `usuarios` **0..1:N** `rutas_consultadas` (historial, puede ser anónimo)

---

## 4. Lo que advirtió Regino (te lo van a preguntar)

**"¿Qué hace el backend?"**
"Es la parte que el usuario no ve: el servidor. Recibe las peticiones, valida quién es el usuario,
aplica las reglas del negocio —por ejemplo calcular si una ruta pasa cerca de una zona reportada— y
guarda o consulta los datos. Las reglas viven en el servidor, no en la app."

**"¿Qué hace el frontend?"**
"Es lo que el usuario ve y toca: pantallas, mapa, botones, formularios. Muestra los datos y captura
lo que la persona hace. No guarda nada por sí solo: todo se lo pide al backend."

**"¿Qué son las APIs?"**
"El puente entre los dos. Es un conjunto de direcciones (endpoints) donde el frontend pide y el
backend responde, normalmente en JSON. Ejemplo de nuestro proyecto: `POST /api/reportes` para crear
un reporte, y `GET /api/reportes?lat=..&lng=..&radio=500` para traer los peligros cercanos. También
usamos APIs de terceros: el motor de ruteo (OSRM/Mapbox) y la geolocalización del navegador."

**Frase de cierre si te presionan:**
> "Frontend es lo que se ve, backend es lo que se decide, y la API es cómo se hablan."

### Preguntas probables
| Pregunta | Respuesta de una línea |
|---|---|
| ¿Por qué Supabase y no SQLite? | "Necesitábamos consultas geográficas —'reportes en 500 m a la redonda'— y eso es PostGIS." |
| ¿Y si alguien reporta algo falso? | "`reporte_validaciones`: la comunidad confirma o desmiente, y la reputación del usuario baja." |
| ¿Cómo protegen los datos? | "Contraseñas con hash, tokens de sesión y la ubicación solo se comparte si el usuario la activa." |
| ¿Cómo calculan la ruta segura? | "Pedimos la ruta al motor de ruteo y la cruzamos contra los reportes activos: si pasa cerca de una alerta, la marcamos en rojo o proponemos otra." |
| ¿Ya funciona? | Sé honesto: di exactamente qué está hecho y qué falta. |

---

## 5. Antes de exponer

1. **Practica una vez en voz alta con cronómetro.** Lee solo los títulos; el resto lo explicas.
2. **Muestra capturas reales**: pantallas del frontend, tablas de Supabase y el DER. No abras el
   dashboard de Supabase en vivo (expone tu sesión).
3. **Repositorio de GitHub**: ya está creado y con el código de las tres capas.
   Enlace: `github.com/gabycastabaryo3-cmd/media-tecnica`.
4. **Reparte las diapositivas** entre los cinco y define quién contesta qué. Tú contestas backend,
   base de datos y API.
