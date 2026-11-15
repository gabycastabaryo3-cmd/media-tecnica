# Diagrama entidad-relación — PINPOINT GPS

![Diagrama entidad-relación](DER.png)

> Diagrama original en [`DER.drawio`](DER.drawio) (se abre con [draw.io](https://app.diagrams.net/)).

```mermaid
erDiagram
    usuarios ||--o{ reportes : "emite"
    tipos_incidente ||--o{ reportes : "categoriza"
    usuarios ||--o{ reporte_validaciones : "valida"
    reportes ||--o{ reporte_validaciones : "recibe"
    usuarios |o--o{ rutas_consultadas : "consulta"

    usuarios {
        int id PK
        varchar nombre
        varchar correo UK
        varchar telefono UK
        varchar password_hash
        int reputacion
        varchar estado
        timestamptz fecha_registro
    }

    tipos_incidente {
        int id PK
        varchar nombre UK
        int nivel_peligro_base
        text descripcion
    }

    reportes {
        int id PK
        int usuario_id FK
        int tipo_incidente_id FK
        text descripcion
        decimal latitud
        decimal longitud
        geometry geom "Point, SRID 4326"
        timestamptz fecha_incidente
        timestamptz fecha_creacion
        int nivel_peligro
        varchar estado
    }

    reporte_validaciones {
        int id PK
        int reporte_id FK
        int usuario_id FK
        boolean es_util
        timestamptz fecha_validacion
    }

    rutas_consultadas {
        int id PK
        int usuario_id FK
        geometry origen_geom "Point"
        geometry destino_geom "Point"
        geometry geometria_ruta "LineString"
        float distancia_metros
        int tiempo_estimado_segundos
        timestamptz fecha_consulta
    }
```

## Cardinalidades

| Relación | Cardinalidad | Descripción |
|---|---|---|
| `usuarios` → `reportes` | 1 : N | Un usuario emite muchos reportes; cada reporte tiene un único autor. |
| `tipos_incidente` → `reportes` | 1 : N | Un tipo categoriza muchos reportes; cada reporte tiene un tipo. |
| `usuarios` ↔ `reportes` | N : M | Resuelta con `reporte_validaciones`: la comunidad confirma (`es_util = true`) o desmiente un reporte. |
| `usuarios` → `rutas_consultadas` | 0..1 : N | Un usuario consulta muchas rutas; la ruta puede ser anónima (`usuario_id` nulo). |

## Notas de diseño

- La columna `geom` (`GEOMETRY(Point, 4326)`) permite medir distancias reales con PostGIS y se
  complementa con las columnas `latitud` / `longitud` para lectura sencilla desde la API.
- El índice **GiST** (`idx_reportes_geom`) acelera las consultas de proximidad (`ST_DWithin`).
- La restricción `UNIQUE (reporte_id, usuario_id)` evita que un mismo usuario vote dos veces el mismo
  reporte, lo que sostiene el sistema de reputación.
