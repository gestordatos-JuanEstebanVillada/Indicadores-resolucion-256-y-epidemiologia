"""intranet modulos y roles multi-acceso

Revision ID: 20260324_modulos
Revises:
Create Date: 2026-03-24

Ejecutar en Oracle los scripts en scripts/ si Alembic no está conectado:
- scripts/create_intranet_modulos.sql
- scripts/migrate_intranet_calidad_roles_multi.sql
"""

revision = "20260324_modulos"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
