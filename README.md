# Backend CRM Mercadeo

API construida con **FastAPI**, **SQLAlchemy** y **Alembic**, conectada a una base de datos **Oracle** (vía `oracledb`).

## Requisitos

- Python 3.10+
- Acceso a una base de datos Oracle (host, puerto, service name, usuario y contraseña)

## 1. Crear y activar el entorno virtual

Ya existe una carpeta `venv/` en el proyecto. Si necesitas recrearla:

```powershell
python -m venv venv
```

Activar el entorno virtual:

```powershell
# PowerShell
.\venv\Scripts\Activate.ps1
```

```bash
# Git Bash / WSL
source venv/Scripts/activate
```

## 2. Instalar dependencias

```powershell
pip install -r requirements.txt
```

## 3. Configurar variables de entorno

Copia el archivo de ejemplo y completa tus credenciales de Oracle:

```powershell
copy .env.example .env
```

Edita `.env` con tus datos:

```
SCSE_DB_USER=your_user
SCSE_DB_PASSWD=your_password
SCSE_DB_IP=localhost
SCSE_DB_PORT=1521
SCSE_DB_DATABASE=your_service_name
```

## 4. Migraciones con Alembic (solo cuando aplique)

Alembic no se ejecuta en cada arranque del servidor: solo entra en juego cuando el **esquema de la base de datos** (las tablas definidas en `app/models.py`) cambia o está desactualizado respecto al código. Si la base de datos ya está al día, puedes saltar directo al paso 5.

**¿Cuándo sí necesitas usarlo?**

- **Primera vez que configuras el proyecto**, o después de traer cambios de otro desarrollador que agregó migraciones nuevas (por ejemplo, tras un `git pull`). En ese caso solo aplicas lo que ya existe:

  ```powershell
  alembic upgrade head
  ```

  Esto compara el estado actual de la base de datos contra el historial de migraciones en `alembic/` y aplica las que falten. Si no hay ninguna pendiente, no hace nada.
- **Modificaste tú mismo `app/models.py`** (agregaste/quitaste una tabla o columna). Ahí sí generas una migración nueva y la aplicas:

  ```powershell
  alembic revision --autogenerate -m "descripcion del cambio"
  alembic upgrade head
  ```

  El primer comando compara tus modelos contra la base de datos y genera un archivo en `alembic/versions/` con el `ALTER TABLE`/`CREATE TABLE` correspondiente (conviene revisarlo antes de aplicarlo, el autogenerate no siempre es perfecto). El segundo lo ejecuta contra la base de datos.

**Comandos útiles para consultar el estado** (no modifican nada):

```powershell
alembic current   # revisión aplicada actualmente en la base de datos
alembic history   # historial completo de migraciones
```

## 5. levantar el servidor

```powershell
uvicorn main:app --reload
```

El servidor quedará disponible en `http://127.0.0.1:8000`.

- Documentación interactiva (Swagger): `http://127.0.0.1:8000/docs`
- Endpoint de verificación: `GET /health` → `{"status": "ok"}`

## Estructura del proyecto

```
backend_crm_mercadeo/
├── alembic/            # Migraciones de base de datos
├── app/
│   ├── database.py      # Configuración de conexión SQLAlchemy/Oracle
│   └── models.py        # Modelos ORM (tablas)
├── main.py              # Punto de entrada de la app FastAPI
├── requirements.txt      # Dependencias
├── alembic.ini           # Configuración de Alembic
└── .env                  # Variables de entorno (no versionado)
```

La tabla `INTRANET_CALIDAD` guarda un indicador anual en una sola fila, con sus
datos mensuales en columnas separadas. La tabla `INTRANET_CALIDAD_VERSIONES`
guarda los cambios de nombre, fórmula y demás metadatos por periodo. Si el
esquema se crea manualmente en Oracle, ejecuta ambas sentencias `CREATE TABLE`
de `db.txt`.
