-- ============================================================
-- NEXIO — Ciclo de evaluaciones controlado por RRHH
-- Agrega flag de activación y fecha de apertura del período actual.
-- ============================================================

ALTER TABLE empresa_config
  ADD COLUMN IF NOT EXISTS evaluaciones_activas       BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS evaluaciones_activas_desde TIMESTAMPTZ NULL;
