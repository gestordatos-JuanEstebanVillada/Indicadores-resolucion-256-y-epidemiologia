-- Ejecutar en Oracle (Ligapru) si INTRANET_CALIDAD_ROLES ya existe.
-- Asigna rol ADMIN al usuario INTRANET_USUARIOS.ID = 0 (login 'admin').

MERGE INTO INTRANET_CALIDAD_ROLES t
USING (
    SELECT 0 AS usuario_id, 'ADMIN' AS rol FROM dual
) s
ON (t.usuario_id = s.usuario_id AND t.rol = s.rol)
WHEN NOT MATCHED THEN
    INSERT (usuario_id, rol) VALUES (s.usuario_id, s.rol);

COMMIT;
