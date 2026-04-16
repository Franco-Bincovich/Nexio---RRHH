-- ============================================================
-- NEXIO — Empresa Config Migration
-- Correr en Supabase SQL Editor
-- ============================================================

-- Tabla única de configuración por empresa
CREATE TABLE IF NOT EXISTS empresa_config (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id                  UUID NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,

  -- Datos generales
  logo_url                    TEXT,

  -- Políticas RRHH
  dias_vacaciones             INTEGER NOT NULL DEFAULT 20,
  hora_entrada                TIME NOT NULL DEFAULT '09:00',
  hora_salida                 TIME NOT NULL DEFAULT '18:00',
  modalidades_habilitadas     TEXT[] NOT NULL DEFAULT ARRAY['presencial','remoto','hibrido'],

  -- Contraseña por defecto para nuevos empleados
  password_default            TEXT NOT NULL DEFAULT 'nexio1234',

  -- Notificaciones
  notif_ausentismo            BOOLEAN NOT NULL DEFAULT true,
  notif_objetivos_vencidos    BOOLEAN NOT NULL DEFAULT false,
  notif_resumen_semanal       BOOLEAN NOT NULL DEFAULT true,
  notif_nuevos_empleados      BOOLEAN NOT NULL DEFAULT true,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE empresa_config ENABLE ROW LEVEL SECURITY;

-- RRHH y gerente pueden leer la configuración de su empresa
CREATE POLICY "staff_lee_config" ON empresa_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('rrhh','gerente')
        AND e.empresa_id = empresa_config.empresa_id
    )
  );

-- Solo RRHH puede modificar la configuración
CREATE POLICY "rrhh_modifica_config" ON empresa_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol = 'rrhh'
        AND e.empresa_id = empresa_config.empresa_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol = 'rrhh'
        AND e.empresa_id = empresa_config.empresa_id
    )
  );

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_empresa_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_empresa_config_updated_at
  BEFORE UPDATE ON empresa_config
  FOR EACH ROW EXECUTE FUNCTION update_empresa_config_updated_at();
