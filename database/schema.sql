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
-- Función: crear un reporte armando la geometría desde lat/lng
-- Uso: SELECT crear_reporte(1, 2, 'Hurto', 6.2442, -75.5812, 4);
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION crear_reporte(
    p_usuario_id        INTEGER,
    p_tipo_incidente_id INTEGER,
    p_descripcion       TEXT,
    p_lat               DOUBLE PRECISION,
    p_lng               DOUBLE PRECISION,
    p_nivel_peligro     INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_id INTEGER;
BEGIN
    INSERT INTO reportes (
        usuario_id, tipo_incidente_id, descripcion,
        latitud, longitud, geom, nivel_peligro
    )
    VALUES (
        p_usuario_id, p_tipo_incidente_id, p_descripcion,
        p_lat, p_lng,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
        p_nivel_peligro
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- Función: validar un reporte y ajustar la reputación
-- Un voto por usuario y reporte (la restricción UNIQUE lo garantiza).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_reporte(
    p_reporte_id INTEGER,
    p_usuario_id INTEGER,
    p_es_util    BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO reporte_validaciones (reporte_id, usuario_id, es_util)
    VALUES (p_reporte_id, p_usuario_id, p_es_util)
    ON CONFLICT (reporte_id, usuario_id)
    DO UPDATE SET es_util = EXCLUDED.es_util,
                  fecha_validacion = now();

    -- Si la comunidad confirma que el reporte es útil, sube la reputación
    -- del autor; si lo desmiente, la baja.
    UPDATE usuarios u
       SET reputacion = u.reputacion + CASE WHEN p_es_util THEN 1 ELSE -1 END
     WHERE u.id = (SELECT usuario_id FROM reportes WHERE id = p_reporte_id);

    -- Un reporte con 5 validaciones negativas se archiva automáticamente.
    IF (SELECT count(*) FROM reporte_validaciones
         WHERE reporte_id = p_reporte_id AND es_util = false) >= 5 THEN
        UPDATE reportes SET estado = 'archivado' WHERE id = p_reporte_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- Función: guardar una ruta consultada (historial)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION guardar_ruta_consultada(
    p_usuario_id      INTEGER,
    p_origen_lat      DOUBLE PRECISION,
    p_origen_lng      DOUBLE PRECISION,
    p_destino_lat     DOUBLE PRECISION,
    p_destino_lng     DOUBLE PRECISION,
    p_linea_wkt       TEXT,
    p_distancia_metros DOUBLE PRECISION,
    p_tiempo_segundos INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_id INTEGER;
BEGIN
    INSERT INTO rutas_consultadas (
        usuario_id, origen_geom, destino_geom, geometria_ruta,
        distancia_metros, tiempo_estimado_segundos
    )
    VALUES (
        p_usuario_id,
        ST_SetSRID(ST_MakePoint(p_origen_lng, p_origen_lat), 4326),
        ST_SetSRID(ST_MakePoint(p_destino_lng, p_destino_lat), 4326),
        ST_SetSRID(ST_GeomFromText(p_linea_wkt), 4326),
        p_distancia_metros,
        p_tiempo_segundos
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

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
