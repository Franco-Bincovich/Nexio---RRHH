-- ============================================================
-- NEXIO — Temperatura + Foro Migration
-- Correr en Supabase SQL Editor
-- ============================================================

-- 1. Tabla respuestas_temperatura
CREATE TABLE IF NOT EXISTS respuestas_temperatura (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id  UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  empresa_id   UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  puntuacion   INTEGER NOT NULL CHECK (puntuacion BETWEEN 1 AND 10),
  comentario   TEXT,
  semana       DATE NOT NULL, -- lunes de la semana
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empleado_id, semana)   -- una respuesta por semana por empleado
);

ALTER TABLE respuestas_temperatura ENABLE ROW LEVEL SECURITY;

-- Empleado solo ve sus propias respuestas
CREATE POLICY "empleado_ve_su_temperatura" ON respuestas_temperatura
  FOR SELECT USING (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "empleado_inserta_temperatura" ON respuestas_temperatura
  FOR INSERT WITH CHECK (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
  );

-- RRHH/líderes/gerentes pueden leer todas las de su empresa (para sus paneles)
CREATE POLICY "staff_ve_temperatura_empresa" ON respuestas_temperatura
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('rrhh', 'lider', 'gerente')
        AND e.empresa_id = respuestas_temperatura.empresa_id
    )
  );

-- 2. Tabla foros_mensajes
CREATE TABLE IF NOT EXISTS foros_mensajes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  area_id     UUID REFERENCES areas(id) ON DELETE CASCADE,  -- NULL = foro RRHH general
  autor_id    UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  mensaje     TEXT NOT NULL CHECK (char_length(mensaje) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE foros_mensajes ENABLE ROW LEVEL SECURITY;

-- Empleados ven mensajes de su área y el foro RRHH de su empresa
CREATE POLICY "empleado_lee_foro" ON foros_mensajes
  FOR SELECT USING (
    empresa_id = (SELECT empresa_id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
    AND (
      area_id IS NULL  -- foro RRHH
      OR area_id = (SELECT area_id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- Todo empleado activo de la empresa puede escribir en el foro de su área o en el RRHH
CREATE POLICY "empleado_escribe_foro" ON foros_mensajes
  FOR INSERT WITH CHECK (
    autor_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
    AND empresa_id = (SELECT empresa_id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
    AND (
      area_id IS NULL
      OR area_id = (SELECT area_id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
    )
  );
