-- Marca a un empleado como usuario demo, habilitando el selector de rol
-- del panel (cookie nexio-demo-rol). No afecta auth ni RLS: el rol real
-- en la tabla sigue siendo el original.

ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS es_demo BOOLEAN NOT NULL DEFAULT false;

UPDATE empleados
   SET es_demo = true
 WHERE email = 'franbincovich@gmail.com';
