-- Clasificador interno de módulos. El campo observatorio conserva el dato del Excel.
ALTER TABLE INTRANET_CALIDAD ADD modulo VARCHAR2(50);
ALTER TABLE INTRANET_CALIDAD_VERSIONES ADD modulo VARCHAR2(50);

-- Registros legacy de epidemiología (antes etiquetados en observatorio).
UPDATE INTRANET_CALIDAD
SET modulo = 'EPIDEMIOLOGIA'
WHERE UPPER(TRIM(NVL(observatorio, ''))) = 'IAAS'
   OR UPPER(observatorio) LIKE '%INFECC%'
   OR UPPER(observatorio) LIKE '%EPIDEM%';

-- Resto de registros existentes → Resolución 256.
UPDATE INTRANET_CALIDAD
SET modulo = 'RESOLUCION_256'
WHERE modulo IS NULL;

UPDATE INTRANET_CALIDAD_VERSIONES v
SET modulo = (
  SELECT c.modulo FROM INTRANET_CALIDAD c WHERE c.id = v.calidad_id
)
WHERE v.modulo IS NULL;

COMMIT;
