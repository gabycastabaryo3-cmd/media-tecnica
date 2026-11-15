-- ============================================================
--  PINPOINT GPS — Esquema de base de datos
--  Motor: PostgreSQL + PostGIS (Supabase)
--  Autor del diseño: Oscar Reyes (Backend)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ------------------------------------------------------------
-- 1. usuarios
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    correo         VARCHAR(120) NOT NULL UNIQUE,
    telefono       VARCHAR(20)  UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    reputacion     INTEGER      NOT NULL DEFAULT 0,
    estado         VARCHAR(30)  NOT NULL DEFAULT 'activo'
                   CHECK (estado IN ('activo', 'suspendido_por_spam')),
    fecha_registro TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. tipos_incidente  (catálogo normalizado)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tipos_incidente (
    id                 SERIAL PRIMARY KEY,
    nombre             VARCHAR(80) NOT NULL UNIQUE,
    nivel_peligro_base INTEGER     NOT NULL CHECK (nivel_peligro_base BETWEEN 1 AND 5),
    descripcion        TEXT
);

-- ------------------------------------------------------------
-- 3. reportes  (núcleo del sistema)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reportes (
    id                SERIAL PRIMARY KEY,
    usuario_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_incidente_id INTEGER NOT NULL REFERENCES tipos_incidente(id),
    descripcion       TEXT,
    latitud           DECIMAL(10, 8) NOT NULL,
    longitud          DECIMAL(11, 8) NOT NULL,
    geom              GEOMETRY(Point, 4326) NOT NULL,
    fecha_incidente   TIMESTAMPTZ,
    fecha_creacion    TIMESTAMPTZ NOT NULL DEFAULT now(),
    nivel_peligro     INTEGER NOT NULL CHECK (nivel_peligro BETWEEN 1 AND 5),
    estado            VARCHAR(20) NOT NULL DEFAULT 'activo'
                      CHECK (estado IN ('activo', 'verificado', 'archivado'))
);

-- índice espacial: consultas "reportes en un radio de X metros"
CREATE INDEX IF NOT EXISTS idx_reportes_geom   ON reportes USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_reportes_estado ON reportes (estado);

-- ------------------------------------------------------------
-- 4. reporte_validaciones  (N:M entre usuarios y reportes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reporte_validaciones (
    id               SERIAL PRIMARY KEY,
    reporte_id       INTEGER NOT NULL REFERENCES reportes(id) ON DELETE CASCADE,
    usuario_id       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    es_util          BOOLEAN NOT NULL,          -- true = confirma el peligro
    fecha_validacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (reporte_id, usuario_id)             -- un voto por usuario por reporte
);

-- ------------------------------------------------------------
-- 5. rutas_consultadas  (historial de trayectos)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rutas_consultadas (
    id                      SERIAL PRIMARY KEY,
    usuario_id              INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, -- nulo = anónimo
    origen_geom             GEOMETRY(Point, 4326) NOT NULL,
    destino_geom            GEOMETRY(Point, 4326) NOT NULL,
    geometria_ruta          GEOMETRY(LineString, 4326),
    distancia_metros        DOUBLE PRECISION,
    tiempo_estimado_segundos INTEGER,
    fecha_consulta          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rutas_usuario ON rutas_consultadas (usuario_id);

-- ------------------------------------------------------------
-- Función: reportes activos dentro de un radio (metros)
-- Uso: SELECT * FROM reportes_cercanos(6.2442, -75.5812, 500);
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION reportes_cercanos(
    lat           DOUBLE PRECISION,
    lng           DOUBLE PRECISION,
    radio_metros  INTEGER DEFAULT 500
)
RETURNS TABLE (
    id            INTEGER,
    tipo          VARCHAR,
    nivel_peligro INTEGER,
    distancia     DOUBLE PRECISION
) AS $$
    SELECT r.id,
           t.nombre,
           r.nivel_peligro,
           ST_Distance(r.geom::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) AS distancia
    FROM reportes r
    JOIN tipos_incidente t ON t.id = r.tipo_incidente_id
    WHERE r.estado = 'activo'
      AND ST_DWithin(
            r.geom::geography,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            radio_metros
          )
    ORDER BY distancia;
$$ LANGUAGE sql STABLE;

-- ------------------------------------------------------------
-- Datos iniciales del catálogo
-- ------------------------------------------------------------
INSERT INTO tipos_incidente (nombre, nivel_peligro_base, descripcion) VALUES
    ('Robo a mano armada', 5, 'Hurto con arma de fuego o arma blanca'),
    ('Hurto a personas',   4, 'Hurto sin violencia, carterismo'),
    ('Hurto de vehículo',  5, 'Robo de moto o automóvil'),
    ('Zona oscura',        3, 'Sector sin alumbrado público'),
    ('Calle desolada',     3, 'Vía sin tránsito de personas'),
    ('Alteración del orden', 2, 'Riñas o disturbios')
ON CONFLICT (nombre) DO NOTHING;
