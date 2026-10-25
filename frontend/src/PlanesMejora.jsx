import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CheckCircle2, ClipboardList, XCircle } from "lucide-react";



import PlanMejoraModal from "./Components/Notifications/PlanMejoraModal";

import { API_URL, apiFetch } from "./config/api";

import { fetchAllIncumplimientos, incumplimientoKey } from "./utils/fetchIncumplimientos";

import { INCUMPLIMIENTOS_REFRESH_EVENT } from "./utils/incumplimientosEvents";

import {

  MODULO_EPIDEMIOLOGIA,

  MODULO_RESOLUCION_256,

} from "./utils/moduleConstants";

import { canAccessAdmin, getUserRol, ROLES } from "./utils/authRoles";



const ESTADO_FILTROS = [

  { value: "PENDIENTE", label: "Pendiente" },

  { value: "CUMPLIDO", label: "Cumplido" },

  { value: "NO_CUMPLIDO", label: "No cumplido" },

];



function estadoLabel(estado) {

  const value = (estado || "PENDIENTE").toUpperCase();

  return ESTADO_FILTROS.find((item) => item.value === value)?.label ?? value;

}



function estadoBadgeClass(estado) {

  const value = (estado || "PENDIENTE").toUpperCase();

  if (value === "CUMPLIDO") {

    return "bg-green-100 text-green-800 border-green-200";

  }

  if (value === "NO_CUMPLIDO") {

    return "bg-red-100 text-red-800 border-red-200";

  }

  return "bg-amber-100 text-amber-800 border-amber-200";

}



function formatDate(value) {

  if (!value) {

    return "—";

  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {

    return value;

  }

  return date.toLocaleDateString("es-CO");

}



function formatMetaVsObtenido(alert) {

  const meta = alert.meta_institucional?.trim() || "—";

  const valor =

    alert.valor_obtenido != null && !Number.isNaN(Number(alert.valor_obtenido))

      ? Number(alert.valor_obtenido).toFixed(2)

      : "—";

  return `${meta} | Resultado: ${valor}`;

}

function chartsPathForModulo(modulo) {
  if (modulo === MODULO_EPIDEMIOLOGIA) {
    return "/app/infecciones/graficos";
  }
  return "/app/indicadores/graficos";
}

export default function PlanesMejora() {
  const navigate = useNavigate();
  const esAdmin = canAccessAdmin();
  const rolUsuario = getUserRol();
  const [activeTab, setActiveTab] = useState("incidencias");



  const [incidencias, setIncidencias] = useState([]);

  const [loadingIncidencias, setLoadingIncidencias] = useState(true);



  const [plans, setPlans] = useState([]);

  const [loadingPlans, setLoadingPlans] = useState(true);



  const [message, setMessage] = useState("");

  const [filterModulo, setFilterModulo] = useState("");

  const [filterEstado, setFilterEstado] = useState("");

  const [selectedIds, setSelectedIds] = useState(new Set());

  const [bulkLoading, setBulkLoading] = useState(false);

  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filtroModulo, setFiltroModulo] = useState(() => {
    if (canAccessAdmin()) {
      return "Todos";
    }
    if (getUserRol() === ROLES.EPIDEMIOLOGIA) {
      return MODULO_EPIDEMIOLOGIA;
    }
    return MODULO_RESOLUCION_256;
  });
  const [filtroYear, setFiltroYear] = useState("Todos");
  const [filtroMes, setFiltroMes] = useState("Todos");

  const loadIncidencias = useCallback(async ({ silent = false } = {}) => {

    if (!silent) {

      setLoadingIncidencias(true);

    }

    try {

      setIncidencias(await fetchAllIncumplimientos());

    } catch {

      if (!silent) {

        setIncidencias([]);

      }

    } finally {

      if (!silent) {

        setLoadingIncidencias(false);

      }

    }

  }, []);



  const loadPlans = useCallback(

    async ({ silent = false } = {}) => {

      if (!silent) {

        setLoadingPlans(true);

      }

      if (!silent) {

        setMessage("");

      }

      try {

        const params = new URLSearchParams();

        if (filterModulo) {

          params.set("modulo", filterModulo);

        }

        if (filterEstado) {

          params.set("estado", filterEstado);

        }

        const query = params.toString();

        const response = await apiFetch(

          `${API_URL}/planes-mejora/todos${query ? `?${query}` : ""}`

        );

        if (!response.ok) {

          throw new Error("No se pudieron cargar los planes de mejora.");

        }

        setPlans(await response.json());

        setSelectedIds(new Set());

      } catch (error) {

        if (!silent) {

          setMessage(error.message || "Error al cargar.");

          setPlans([]);

        }

      } finally {

        if (!silent) {

          setLoadingPlans(false);

        }

      }

    },

    [filterModulo, filterEstado]

  );



  const refreshAll = useCallback(

    async ({ silent = true } = {}) => {

      await Promise.all([loadIncidencias({ silent }), loadPlans({ silent })]);

    },

    [loadIncidencias, loadPlans]

  );



  useEffect(() => {

    loadIncidencias();

  }, [loadIncidencias]);



  useEffect(() => {

    loadPlans();

  }, [loadPlans]);



  useEffect(() => {

    function onExternalRefresh() {

      refreshAll({ silent: true });

    }

    window.addEventListener(INCUMPLIMIENTOS_REFRESH_EVENT, onExternalRefresh);

    return () => {

      window.removeEventListener(INCUMPLIMIENTOS_REFRESH_EVENT, onExternalRefresh);

    };

  }, [refreshAll]);



  const allVisibleSelected = useMemo(

    () => plans.length > 0 && plans.every((plan) => selectedIds.has(plan.id)),

    [plans, selectedIds]

  );



  function toggleSelectAll() {

    if (allVisibleSelected) {

      setSelectedIds(new Set());

      return;

    }

    setSelectedIds(new Set(plans.map((plan) => plan.id)));

  }



  function toggleRow(id) {

    setSelectedIds((current) => {

      const next = new Set(current);

      if (next.has(id)) {

        next.delete(id);

      } else {

        next.add(id);

      }

      return next;

    });

  }



  async function applyBulkStatus(nuevoEstado) {

    if (selectedIds.size === 0) {

      return;

    }



    setBulkLoading(true);

    setMessage("");

    try {

      const response = await apiFetch(`${API_URL}/planes-mejora/estado-masivo`, {

        method: "PATCH",

        body: JSON.stringify({

          plan_ids: [...selectedIds],

          nuevo_estado: nuevoEstado,

        }),

      });



      if (!response.ok) {

        const data = await response.json().catch(() => ({}));

        throw new Error(data.detail || "No se pudo actualizar el estado.");

      }



      const data = await response.json();

      setMessage(

        `${data.message} (${data.actualizados} registro${data.actualizados === 1 ? "" : "s"}).`

      );

      await loadPlans();

    } catch (error) {

      setMessage(error.message || "Error en actualización masiva.");

    } finally {

      setBulkLoading(false);

    }

  }



  function handlePlanSavedFromTab(alert) {

    setIncidencias((current) =>

      current.filter((item) => incumplimientoKey(item) !== incumplimientoKey(alert))

    );

    setSelectedAlert(null);

    refreshAll({ silent: true });

  }



  const incidenciasPorModulo = useMemo(
    () =>
      incidencias.filter(
        (inc) => filtroModulo === "Todos" || inc.modulo === filtroModulo
      ),
    [incidencias, filtroModulo]
  );

  const aniosDisponibles = useMemo(
    () =>
      [...new Set(incidenciasPorModulo.map((inc) => inc.year))]
        .filter((year) => year != null)
        .sort((a, b) => b - a),
    [incidenciasPorModulo]
  );

  const incidenciasPorModuloYAnio = useMemo(
    () =>
      incidenciasPorModulo.filter(
        (inc) => filtroYear === "Todos" || inc.year === Number(filtroYear)
      ),
    [incidenciasPorModulo, filtroYear]
  );

  const mesesDisponibles = useMemo(() => {
    const byMes = new Map();
    for (const inc of incidenciasPorModuloYAnio) {
      if (!byMes.has(inc.mes)) {
        byMes.set(inc.mes, inc.mes_nombre || String(inc.mes));
      }
    }
    return [...byMes.entries()].sort((a, b) => a[0] - b[0]);
  }, [incidenciasPorModuloYAnio]);

  const incidenciasFiltradas = useMemo(
    () =>
      incidenciasPorModuloYAnio.filter(
        (inc) => filtroMes === "Todos" || inc.mes === Number(filtroMes)
      ),
    [incidenciasPorModuloYAnio, filtroMes]
  );

  useEffect(() => {
    if (filtroYear !== "Todos" && !aniosDisponibles.includes(Number(filtroYear))) {
      setFiltroYear("Todos");
    }
  }, [aniosDisponibles, filtroYear]);

  useEffect(() => {
    if (
      filtroMes !== "Todos" &&
      !mesesDisponibles.some(([mes]) => mes === Number(filtroMes))
    ) {
      setFiltroMes("Todos");
    }
  }, [mesesDisponibles, filtroMes]);

  function handleIrAGrafico(incidencia) {
    navigate(chartsPathForModulo(incidencia.modulo), {
      state: {
        indicadorId: incidencia.calidad_id,
        year: incidencia.year,
      },
    });
  }

  return (

    <div className="space-y-6">

      <div>

        <h2 className="text-2xl font-bold text-gray-800">Gestión de planes de mejora</h2>

        <p className="text-sm text-gray-500 mt-1">

          Gestione incidencias sin plan y haga seguimiento a los planes ya registrados.

        </p>

      </div>



      <nav

        className="flex flex-wrap gap-2 border-b border-gray-200 pb-1"

        aria-label="Secciones de planes de mejora"

      >

        <button

          type="button"

          onClick={() => setActiveTab("incidencias")}

          className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${

            activeTab === "incidencias"

              ? "border-pink-600 text-pink-700 bg-pink-50/80"

              : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"

          }`}

        >

          Incidencias por gestionar
          <span
            className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
              incidenciasFiltradas.length > 0
                ? "bg-amber-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {incidenciasFiltradas.length}
          </span>
        </button>

        <button

          type="button"

          onClick={() => setActiveTab("planes")}

          className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${

            activeTab === "planes"

              ? "border-pink-600 text-pink-700 bg-pink-50/80"

              : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"

          }`}

        >

          <ClipboardList size={16} />
          Planes registrados en seguimiento
          <span
            className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
              plans.length > 0 ? "bg-pink-100 text-pink-800" : "bg-gray-200 text-gray-600"
            }`}
          >
            {plans.length}
          </span>
        </button>

      </nav>



      {message && activeTab === "planes" ? (

        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">

          {message}

        </p>

      ) : null}



      {activeTab === "incidencias" ? (
        <>
          <div className="flex flex-wrap gap-3 items-end bg-white border border-gray-200 rounded-xl p-4">
            {esAdmin ? (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Módulo
                </label>
                <select
                  value={filtroModulo}
                  onChange={(event) => setFiltroModulo(event.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[200px]"
                >
                  <option value="Todos">Todos</option>
                  <option value={MODULO_RESOLUCION_256}>Resolución 256</option>
                  <option value={MODULO_EPIDEMIOLOGIA}>Epidemiología / IAAS</option>
                </select>
              </div>
            ) : (
              <p className="text-sm text-gray-600 pb-2">
                Módulo:{" "}
                <span className="font-medium text-gray-800">
                  {rolUsuario === ROLES.EPIDEMIOLOGIA
                    ? "Epidemiología / IAAS"
                    : "Resolución 256"}
                </span>
              </p>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Año
              </label>
              <select
                value={filtroYear}
                onChange={(event) => setFiltroYear(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[120px]"
                disabled={aniosDisponibles.length === 0}
              >
                <option value="Todos">Todos</option>
                {aniosDisponibles.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Mes
              </label>
              <select
                value={filtroMes}
                onChange={(event) => setFiltroMes(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[160px]"
                disabled={mesesDisponibles.length === 0}
              >
                <option value="Todos">Todos</option>
                {mesesDisponibles.map(([mes, nombre]) => (
                  <option key={mes} value={String(mes)} className="capitalize">
                    {nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {loadingIncidencias ? (

            <p className="p-8 text-center text-sm text-gray-500">Cargando incidencias…</p>

          ) : incidencias.length === 0 ? (

            <p className="p-8 text-center text-sm text-gray-500">

              No hay incidencias pendientes. Todas las alertas tienen plan de mejora o cumplen

              meta.

            </p>

          ) : incidenciasFiltradas.length === 0 ? (

            <p className="p-8 text-center text-sm text-gray-500">
              No hay incidencias con los filtros seleccionados.
            </p>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs uppercase text-gray-500">

                    <th className="px-4 py-3">Módulo</th>

                    <th className="px-4 py-3 min-w-[220px]">Indicador</th>

                    <th className="px-4 py-3">Periodo</th>

                    <th className="px-4 py-3 min-w-[180px]">Meta vs obtenido</th>

                    <th className="px-4 py-3 text-right">Acción</th>

                  </tr>

                </thead>

                <tbody>

                  {incidenciasFiltradas.map((alert) => (

                    <tr

                      key={incumplimientoKey(alert)}

                      className="border-b border-gray-100 hover:bg-amber-50/40"

                    >

                      <td className="px-4 py-3">

                        <span className="text-xs font-semibold text-pink-700">{alert.modulo}</span>

                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleIrAGrafico(alert)}
                          className="text-left cursor-pointer text-blue-700 hover:text-blue-900 hover:underline font-medium transition-colors"
                          title="Ver gráficos del indicador"
                        >
                          {alert.indicador}
                        </button>
                      </td>

                      <td className="px-4 py-3 capitalize">

                        {alert.mes_nombre} {alert.year}

                      </td>

                      <td className="px-4 py-3 text-gray-700">{formatMetaVsObtenido(alert)}</td>

                      <td className="px-4 py-3 text-right">

                        <button

                          type="button"

                          onClick={() => setSelectedAlert(alert)}

                          className="inline-flex bg-pink-600 hover:bg-pink-700 text-white text-xs font-medium px-3 py-1.5 rounded-md transition shadow-sm whitespace-nowrap"

                        >

                          Aplicar plan

                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </div>
        </>
      ) : (

        <>

          <div className="flex flex-wrap gap-3 items-end bg-white border border-gray-200 rounded-xl p-4">

            {esAdmin ? (
              <div>

                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">

                  Módulo

                </label>

                <select

                  value={filterModulo}

                  onChange={(event) => setFilterModulo(event.target.value)}

                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[200px]"

                >

                  <option value="">Todos</option>

                  <option value={MODULO_RESOLUCION_256}>Resolución 256</option>

                  <option value={MODULO_EPIDEMIOLOGIA}>Epidemiología / IAAS</option>

                </select>

              </div>
            ) : (
              <p className="text-sm text-gray-600 pb-2">
                Módulo:{" "}
                <span className="font-medium text-gray-800">
                  {rolUsuario === ROLES.EPIDEMIOLOGIA
                    ? "Epidemiología / IAAS"
                    : "Resolución 256"}
                </span>
              </p>
            )}

            <div>

              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">

                Estado

              </label>

              <select

                value={filterEstado}

                onChange={(event) => setFilterEstado(event.target.value)}

                className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[180px]"

              >

                <option value="">Todos</option>

                {ESTADO_FILTROS.map((estado) => (

                  <option key={estado.value} value={estado.value}>

                    {estado.label}

                  </option>

                ))}

              </select>

            </div>

          </div>



          {selectedIds.size > 0 ? (

            <div className="sticky top-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 shadow-sm">

              <span className="text-sm font-medium text-pink-900">

                {selectedIds.size} plan{selectedIds.size === 1 ? "" : "es"} seleccionado

                {selectedIds.size === 1 ? "" : "s"}

              </span>

              <button

                type="button"

                disabled={bulkLoading}

                onClick={() => applyBulkStatus("CUMPLIDO")}

                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"

              >

                <CheckCircle2 size={16} />

                Marcar como cumplidos

              </button>

              <button

                type="button"

                disabled={bulkLoading}

                onClick={() => applyBulkStatus("NO_CUMPLIDO")}

                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"

              >

                <XCircle size={16} />

                Marcar como no cumplidos

              </button>

            </div>

          ) : null}



          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

            {loadingPlans ? (

              <p className="p-8 text-center text-sm text-gray-500">Cargando planes…</p>

            ) : plans.length === 0 ? (

              <p className="p-8 text-center text-sm text-gray-500">

                No hay planes de mejora con los filtros seleccionados.

              </p>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead>

                    <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs uppercase text-gray-500">

                      <th className="px-4 py-3 w-10">

                        <input

                          type="checkbox"

                          checked={allVisibleSelected}

                          onChange={toggleSelectAll}

                          aria-label="Seleccionar todos"

                        />

                      </th>

                      <th className="px-4 py-3">ID</th>

                      <th className="px-4 py-3">Módulo</th>

                      <th className="px-4 py-3 min-w-[220px]">Indicador</th>

                      <th className="px-4 py-3">Año</th>

                      <th className="px-4 py-3">Mes</th>

                      <th className="px-4 py-3">Responsable</th>

                      <th className="px-4 py-3">Fecha límite</th>

                      <th className="px-4 py-3">Estado</th>

                    </tr>

                  </thead>

                  <tbody>

                    {plans.map((plan) => (

                      <tr key={plan.id} className="border-b border-gray-100 hover:bg-gray-50/70">

                        <td className="px-4 py-3">

                          <input

                            type="checkbox"

                            checked={selectedIds.has(plan.id)}

                            onChange={() => toggleRow(plan.id)}

                            aria-label={`Seleccionar plan ${plan.id}`}

                          />

                        </td>

                        <td className="px-4 py-3 text-gray-600">{plan.id}</td>

                        <td className="px-4 py-3">

                          <span className="text-xs font-semibold text-pink-700">{plan.modulo}</span>

                        </td>

                        <td className="px-4 py-3 text-gray-800">{plan.indicador}</td>

                        <td className="px-4 py-3">{plan.year}</td>

                        <td className="px-4 py-3 capitalize">{plan.mes_nombre}</td>

                        <td className="px-4 py-3">

                          <div>{plan.responsable_nombre}</div>

                          <div className="text-xs text-gray-500">{plan.responsable_correo}</div>

                        </td>

                        <td className="px-4 py-3">{formatDate(plan.fecha_cumplimiento)}</td>

                        <td className="px-4 py-3">

                          <span

                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${estadoBadgeClass(plan.estado)}`}

                          >

                            {estadoLabel(plan.estado)}

                          </span>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </>

      )}



      <PlanMejoraModal

        alert={selectedAlert}

        onClose={() => setSelectedAlert(null)}

        onSaved={handlePlanSavedFromTab}

      />

    </div>

  );

}


