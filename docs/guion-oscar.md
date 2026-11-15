# Guion de Oscar — PINPOINT GPS

**Tu parte:** backend y base de datos. Diapositivas **8, 9 y 10** (≈ 3 minutos) + las preguntas técnicas.
Si tu equipo reparte distinto, salta a la sección **"Solo la 10"**: es tu diapositiva fuerte y con eso alcanza.

---

## Antes de empezar (2 minutos antes)

- [ ] Presentación abierta en **modo presentador** (ves la siguiente diapositiva y el tiempo).
- [ ] Pestaña del repositorio abierta: `github.com/gabycastabaryo3-cmd/media-tecnica`.
- [ ] App abierta en otra pestaña (`localhost:8080`) **o** capturas guardadas por si falla el internet.
- [ ] Probar una vez el botón **"Calcular ruta segura"** antes de exponer.

Regla de oro: **no leas la diapositiva**. La diapositiva tiene 3 o 4 palabras; tú pones la explicación.

---

## Diapositiva 8 — Bitácora y repositorio (≈ 40 s)

> "En avances: las bitácoras **1 a 5** ya están entregadas en Territorium, la **6**, que es el análisis
> de la competencia, está lista, y la **7**, de estrategias de mercadeo, va en proceso.
>
> El código está en GitHub con una rama por área: **main, frontend, backend y database**. Cada cambio
> entra por *Pull Request* y lo revisa Gabriela, que es la líder."

*(Señala el enlace de la diapositiva; no lo leas completo.)*

## Diapositiva 9 — Frontend y tecnologías (≈ 40 s)

> "El frontend ya está montado: **mapa con las zonas de riesgo por color**, cálculo de **ruta segura**,
> **reporte de incidentes**, login y **botón de auxilio**.
>
> La interfaz es HTML, CSS y JavaScript con **Leaflet** sobre **OpenStreetMap**. La API es **Node.js
> con Express**, y los datos están en **PostgreSQL con PostGIS, en Supabase**."

## Diapositiva 10 — Base de datos y DER (≈ 70 s) ← **tu diapositiva**

> "Esta parte **la diseñé e implementé yo**, como responsable del backend.
>
> La base está en **PostgreSQL con la extensión PostGIS**, en Supabase. Son **cinco entidades**:
> usuarios, tipos_incidente, reportes, reporte_validaciones y rutas_consultadas.
>
> Lo importante no es que guarde datos, es **cómo** los guarda: un reporte no guarda solo latitud y
> longitud, guarda una **geometría Point en SRID 4326**, y las rutas una **LineString**. Eso permite
> preguntarle al servidor *«qué reportes hay en un radio de 500 metros»* y que responda con un
> **índice espacial GiST**, sin recorrer toda la tabla.
>
> Y estas son las relaciones: un **usuario** hace muchos **reportes**; un **tipo de incidente**
> clasifica muchos reportes; usuarios y reportes se relacionan **muchos a muchos** a través de
> **reporte_validaciones**, que es lo que permite que la comunidad confirme o desmienta un reporte; y
> **rutas_consultadas** guarda el historial, que puede quedar anónimo."

**Cierre de tu bloque:**

> "Con eso el proyecto queda con las tres capas completas: interfaz, API y base de datos con
> información geográfica real."

---

## Si solo te toca la diapositiva 10 (1 minuto)

Di exactamente esto, sin adornos:

1. "La base la diseñé e implementé yo."
2. "PostgreSQL + PostGIS en Supabase, cinco entidades."
3. "Guarda geometrías Point y LineString para medir distancias reales."
4. "Índice GiST para consultas por radio."
5. "Relaciones 1:N y N:M: la comunidad valida cada reporte."
6. "Aquí está el diagrama completo."

---

## Preguntas que te van a hacer

| Pregunta | Tu respuesta (corta) |
|---|---|
| ¿Qué es PostGIS? | "Una extensión de PostgreSQL que entiende geometrías: distancias, radios e intersecciones." |
| ¿Por qué no SQLite? | "Porque necesitábamos consultas por distancia —reportes a 500 m— y eso lo resuelve PostGIS." |
| ¿Qué es el SRID 4326? | "El sistema de coordenadas del GPS, el mismo que usan Google Maps y OpenStreetMap." |
| ¿Qué es el índice GiST? | "Un índice para datos espaciales. Sin él, cada consulta por radio recorrería toda la tabla." |
| ¿Qué hace el backend? | "Es el servidor: recibe la petición, valida quién es el usuario, aplica las reglas —como calcular si la ruta pasa cerca de un reporte— y guarda o consulta los datos." |
| ¿Qué es una API? | "El puente entre frontend y backend: direcciones donde uno pide y el otro responde en JSON. Ejemplo: `POST /api/reportes` y `GET /api/reportes?lat=..&lng=..&radio=500`." |
| ¿Cómo calculan la ruta segura? | "Pedimos la ruta al motor de ruteo, la cruzamos contra los reportes activos y, si pasa a menos de 150 m de uno, la marcamos con su nivel de riesgo." |
| ¿Y si alguien reporta algo falso? | "Cada usuario vota una sola vez por reporte; la reputación sube o baja, y con 5 validaciones negativas el reporte se archiva automáticamente." |
| ¿Cómo protegen las contraseñas? | "Se guardan con hash (bcrypt), nunca en texto plano, y la sesión usa un token firmado." |
| ¿Ya funciona? | Di la verdad, sin exagerar: "El mapa, la ruta y los reportes funcionan; falta cargar los datos reales en Supabase y pulir el diseño." |

**Frase de cierre si insisten con la diferencia frontend/backend:**

> "Frontend es lo que se ve, backend es lo que se decide, y la API es cómo se hablan."

---

## Frases de emergencia

- **Si te quedas en blanco:** "En resumen: la base guarda el peligro como un punto en el mapa y el backend lo consulta por distancia."
- **Si no sabes algo:** "Eso no lo alcanzamos a implementar; está como siguiente paso del proyecto." **No inventes.**
- **Si te piden mostrar la app y falla:** "La app consume una API; si no hay servidor, entra en modo demostración con datos de ejemplo" — y muestras las zonas de riesgo igual.

## Qué NO decir

- ❌ **"SQLite"** — la base es PostgreSQL. Fue un error de una versión vieja de la presentación.
- ❌ "Eso lo hizo otro, no sé" → ✅ "Esa parte la lidera *X*; el backend se conecta así…"
- ❌ Prometer lo que no existe (pagos, login con Google/Apple, reconocimiento de voz) como si ya estuviera hecho. Si sale, di que está **diseñado** para una siguiente fase.

---

## Si te toca presentar todo (plan B, 60 segundos)

> "PINPOINT GPS es una app de navegación que prioriza la seguridad sobre la velocidad: en vez de
> llevarte por la ruta más rápida, te lleva por la más segura. La comunidad reporta robos y zonas
> peligrosas, y esos reportes se guardan como puntos geográficos en PostgreSQL con PostGIS. Cuando
> pides una ruta, el backend la cruza contra esos reportes y te avisa si pasa cerca de una zona de
> riesgo. Está construido con JavaScript, Leaflet, Node.js y Supabase, y el código está en GitHub con
> ramas por área."

---

## Orden de tu intervención (resumen en una tarjeta)

| Momento | Qué haces | Tiempo |
|---|---|---|
| 1 | Diapositiva 8: bitácora y repositorio | 40 s |
| 2 | Diapositiva 9: interfaz y tecnologías | 40 s |
| 3 | Diapositiva 10: base de datos y DER | 70 s |
| 4 | Preguntas técnicas | según el profe |

**Total: 2 min 30 s de exposición + preguntas.**
