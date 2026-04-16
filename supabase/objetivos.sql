-- =============================================================
-- NEXIO — Tabla objetivos
-- Ejecutar en: Supabase → SQL Editor → New query
-- =============================================================

CREATE TYPE objetivo_estado AS ENUM ('pendiente', 'en_progreso', 'completado');

CREATE TABLE objetivos (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID             NOT NULL REFERENCES empresas(id)  ON DELETE CASCADE,
  empleado_id  UUID             NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  asignado_por UUID             REFERENCES empleados(id) ON DELETE SET NULL,
  titulo       TEXT             NOT NULL,
  descripcion  TEXT,
  progreso     INTEGER          NOT NULL DEFAULT 0 CHECK (progreso BETWEEN 0 AND 100),
  estado       objetivo_estado  NOT NULL DEFAULT 'pendiente',
  vencimiento  DATE,
  categoria    TEXT,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_objetivos_empleado ON objetivos(empleado_id);
CREATE INDEX idx_objetivos_empresa  ON objetivos(empresa_id);

ALTER TABLE objetivos ENABLE ROW LEVEL SECURITY;

-- Cualquier empleado de la empresa puede ver todos los objetivos de su empresa
CREATE POLICY "ver objetivos de la empresa" ON objetivos
  FOR SELECT USING (empresa_id = nexio_empresa_id());

-- Lider / gerente / rrhh pueden crear objetivos
CREATE POLICY "crear objetivos" ON objetivos
  FOR INSERT WITH CHECK (
    empresa_id = nexio_empresa_id()
    AND nexio_rol() IN ('lider', 'gerente', 'rrhh')
  );

-- Quien asignó el objetivo puede actualizarlo; gerente y rrhh también
CREATE POLICY "actualizar objetivos" ON objetivos
  FOR UPDATE USING (
    empresa_id = nexio_empresa_id()
    AND (
      asignado_por = nexio_empleado_id()
      OR nexio_rol() IN ('gerente', 'rrhh')
    )
  );

-- Solo gerente / rrhh eliminan objetivos
CREATE POLICY "eliminar objetivos" ON objetivos
  FOR DELETE USING (
    empresa_id = nexio_empresa_id()
    AND nexio_rol() IN ('gerente', 'rrhh')
  );
