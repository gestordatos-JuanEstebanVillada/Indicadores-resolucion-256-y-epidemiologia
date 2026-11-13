import React from "react";
import { Navigate, useParams } from "react-router-dom";

import { canMutateModulo } from "../utils/authRoles";

import ModuleIaasCharts from "../Components/charts/ModuleIaasCharts";
import IaasForm from "../pages/modules/IaasForm";
import IaasIndicadores from "../pages/modules/IaasIndicadores";
import CalidadForm from "../pages/modules/CalidadForm";
import ModuleCharts from "../pages/modules/ModuleCharts";
import ModuleIndicadores from "../pages/modules/ModuleIndicadores";
import { MODULO_EPIDEMIOLOGIA } from "../utils/moduleConstants";
import { legacyModuloCodigoFromPath } from "../utils/moduloApi";

function useModuloCodigo() {
  const { moduloCodigo } = useParams();
  return legacyModuloCodigoFromPath(moduloCodigo);
}

export function ModuloFormularioPage() {
  const codigo = useModuloCodigo();
  if (!canMutateModulo(codigo)) {
    return (
      <Navigate
        to={`/app/${encodeURIComponent(codigo)}/indicadores`}
        replace
      />
    );
  }
  if (codigo === MODULO_EPIDEMIOLOGIA) {
    return <IaasForm />;
  }
  return <CalidadForm />;
}

export function ModuloIndicadoresPage() {
  const codigo = useModuloCodigo();
  if (codigo === MODULO_EPIDEMIOLOGIA) {
    return <IaasIndicadores />;
  }
  return <ModuleIndicadores />;
}

export function ModuloGraficosPage() {
  const codigo = useModuloCodigo();
  if (codigo === MODULO_EPIDEMIOLOGIA) {
    return <ModuleIaasCharts />;
  }
  return <ModuleCharts />;
}
