import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Search,
} from "lucide-react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

import { API_URL, apiFetch } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { INCUMPLIMIENTOS_REFRESH_EVENT } from "../utils/incumplimientosEvents";
import { esAdminGlobal, getUserModulos } from "../utils/authRoles";
import NoModulosActivos from "../Components/NoModulosActivos";
import { fetchModulosActivos } from "../utils/modulosCatalog";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const MONTH_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const ALL_MODULOS_VALUE = "";

const CHART_COLORS = [
  "#db2777",
  "#0284c7",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#dc2626",
];

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((id) => (
          <div key={id} className="h-28 rounded-xl bg-gray-200/80" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-xl bg-gray-200/80" />
        <div className="h-80 rounded-xl bg-gray-200/80" />
      </div>
      <div className="h-64 rounded-xl bg-gray-200/80" />
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accentClass = "text-gray-900" }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${accentClass}`}>
            {value}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2.5 text-gray-500">
          <Icon size={22} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

function ChartEmpty({ message }) {
  return (
    <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

export default function MainDashboard() {
  const { ready, authenticated, token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [graficos, setGraficos] = useState(null);
  const [moduloOptions, setModuloOptions] = useState([]);
  const [selectedModulo, setSelectedModulo] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openModule, setOpenModule] = useState(null);
  const [catalogReady, setCatalogReady] = useState(false);

  const selectorBloqueado = moduloOptions.length <= 1;

  const tituloModulo = useMemo(() => {
    if (selectedModulo === ALL_MODULOS_VALUE) {
      return "Todos los módulos";
    }
    const hit = moduloOptions.find((o) => o.value === selectedModulo);
    return hit?.label || selectedModulo || "…";
  }, [moduloOptions, selectedModulo]);

  useEffect(() => {
    let cancelled = false;
    async function loadOpciones() {
      const catalogo = await fetchModulosActivos();
      const permitidos = esAdminGlobal()
        ? catalogo.map((m) => (m.codigo || "").toUpperCase())
        : getUserModulos();
      const opciones = catalogo
        .filter((m) => permitidos.includes((m.codigo || "").toUpperCase()))
        .map((m) => ({
          value: (m.codigo || "").toUpperCase(),
          label: m.nombre || m.codigo,
        }));
      if (esAdminGlobal()) {
        opciones.unshift({
          value: ALL_MODULOS_VALUE,
          label: "Todos los módulos",
        });
      }
      if (!cancelled) {
        setModuloOptions(opciones);
        if (opciones.length > 0) {
          setSelectedModulo(opciones[0].value);
        } else {
          setSelectedModulo(ALL_MODULOS_VALUE);
        }
        setCatalogReady(true);
      }
    }
    if (ready && authenticated) {
      setCatalogReady(false);
      loadOpciones();
    }
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated]);

  const loadDashboard = useCallback(async () => {
    if (selectedModulo === null) {
      return;
    }
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedModulo) {
        params.set("modulo", selectedModulo);
      }
      const q = params.toString();
      const suffix = q ? `?${q}` : "";
      const [statsRes, grafRes] = await Promise.all([
        apiFetch(`${API_URL}/dashboard/stats${suffix}`),
        apiFetch(`${API_URL}/dashboard/graficos${suffix}`),
      ]);
      if (statsRes.ok) {
        setStats(await statsRes.json());
      } else {
        setStats(null);
      }
      if (grafRes.ok) {
        setGraficos(await grafRes.json());
      } else {
        setGraficos(null);
      }
    } catch {
      setStats(null);
      setGraficos(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedModulo]);

  useEffect(() => {
    if (!ready || !authenticated || !token || selectedModulo === null) {
      return;
    }
    loadDashboard();
    function onRefresh() {
      loadDashboard();
    }
    window.addEventListener(INCUMPLIMIENTOS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(INCUMPLIMIENTOS_REFRESH_EVENT, onRefresh);
  }, [loadDashboard, ready, authenticated, token, selectedModulo]);

  const directorioPorModulo = useMemo(() => {
    const map = new Map();
    for (const item of stats?.directorio || []) {
      const codigo = (item.modulo || "").toUpperCase();
      if (!map.has(codigo)) {
        map.set(codigo, []);
      }
      map.get(codigo).push(item);
    }
    return map;
  }, [stats]);

  const seccionesDirectorio = useMemo(() => {
    const opcionesVisibles =
      selectedModulo === ALL_MODULOS_VALUE
        ? moduloOptions.filter((o) => o.value !== ALL_MODULOS_VALUE)
        : moduloOptions.filter((o) => o.value === selectedModulo);
    return opcionesVisibles.map((opt) => ({
      key: opt.value,
      title: opt.label,
      list: directorioPorModulo.get(opt.value) || [],
    }));
  }, [directorioPorModulo, moduloOptions, selectedModulo]);

  const doughnutData = useMemo(() => {
    const dist = graficos?.distribucion_modulos || [];
    if (!dist.length) {
      return null;
    }
    return {
      labels: dist.map(
        (row) =>
          moduloOptions.find((o) => o.value === row.codigo)?.label || row.codigo
      ),
      datasets: [
        {
          data: dist.map((row) => row.cantidad),
          backgroundColor: dist.map(
            (_, i) => CHART_COLORS[i % CHART_COLORS.length]
          ),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  }, [graficos, moduloOptions]);

  const barData = useMemo(() => {
    const counts = graficos?.incidencias_por_mes || [];
    if (!counts.some((v) => v > 0)) {
      return null;
    }
    return {
      labels: MONTH_SHORT,
      datasets: [
        {
          label: `Incidencias ${graficos?.año || new Date().getFullYear()}`,
          data: counts,
          backgroundColor: "rgba(219, 39, 119, 0.75)",
          borderRadius: 6,
          maxBarThickness: 36,
        },
      ],
    };
  }, [graficos]);

  const chartBaseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { usePointStyle: true, boxWidth: 8, padding: 16 },
      },
    },
  };

  const doughnutOptions = { ...chartBaseOptions, cutout: "62%" };

  const barOptions = {
    ...chartBaseOptions,
    plugins: { ...chartBaseOptions.plugins, legend: { display: false } },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, precision: 0 },
        grid: { color: "rgba(0,0,0,0.06)" },
        border: { display: false },
      },
    },
  };

  const searchLower = searchTerm.trim().toLowerCase();

  function filterList(list) {
    if (!searchLower) {
      return list;
    }
    return list.filter(
      (item) =>
        (item.nombre || "").toLowerCase().includes(searchLower) ||
        (item.formula || "").toLowerCase().includes(searchLower)
    );
  }

  function toggleModule(moduleKey) {
    setOpenModule((current) => (current === moduleKey ? null : moduleKey));
  }

  if (!ready || !authenticated || !catalogReady) {
    return <DashboardSkeleton />;
  }

  if (!esAdminGlobal() && getUserModulos().length === 0) {
    return <NoModulosActivos />;
  }

  if (moduloOptions.length === 0) {
    return <NoModulosActivos />;
  }

  if (selectedModulo === null || isLoading) {
    return <DashboardSkeleton />;
  }

  const totalIndicadores = stats?.total_indicadores ?? 0;
  const atencionPendiente =
    (stats?.planes_pendientes ?? 0) + (stats?.incidencias_pendientes ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Panel general — {tituloModulo}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            KPIs y gráficos según sus accesos en Indicadores.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm text-gray-600 sm:min-w-[220px]">
          <span className="text-xs font-semibold uppercase text-gray-500">
            Módulo
          </span>
          <select
            value={selectedModulo ?? ""}
            disabled={selectorBloqueado}
            onChange={(event) => setSelectedModulo(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            {moduloOptions.map((opt) => (
              <option key={opt.value || "__all__"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Activity}
          label="Indicadores activos (vista actual)"
          value={totalIndicadores}
        />
        {(stats?.indicadores_por_modulo || []).slice(0, 2).map((row, index) => (
          <KpiCard
            key={row.codigo}
            icon={Activity}
            label={
              moduloOptions.find((o) => o.value === row.codigo)?.label ||
              row.codigo
            }
            value={row.cantidad}
            accentClass={index === 0 ? "text-pink-700" : "text-sky-700"}
          />
        ))}
        <KpiCard
          icon={AlertTriangle}
          label="Alertas y planes pendientes"
          value={atencionPendiente}
          accentClass="text-amber-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800">
            Distribución de indicadores por módulo
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">Proporción en la vista actual</p>
          <div className="mt-4 h-72">
            {doughnutData ? (
              <Doughnut data={doughnutData} options={doughnutOptions} />
            ) : (
              <ChartEmpty message="No hay datos suficientes para graficar" />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800">
            Incumplimientos por mes ({graficos?.año || new Date().getFullYear()})
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Incidencias sin plan de mejora registrado
          </p>
          <div className="mt-4 h-72">
            {barData ? (
              <Bar data={barData} options={barOptions} />
            ) : (
              <ChartEmpty message="No hay incidencias registradas para el año actual" />
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Directorio de indicadores
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Índice por módulo según la selección actual.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar indicador…"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
            />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {seccionesDirectorio.map((section) => {
            const list = filterList(section.list);
            const isOpen = openModule === section.key;
            return (
              <div
                key={section.key}
                className="overflow-hidden rounded-xl border border-gray-200"
              >
                <button
                  type="button"
                  onClick={() => toggleModule(section.key)}
                  className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left transition hover:bg-gray-100/80"
                >
                  <span className="font-semibold text-gray-800">
                    {section.title}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({list.length}
                      {searchLower && list.length !== section.list.length
                        ? ` de ${section.list.length}`
                        : ""}{" "}
                      indicadores)
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-gray-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <ul className="divide-y divide-gray-100 border-t border-gray-100 bg-white">
                      {list.length === 0 ? (
                        <li className="px-4 py-6 text-center text-sm text-gray-500">
                          {searchLower
                            ? "No hay coincidencias con la búsqueda."
                            : "No hay indicadores en este módulo."}
                        </li>
                      ) : (
                        list.map((item) => (
                          <li
                            key={`${section.key}-${item.nombre}`}
                            className="px-4 py-3 hover:bg-gray-50/60"
                          >
                            <p className="text-sm font-medium text-gray-800">
                              {item.nombre}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              Fórmula: {item.formula}
                            </p>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
