from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import DateTime, Numeric
from sqlalchemy.sql import func

from app.shared.database.base import Base


class Usuario(Base):
    __tablename__ = "intranet_usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario: Mapped[str | None] = mapped_column(String(50))
    nombres: Mapped[str | None] = mapped_column(String(50))
    contrasena: Mapped[str | None] = mapped_column(String(100))
    estado: Mapped[str | None] = mapped_column(String(20))
    id_clase: Mapped[int | None] = mapped_column(Integer)
    id_area: Mapped[int | None] = mapped_column(Integer)
    # NIT / documento institucional; puede incluir guiones (ej. 891480000-1)
    num_id: Mapped[str | None] = mapped_column(String(50))


class IntranetCalidadRol(Base):
    __tablename__ = "INTRANET_CALIDAD_ROLES"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    rol: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[str | None] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[str | None] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class IntranetCalidad(Base):
    __tablename__ = "INTRANET_CALIDAD"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    indicador: Mapped[str | None] = mapped_column(String(4000))
    formula: Mapped[str | None] = mapped_column(String(4000))
    meta_institucional: Mapped[str | None] = mapped_column(String(4000))
    observatorio: Mapped[str | None] = mapped_column(String(4000))
    modulo: Mapped[str | None] = mapped_column(String(50))
    year: Mapped[int | None] = mapped_column(Integer)
    numerador_enero: Mapped[float | None] = mapped_column(Numeric(18, 4))
    denominador_enero: Mapped[float | None] = mapped_column(Numeric(18, 4))
    indicador_enero: Mapped[float | None] = mapped_column(Numeric(18, 6))
    numerador_febrero: Mapped[float | None] = mapped_column(Numeric(18, 4))
    denominador_febrero: Mapped[float | None] = mapped_column(Numeric(18, 4))
    indicador_febrero: Mapped[float | None] = mapped_column(Numeric(18, 6))
    numerador_marzo: Mapped[float | None] = mapped_column(Numeric(18, 4))
    denominador_marzo: Mapped[float | None] = mapped_column(Numeric(18, 4))
    indicador_marzo: Mapped[float | None] = mapped_column(Numeric(18, 6))
    numerador_abril: Mapped[float | None] = mapped_column(Numeric(18, 4))
    denominador_abril: Mapped[float | None] = mapped_column(Numeric(18, 4))
    indicador_abril: Mapped[float | None] = mapped_column(Numeric(18, 6))
    numerador_mayo: Mapped[float | None] = mapped_column(Numeric(18, 4))
    denominador_mayo: Mapped[float | None] = mapped_column(Numeric(18, 4))
    indicador_mayo: Mapped[float | None] = mapped_column(Numeric(18, 6))
    numerador_junio: Mapped[float | None] = mapped_column(Numeric(18, 4))
    denominador_junio: Mapped[float | None] = mapped_column(Numeric(18, 4))
    indicador_junio: Mapped[float | None] = mapped_column(Numeric(18, 6))
    numerador_julio: Mapped[float | None] = mapped_column(Numeric(18, 4))
    denominador_julio: Mapped[float | None] = mapped_column(Numeric(18, 4))
    indicador_julio: Mapped[float | None] = mapped_column(Numeric(18, 6))
    numerador_agosto: Mapped[float | None] = mapped_column(Numeric(18, 4))
    denominador_agosto: Mapped[float | None] = mapped_column(Numeric(18, 4))
    indicador_agosto: Mapped[float | None] = mapped_column(Numeric(18, 6))
    numerador_septiembre: Mapped[float | None] = mapped_column(Numeric(18, 4))
    denominador_septiembre: Mapped[float | None] = mapped_column(Numeric(18, 4))
    indicador_septiembre: Mapped[float | None] = mapped_column(Numeric(18, 6))
    numerador_octubre: Mapped[float | None] = mapped_column(Numeric(18, 4))
    denominador_octubre: Mapped[float | None] = mapped_column(Numeric(18, 4))
    indicador_octubre: Mapped[float | None] = mapped_column(Numeric(18, 6))
    numerador_noviembre: Mapped[float | None] = mapped_column(Numeric(18, 4))
    denominador_noviembre: Mapped[float | None] = mapped_column(Numeric(18, 4))
    indicador_noviembre: Mapped[float | None] = mapped_column(Numeric(18, 6))
    numerador_diciembre: Mapped[float | None] = mapped_column(Numeric(18, 4))
    denominador_diciembre: Mapped[float | None] = mapped_column(Numeric(18, 4))
    indicador_diciembre: Mapped[float | None] = mapped_column(Numeric(18, 6))
    requiere_plan_enero: Mapped[str | None] = mapped_column(String(2), default="NO")
    requiere_plan_febrero: Mapped[str | None] = mapped_column(String(2), default="NO")
    requiere_plan_marzo: Mapped[str | None] = mapped_column(String(2), default="NO")
    requiere_plan_abril: Mapped[str | None] = mapped_column(String(2), default="NO")
    requiere_plan_mayo: Mapped[str | None] = mapped_column(String(2), default="NO")
    requiere_plan_junio: Mapped[str | None] = mapped_column(String(2), default="NO")
    requiere_plan_julio: Mapped[str | None] = mapped_column(String(2), default="NO")
    requiere_plan_agosto: Mapped[str | None] = mapped_column(String(2), default="NO")
    requiere_plan_septiembre: Mapped[str | None] = mapped_column(String(2), default="NO")
    requiere_plan_octubre: Mapped[str | None] = mapped_column(String(2), default="NO")
    requiere_plan_noviembre: Mapped[str | None] = mapped_column(String(2), default="NO")
    requiere_plan_diciembre: Mapped[str | None] = mapped_column(String(2), default="NO")
    indicador_trimestre_1: Mapped[float | None] = mapped_column(Numeric(18, 6))
    indicador_trimestre_2: Mapped[float | None] = mapped_column(Numeric(18, 6))
    indicador_trimestre_3: Mapped[float | None] = mapped_column(Numeric(18, 6))
    indicador_trimestre_4: Mapped[float | None] = mapped_column(Numeric(18, 6))
    indicador_semestre_1: Mapped[float | None] = mapped_column(Numeric(18, 6))
    indicador_semestre_2: Mapped[float | None] = mapped_column(Numeric(18, 6))
    created_at: Mapped[str | None] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[str | None] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class IntranetCalidadVersion(Base):
    __tablename__ = "INTRANET_CALIDAD_VERSIONES"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    calidad_id: Mapped[int] = mapped_column(
        ForeignKey("INTRANET_CALIDAD.id"), nullable=False
    )
    indicador: Mapped[str | None] = mapped_column(String(4000))
    formula: Mapped[str | None] = mapped_column(String(4000))
    meta_institucional: Mapped[str | None] = mapped_column(String(4000))
    observatorio: Mapped[str | None] = mapped_column(String(4000))
    modulo: Mapped[str | None] = mapped_column(String(50))
    mes_inicio: Mapped[int] = mapped_column(Integer, nullable=False)
    mes_fin: Mapped[int] = mapped_column(Integer, nullable=False, default=12)
    created_at: Mapped[str | None] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[str | None] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class IntranetPlanMejora(Base):
    __tablename__ = "INTRANET_PLANES_MEJORA"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    calidad_id: Mapped[int] = mapped_column(
        ForeignKey("INTRANET_CALIDAD.id", ondelete="CASCADE"),
        nullable=False,
    )
    modulo: Mapped[str] = mapped_column(String(50), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    mes: Mapped[int] = mapped_column(Integer, nullable=False)
    valor_obtenido: Mapped[float | None] = mapped_column(Numeric(18, 6))
    meta_institucional: Mapped[str | None] = mapped_column(String(4000))
    observaciones: Mapped[str] = mapped_column(Text, nullable=False)
    responsable_nombre: Mapped[str] = mapped_column(String(250), nullable=False)
    responsable_correo: Mapped[str] = mapped_column(String(250), nullable=False)
    fecha_cumplimiento: Mapped[date] = mapped_column(Date, nullable=False)
    estado: Mapped[str | None] = mapped_column(String(50), default="PENDIENTE")
    created_at: Mapped[str | None] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[str | None] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


