-- =============================================
-- Tabla: auditoria
-- Historial de acciones importantes en la plataforma
-- =============================================

CREATE TABLE IF NOT EXISTS auditoria (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  empleado_id  UUID        REFERENCES empleados(id) ON DELETE SET NULL,
  accion       TEXT        NOT NULL,
  -- Ejemplos de acciones:
  --   crear_empleado, editar_empleado, desactivar_empleado
  --   crear_area, editar_area, eliminar_area
  --   aprobar_solicitud_vacaciones, rechazar_solicitud_ausencia
  --   crear_evaluacion, completar_evaluacion
  --   importar_empleados, guardar_politicas
  entidad      TEXT,       -- 'empleados', 'areas', 'solicitudes_vacaciones', etc.
  entidad_id   UUID,       -- ID del registro afectado
  detalle      JSONB,      -- información adicional (nombre, email, motivo, etc.)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_auditoria_empresa     ON auditoria(empresa_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_empleado    ON auditoria(empleado_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion      ON auditoria(accion);
CREATE INDEX IF NOT EXISTS idx_auditoria_created     ON auditoria(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_empresa_created ON auditoria(empresa_id, created_at DESC);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- RRHH y gerente pueden ver el historial de su empresa
CREATE POLICY "rrhh_gerente_select_auditoria"
ON auditoria FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
      AND e.empresa_id = auditoria.empresa_id
      AND e.rol IN ('rrhh', 'gerente')
  )
);

-- Solo el service role (admin client) puede insertar registros de auditoría
-- No se permite INSERT/UPDATE/DELETE desde el frontend directamente
