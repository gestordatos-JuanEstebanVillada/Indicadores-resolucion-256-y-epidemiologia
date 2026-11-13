-- Alinea admin (ID=0) con clave institucional 12345 en formato SHA1 (igual que otros usuarios).
-- Hash SHA1('12345') verificado en Python y en filas como cgonzalez/bgarcia.

UPDATE intranet_usuarios
SET contrasena = '8cb2237d0679ca88db6464eac60da96345513964'
WHERE id = 0
  AND UPPER(TRIM(usuario)) = 'ADMIN';

COMMIT;

-- Alternativa texto plano (también aceptada por el backend en desarrollo):
-- UPDATE intranet_usuarios SET contrasena = '12345' WHERE id = 0;
-- COMMIT;

-- Verificación:
-- SELECT id, usuario, contrasena FROM intranet_usuarios WHERE id = 0;
