from sqlalchemy.orm import Session

from app.modules.auth.calidad_roles_data import (
    accesos_desde_filas,
    jerarquia_de_filas,
    listar_filas_usuario,
    listar_todos_usuarios_con_filas,
    nombre_rol_y_modulos_desde_filas,
    reemplazar_accesos_modulos,
    resolver_resumen_accesos,
    usuario_es_admin_global_filas,
)


class CalidadRolesRepository:
    def __init__(self, db: Session):
        self.db = db

    def listar_por_usuario_id(self, usuario_id: int):
        return listar_filas_usuario(self.db, usuario_id)

    def modulos_de_usuario(self, usuario_id: int) -> list[str]:
        _, modulos = nombre_rol_y_modulos_desde_filas(
            listar_filas_usuario(self.db, usuario_id)
        )
        return modulos

    def accesos_de_usuario(self, usuario_id: int) -> list[dict]:
        return accesos_desde_filas(listar_filas_usuario(self.db, usuario_id))

    def jerarquia_de_usuario(self, usuario_id: int) -> str | None:
        return jerarquia_de_filas(listar_filas_usuario(self.db, usuario_id))

    def nombre_rol_de_usuario(self, usuario_id: int) -> str | None:
        return self.jerarquia_de_usuario(usuario_id)

    def usuario_es_admin_global(self, usuario_id: int) -> bool:
        return usuario_es_admin_global_filas(
            listar_filas_usuario(self.db, usuario_id)
        )

    def obtener_todos_por_usuario_id(self) -> dict[int, list]:
        return listar_todos_usuarios_con_filas(self.db)

    def reemplazar_accesos(
        self,
        usuario_id: int,
        jerarquia: str,
        accesos: list[dict],
    ) -> list:
        reemplazar_accesos_modulos(self.db, usuario_id, jerarquia, accesos)
        return listar_filas_usuario(self.db, usuario_id)

    def resumen(self, usuario_id: int):
        return resolver_resumen_accesos(listar_filas_usuario(self.db, usuario_id))
