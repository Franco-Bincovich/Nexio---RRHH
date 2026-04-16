-- ============================================================
-- NEXIO — Empleado Features Migration
-- Correr en Supabase SQL Editor
-- ============================================================

-- 1. Columnas nuevas en empleados
ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS telefono               TEXT,
  ADD COLUMN IF NOT EXISTS direccion              TEXT,
  ADD COLUMN IF NOT EXISTS contacto_emergencia_nombre   TEXT,
  ADD COLUMN IF NOT EXISTS contacto_emergencia_telefono TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url             TEXT;

-- 2. Tabla notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  destinatario_id  UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL,
  mensaje          TEXT NOT NULL,
  leida            BOOLEAN NOT NULL DEFAULT false,
  referencia_id    UUID,
  referencia_tipo  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Cada empleado ve solo sus notificaciones
CREATE POLICY "empleado_lee_sus_notificaciones" ON notificaciones
  FOR SELECT USING (
    destinatario_id = (
      SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- Solo el servidor (service role) inserta notificaciones
CREATE POLICY "service_inserta_notificaciones" ON notificaciones
  FOR INSERT WITH CHECK (true);

CREATE POLICY "empleado_marca_leida" ON notificaciones
  FOR UPDATE USING (
    destinatario_id = (
      SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- 3. Tabla solicitudes_ausencia
CREATE TABLE IF NOT EXISTS solicitudes_ausencia (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id   UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  motivo        TEXT NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('enfermedad','personal','otro')),
  estado        TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobada','rechazada')),
  aprobado_por  UUID REFERENCES empleados(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE solicitudes_ausencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empleado_ve_sus_ausencias" ON solicitudes_ausencia
  FOR SELECT USING (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('lider','rrhh','gerente')
        AND e.empresa_id = (SELECT empresa_id FROM empleados WHERE id = solicitudes_ausencia.empleado_id LIMIT 1)
    )
  );

CREATE POLICY "empleado_crea_ausencia" ON solicitudes_ausencia
  FOR INSERT WITH CHECK (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "lider_rrhh_actualiza_ausencia" ON solicitudes_ausencia
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('lider','rrhh','gerente')
        AND e.empresa_id = (SELECT empresa_id FROM empleados WHERE id = solicitudes_ausencia.empleado_id LIMIT 1)
    )
  );

-- 4. Tabla solicitudes_retiro
CREATE TABLE IF NOT EXISTS solicitudes_retiro (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id   UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  hora_retiro   TIME NOT NULL,
  motivo        TEXT NOT NULL,
  estado        TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobada','rechazada')),
  aprobado_por  UUID REFERENCES empleados(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE solicitudes_retiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empleado_ve_sus_retiros" ON solicitudes_retiro
  FOR SELECT USING (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('lider','rrhh','gerente')
        AND e.empresa_id = (SELECT empresa_id FROM empleados WHERE id = solicitudes_retiro.empleado_id LIMIT 1)
    )
  );

CREATE POLICY "empleado_crea_retiro" ON solicitudes_retiro
  FOR INSERT WITH CHECK (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "lider_rrhh_actualiza_retiro" ON solicitudes_retiro
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('lider','rrhh','gerente')
        AND e.empresa_id = (SELECT empresa_id FROM empleados WHERE id = solicitudes_retiro.empleado_id LIMIT 1)
    )
  );

-- 5. Tabla solicitudes_vacaciones
CREATE TABLE IF NOT EXISTS solicitudes_vacaciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id   UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha_desde   DATE NOT NULL,
  fecha_hasta   DATE NOT NULL,
  dias          INTEGER NOT NULL,
  comentario    TEXT,
  estado        TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobada','rechazada')),
  aprobado_por  UUID REFERENCES empleados(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE solicitudes_vacaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empleado_ve_sus_vacaciones" ON solicitudes_vacaciones
  FOR SELECT USING (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('lider','rrhh','gerente')
        AND e.empresa_id = (SELECT empresa_id FROM empleados WHERE id = solicitudes_vacaciones.empleado_id LIMIT 1)
    )
  );

CREATE POLICY "empleado_crea_vacaciones" ON solicitudes_vacaciones
  FOR INSERT WITH CHECK (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "lider_rrhh_actualiza_vacaciones" ON solicitudes_vacaciones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('lider','rrhh','gerente')
        AND e.empresa_id = (SELECT empresa_id FROM empleados WHERE id = solicitudes_vacaciones.empleado_id LIMIT 1)
    )
  );

-- 6. Storage buckets (correr en Supabase Dashboard > Storage si no existen)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('empleado-docs', 'empleado-docs', false) ON CONFLICT DO NOTHING;

-- Storage RLS para avatars (público)
-- CREATE POLICY "avatars_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
-- CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS para empleado-docs (privado, solo el propio empleado)
-- CREATE POLICY "docs_select" ON storage.objects FOR SELECT USING (bucket_id = 'empleado-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "docs_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'empleado-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "docs_delete" ON storage.objects FOR DELETE USING (bucket_id = 'empleado-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
