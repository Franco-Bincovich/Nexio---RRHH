-- =============================================================
-- NEXIO — Schema principal
-- Ejecutar en: Supabase → SQL Editor → New query
-- =============================================================


-- =============================================================
-- 1. TIPOS ENUM
-- =============================================================

CREATE TYPE rol_sistema AS ENUM ('empleado', 'lider', 'gerente', 'rrhh');

CREATE TYPE modalidad_tipo AS ENUM ('presencial', 'remoto', 'hibrido');

CREATE TYPE metodo_registro AS ENUM ('wifi', 'home', 'manual');

CREATE TYPE asistencia_tipo AS ENUM ('entrada', 'salida');


-- =============================================================
-- 2. TABLAS
-- Orden: empresas → areas (sin FK circular) → empleados →
--        agregar FK circular → registros_asistencia
-- =============================================================

CREATE TABLE empresas (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT        NOT NULL,
  plan       TEXT        NOT NULL DEFAULT 'starter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- areas se crea sin lider_id para evitar la dependencia circular con empleados
CREATE TABLE areas (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID  NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre     TEXT  NOT NULL,
  lider_id   UUID  -- FK a empleados, se agrega con ALTER TABLE abajo
);

CREATE TABLE empleados (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID          NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id    UUID          UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre     TEXT          NOT NULL,
  email      TEXT          NOT NULL,
  area_id    UUID          REFERENCES areas(id) ON DELETE SET NULL,
  rol        rol_sistema   NOT NULL DEFAULT 'empleado',
  modalidad  modalidad_tipo NOT NULL DEFAULT 'presencial',
  activo     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, email)
);

-- Ahora que existe la tabla empleados, cerramos la dependencia circular
ALTER TABLE areas
  ADD CONSTRAINT areas_lider_id_fkey
  FOREIGN KEY (lider_id) REFERENCES empleados(id) ON DELETE SET NULL;

CREATE TABLE registros_asistencia (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID             NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo        asistencia_tipo  NOT NULL,
  fecha       DATE             NOT NULL DEFAULT CURRENT_DATE,
  hora_entrada TIME,
  hora_salida  TIME,
  metodo      metodo_registro  NOT NULL,
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);


-- =============================================================
-- 3. ÍNDICES
-- =============================================================

CREATE INDEX idx_empleados_empresa  ON empleados(empresa_id);
CREATE INDEX idx_empleados_area     ON empleados(area_id);
CREATE INDEX idx_empleados_user     ON empleados(user_id);
CREATE INDEX idx_areas_empresa      ON areas(empresa_id);
CREATE INDEX idx_asistencia_empleado ON registros_asistencia(empleado_id);
CREATE INDEX idx_asistencia_fecha    ON registros_asistencia(fecha);


-- =============================================================
-- 4. FUNCIONES HELPER PARA RLS
-- Devuelven empresa_id y rol del usuario autenticado actualmente.
-- SECURITY DEFINER: se ejecutan con permisos del owner, no del caller.
-- =============================================================

CREATE OR REPLACE FUNCTION nexio_empresa_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT empresa_id FROM empleados WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION nexio_rol()
RETURNS rol_sistema
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT rol FROM empleados WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION nexio_empleado_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1;
$$;


-- =============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================================

ALTER TABLE empresas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados          ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_asistencia ENABLE ROW LEVEL SECURITY;


-- --- empresas ---------------------------------------------------
-- Cualquier empleado autenticado puede ver su propia empresa
CREATE POLICY "ver propia empresa"
  ON empresas FOR SELECT
  USING (id = nexio_empresa_id());

-- Solo rrhh puede actualizar datos de la empresa
CREATE POLICY "rrhh actualiza empresa"
  ON empresas FOR UPDATE
  USING (id = nexio_empresa_id() AND nexio_rol() = 'rrhh');


-- --- areas ------------------------------------------------------
-- Todos los empleados de la empresa ven sus áreas
CREATE POLICY "ver areas de la empresa"
  ON areas FOR SELECT
  USING (empresa_id = nexio_empresa_id());

-- Solo rrhh y gerente pueden crear/modificar/eliminar áreas
CREATE POLICY "rrhh-gerente gestionan areas"
  ON areas FOR ALL
  USING (
    empresa_id = nexio_empresa_id()
    AND nexio_rol() IN ('rrhh', 'gerente')
  );


-- --- empleados --------------------------------------------------
-- Todos ven a los compañeros activos de su empresa
CREATE POLICY "ver empleados de la empresa"
  ON empleados FOR SELECT
  USING (empresa_id = nexio_empresa_id());

-- Solo rrhh puede agregar empleados
CREATE POLICY "rrhh agrega empleados"
  ON empleados FOR INSERT
  WITH CHECK (
    empresa_id = nexio_empresa_id()
    AND nexio_rol() = 'rrhh'
  );

-- rrhh puede modificar cualquier empleado; cada empleado puede modificar su propio registro
CREATE POLICY "rrhh o propio actualiza empleado"
  ON empleados FOR UPDATE
  USING (
    empresa_id = nexio_empresa_id()
    AND (nexio_rol() = 'rrhh' OR id = nexio_empleado_id())
  );

-- Solo rrhh puede desactivar (eliminar lógico) empleados
CREATE POLICY "rrhh elimina empleados"
  ON empleados FOR DELETE
  USING (
    empresa_id = nexio_empresa_id()
    AND nexio_rol() = 'rrhh'
  );


-- --- registros_asistencia ---------------------------------------
-- Empleado: solo ve su propia asistencia
-- Lider/gerente/rrhh: ven toda la asistencia de la empresa
CREATE POLICY "ver asistencia segun rol"
  ON registros_asistencia FOR SELECT
  USING (
    CASE nexio_rol()
      WHEN 'rrhh'    THEN empleado_id IN (SELECT id FROM empleados WHERE empresa_id = nexio_empresa_id())
      WHEN 'gerente' THEN empleado_id IN (SELECT id FROM empleados WHERE empresa_id = nexio_empresa_id())
      WHEN 'lider'   THEN empleado_id IN (SELECT id FROM empleados WHERE empresa_id = nexio_empresa_id())
      ELSE empleado_id = nexio_empleado_id()
    END
  );

-- Cada empleado solo puede registrar su propia asistencia
CREATE POLICY "empleado registra su asistencia"
  ON registros_asistencia FOR INSERT
  WITH CHECK (empleado_id = nexio_empleado_id());

-- rrhh puede corregir registros (entrada manual)
CREATE POLICY "rrhh corrige asistencia"
  ON registros_asistencia FOR UPDATE
  USING (
    nexio_rol() = 'rrhh'
    AND empleado_id IN (SELECT id FROM empleados WHERE empresa_id = nexio_empresa_id())
  );
