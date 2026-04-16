-- ============================================================
-- NEXIO — Empleado Tanda 2 Migration
-- Correr en Supabase SQL Editor
-- ============================================================

-- 1. Columna banco_horas_ajuste en empleados (ajuste manual por RRHH, en minutos)
ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS banco_horas_ajuste INTEGER NOT NULL DEFAULT 0;

-- 2. Columna notif_preferencias en empleados
ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS notif_preferencias JSONB NOT NULL DEFAULT '{
    "inasistencias": true,
    "objetivos": true,
    "vacaciones": true,
    "capacitaciones": true
  }'::jsonb;
