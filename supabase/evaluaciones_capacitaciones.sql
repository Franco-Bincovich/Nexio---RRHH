-- ============================================================
-- NEXIO — Evaluaciones + Capacitaciones Migration
-- Correr en Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Tabla evaluaciones
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evaluaciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  empleado_id   UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  evaluador_id  UUID REFERENCES empleados(id),
  tipo          TEXT NOT NULL DEFAULT 'desempeño'
                  CHECK (tipo IN ('desempeño','360','semestral','anual','onboarding')),
  puntuacion    NUMERIC(4,1) CHECK (puntuacion BETWEEN 1 AND 10),
  comentario    TEXT,
  fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
  estado        TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','completada')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;

-- RRHH / gerente / lider ven todas las de su empresa
CREATE POLICY "staff_ve_evaluaciones" ON evaluaciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('rrhh','gerente','lider')
        AND e.empresa_id = evaluaciones.empresa_id
    )
  );

-- El empleado evaluado puede ver sus propias evaluaciones
CREATE POLICY "empleado_ve_su_evaluacion" ON evaluaciones
  FOR SELECT USING (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
  );

-- Solo RRHH puede crear evaluaciones
CREATE POLICY "rrhh_crea_evaluacion" ON evaluaciones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol = 'rrhh'
        AND e.empresa_id = evaluaciones.empresa_id
    )
  );

-- RRHH / gerente / lider pueden actualizar (ej. completar con puntuación)
CREATE POLICY "staff_actualiza_evaluacion" ON evaluaciones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('rrhh','gerente','lider')
        AND e.empresa_id = evaluaciones.empresa_id
    )
  );

-- Solo RRHH puede eliminar
CREATE POLICY "rrhh_elimina_evaluacion" ON evaluaciones
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol = 'rrhh'
        AND e.empresa_id = evaluaciones.empresa_id
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2. Tabla capacitaciones
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS capacitaciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  titulo        TEXT NOT NULL,
  descripcion   TEXT,
  categoria     TEXT NOT NULL DEFAULT 'General',
  obligatoria   BOOLEAN NOT NULL DEFAULT false,
  estado        TEXT NOT NULL DEFAULT 'activa'
                  CHECK (estado IN ('activa','archivada')),
  fecha_inicio  DATE,
  fecha_fin     DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE capacitaciones ENABLE ROW LEVEL SECURITY;

-- Todo empleado de la empresa puede ver capacitaciones (para su panel)
CREATE POLICY "todos_ven_capacitaciones" ON capacitaciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.empresa_id = capacitaciones.empresa_id
    )
  );

-- RRHH gestiona capacitaciones (INSERT / UPDATE / DELETE)
CREATE POLICY "rrhh_gestiona_capacitaciones" ON capacitaciones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol = 'rrhh'
        AND e.empresa_id = capacitaciones.empresa_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol = 'rrhh'
        AND e.empresa_id = capacitaciones.empresa_id
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Tabla empleado_capacitacion (asignaciones + progreso)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empleado_capacitacion (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capacitacion_id  UUID NOT NULL REFERENCES capacitaciones(id) ON DELETE CASCADE,
  empleado_id      UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  estado           TEXT NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente','en_curso','completado')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (capacitacion_id, empleado_id)
);

ALTER TABLE empleado_capacitacion ENABLE ROW LEVEL SECURITY;

-- Empleado ve sus propias asignaciones
CREATE POLICY "empleado_ve_su_capacitacion" ON empleado_capacitacion
  FOR SELECT USING (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
  );

-- RRHH / gerente / lider ven todas las de su empresa
CREATE POLICY "staff_ve_empleado_capacitacion" ON empleado_capacitacion
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM empleados e
      JOIN capacitaciones c ON c.id = empleado_capacitacion.capacitacion_id
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('rrhh','gerente','lider')
        AND e.empresa_id = c.empresa_id
    )
  );

-- RRHH puede insertar, actualizar y eliminar asignaciones
CREATE POLICY "rrhh_gestiona_asignaciones" ON empleado_capacitacion
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM empleados e
      JOIN capacitaciones c ON c.id = empleado_capacitacion.capacitacion_id
      WHERE e.user_id = auth.uid()
        AND e.rol = 'rrhh'
        AND e.empresa_id = c.empresa_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM empleados e
      JOIN capacitaciones c ON c.id = empleado_capacitacion.capacitacion_id
      WHERE e.user_id = auth.uid()
        AND e.rol = 'rrhh'
        AND e.empresa_id = c.empresa_id
    )
  );

-- Empleado puede actualizar su propio progreso
CREATE POLICY "empleado_actualiza_su_estado" ON empleado_capacitacion
  FOR UPDATE USING (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
  );
