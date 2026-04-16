-- =============================================================
-- NEXIO — Agregar horas_laborables a empleados
-- Ejecutar en: Supabase → SQL Editor → New query
-- =============================================================

ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS horas_laborables INTEGER NOT NULL DEFAULT 8
    CHECK (horas_laborables BETWEEN 1 AND 24);
