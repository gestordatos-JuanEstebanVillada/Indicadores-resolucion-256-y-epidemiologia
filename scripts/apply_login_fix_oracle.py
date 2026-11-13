"""
Solo datos en tablas existentes: rol ADMIN para INTRANET_USUARIOS.ID=0.
No crea tablas ni altera estructura.

  py -3.11 scripts/apply_login_fix_oracle.py
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import text
from sqlalchemy.exc import DatabaseError

from app.shared.database.session import SessionLocal


def main() -> None:
    db = SessionLocal()
    try:
        db.execute(
            text(
                """
                INSERT INTO INTRANET_CALIDAD_ROLES (usuario_id, rol)
                SELECT 0, 'ADMIN' FROM dual
                WHERE NOT EXISTS (
                    SELECT 1 FROM INTRANET_CALIDAD_ROLES
                    WHERE usuario_id = 0 AND rol = 'ADMIN'
                )
                """
            )
        )
        db.commit()
        print("Rol ADMIN (usuario_id=0) verificado")
    except DatabaseError as exc:
        db.rollback()
        print("INSERT rol:", exc)
    db.close()


if __name__ == "__main__":
    main()
