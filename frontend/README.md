# PINPOINT GPS — Frontend

Interfaz web del proyecto: mapa interactivo con las zonas de riesgo reportadas
por la comunidad, cálculo de **ruta segura** y formulario para reportar
incidentes.

## Tecnologías

- HTML5, CSS3 y JavaScript (sin frameworks, sin build)
- [Leaflet 1.9](https://leafletjs.com/) para el mapa
- [OpenStreetMap](https://www.openstreetmap.org/) como fuente de mapas
- [Nominatim](https://nominatim.org/) para buscar direcciones
- API de PINPOINT GPS (Node.js + Express) para los datos

## Cómo abrirlo

Necesita servirse por HTTP (no abrir el archivo con doble clic), porque el
navegador bloquea la geolocalización en `file://`.

```bash
# desde la raíz del repositorio
python -m http.server 8080 --directory frontend
# o con Node
npx serve frontend
```

Luego abre <http://localhost:8080>.

### Conectar con la API

Por defecto la app apunta a `http://localhost:3000`. Si el backend está en otra
dirección, defínela en la consola del navegador:

```js
localStorage.setItem('pinpoint_api_base', 'https://mi-api.ejemplo.com');
```

### Modo demostración

Si la API no responde, la app **no se rompe**: carga reportes de ejemplo en
Medellín, permite simular el cálculo de la ruta segura y muestra en la barra
superior la etiqueta *Modo demostración*. Sirve para presentar el proyecto sin
levantar el backend.

## Qué hace la pantalla

| Zona | Función |
|---|---|
| Barra superior | Estado de la API, botón de ubicación y sesión de usuario |
| Chips de alertas | Filtran el mapa por tipo (hurto, vehículos, zonas oscuras, orden público) |
| Ruta segura | Origen/destino, cálculo de la ruta y resumen de riesgo con alertas |
| Reportar incidente | Tipo, nivel de peligro (1–5) y descripción; el punto se toma del mapa |
| Últimos reportes | Lista de incidentes cercanos; al tocar uno el mapa se centra |
| Mapa | Zonas de riesgo por color, ubicación del usuario y trazado de la ruta |
| Botón de auxilio | Cuenta regresiva de 3 s y envío simulado de la ubicación |

Los colores del mapa siguen el nivel de peligro:

| Nivel | Color |
|---|---|
| 1 | Verde |
| 2 | Verde claro |
| 3 | Ámbar |
| 4 | Naranja |
| 5 | Rojo |

## Estructura

```
frontend/
├── index.html          # estructura de la pantalla
├── css/styles.css      # estilos (paleta verde SENA)
└── js/
    ├── api.js          # cliente de la API + datos de demostración
    ├── mapa.js         # mapa Leaflet, marcadores y trazado de rutas
    └── app.js          # eventos, formularios y estado de la interfaz
```

## Autor

José Daniel Agudelo — Desarrollador Frontend.
