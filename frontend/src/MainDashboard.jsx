import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  HeartPulse,
  Hospital,
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

import { API_URL, apiFetch } from "./config/api";
import { fetchAllIncumplimientos } from "./utils/fetchIncumplimientos";
import { INCUMPLIMIENTOS_REFRESH_EVENT } from "./utils/incumplimientosEvents";
import {
  MODULO_EPIDEMIOLOGIA,
  MODULO_RESOLUCION_256,
} from "./utils/moduleConstants";
import { recalculateVersionsFromApi } from "./utils/formatIndicator";

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

function normalizeKey(name) {
  return (name || "").trim().toLowerCase();
}

function uniqueIndicadoresFromVersions(versions) {
  const map = new Map();
  for (const version of versions || []) {
    const key = normalizeKey(version.indicador);
    if (!key) {
      continue;
    }
    if (!map.has(key)) {
      map.set(key, {
        nombre: version.indicador || "Sin nombre",
        formula: version.formula || "—",
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es")
  );
}

function countUniqueIndicadores(versions) {
  return uniqueIndicadoresFromVersions(versions).length;
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [r256Versions, setR256Versions] = useState([]);
  const [iaasVersions, setIaasVersions] = useState([]);
  const [pendingPlans, setPendingPlans] = useState([]);
  const [incidencias, setIncidencias] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openModule, setOpenModule] = useState(null);

  const currentYear = new Date().getFullYear();

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [r256Res, iaasRes, plansRes, incidenciasData] = await Promise.all([
        apiFetch(
          `${API_URL}/indicadores?modulo=${encodeURIComponent(MODULO_RESOLUCION_256)}`
        ),
        apiFetch(`${API_URL}/iaas/indicadores`),
        apiFetch(`${API_URL}/planes-mejora/todos?estado=PENDIENTE`),
        fetchAllIncumplimientos(),
      ]);

      if (r256Res.ok) {
        setR256Versions(recalculateVersionsFromApi(await r256Res.json()));
      } else {
        setR256Versions([]);
      }

      if (iaasRes.ok) {
        setIaasVersions(recalculateVersionsFromApi(await iaasRes.json()));
      } else {
        setIaasVersions([]);
      }

      if (plansRes.ok) {
        setPendingPlans(await plansRes.json());
      } else {
        setPendingPlans([]);
      }

      setIncidencias(incidenciasData);
    } catch {
      setR256Versions([]);
      setIaasVersions([]);
      setPendingPlans([]);
      setIncidencias([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    function onRefresh() {
      loadDashboard();
    }
    window.addEventListener(INCUMPLIMIENTOS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(INCUMPLIMIENTOS_REFRESH_EVENT, onRefresh);
  }, [loadDashboard]);

  const countR256 = useMemo(
    () => countUniqueIndicadores(r256Versions),
    [r256Versions]
  );
  const countIaas = useMemo(
    () => countUniqueIndicadores(iaasVersions),
    [iaasVersions]
  );
  const totalIndicadores = countR256 + countIaas;
  const atencionPendiente = pendingPlans.length + incidencias.length;

  const r256List = useMemo(
    () => uniqueIndicadoresFromVersions(r256Versions),
    [r256Versions]
  );
  const iaasList = useMemo(
    () => uniqueIndicadoresFromVersions(iaasVersions),
    [iaasVersions]
  );

  const doughnutData = useMemo(() => {
    if (totalIndicadores === 0) {
      return null;
    }
    return {
      labels: ["Resolución 256", "Epidemiología / IAAS"],
      datasets: [
        {
          data: [countR256, countIaas],
          backgroundColor: ["#db2777", "#0284c7"],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  }, [countR256, countIaas, totalIndicadores]);

  const barData = useMemo(() => {
    const counts = Array(12).fill(0);
    for (const item of incidencias) {
      if (item.year === currentYear && item.mes >= 1 && item.mes <= 12) {
        counts[item.mes - 1] += 1;
      }
    }
    const hasData = counts.some((value) => value > 0);
    if (!hasData) {
      return null;
    }
    return {
      labels: MONTH_SHORT,
      datasets: [
        {
          label: `Incidencias ${currentYear}`,
          data: counts,
          backgroundColor: "rgba(219, 39, 119, 0.75)",
          borderRadius: 6,
          maxBarThickness: 36,
        },
      ],
    };
  }, [incidencias, currentYear]);

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

  const doughnutOptions = {
    ...chartBaseOptions,
    cutout: "62%",
  };

  const barOptions = {
    ...chartBaseOptions,
    plugins: {
      ...chartBaseOptions.plugins,
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
      },
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
    return list.filter((item) =>
      item.nombre.toLowerCase().includes(searchLower)
    );
  }

  function toggleModule(moduleKey) {
    setOpenModule((current) => (current === moduleKey ? null : moduleKey));
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Panel general de calidad</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Activity} label="Total indicadores activos" value={totalIndicadores} />
        <KpiCard
          icon={HeartPulse}
          label="Indicadores Resolución 256"
          value={countR256}
          accentClass="text-pink-700"
        />
        <KpiCard
          icon={Hospital}
          label="Indicadores Infecciones"
          value={countIaas}
          accentClass="text-sky-700"
        />
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
          <p className="mt-0.5 text-xs text-gray-500">Proporción entre módulos activos</p>
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
            Incumplimientos por mes ({currentYear})
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
              Directorio global de indicadores
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Índice interactivo por módulo (nombre y fórmula).
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
          {[
            {
              key: MODULO_RESOLUCION_256,
              title: "Resolución 256",
              list: filterList(r256List),
              total: r256List.length,
            },
            {
              key: MODULO_EPIDEMIOLOGIA,
              title: "Epidemiología / IAAS",
              list: filterList(iaasList),
              total: iaasList.length,
            },
          ].map((section) => {
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
                      ({section.list.length}
                      {searchLower && section.list.length !== section.total
                        ? ` de ${section.total}`
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
                      {section.list.length === 0 ? (
                        <li className="px-4 py-6 text-center text-sm text-gray-500">
                          {searchLower
                            ? "No hay coincidencias con la búsqueda."
                            : "No hay indicadores en este módulo."}
                        </li>
                      ) : (
                        section.list.map((item) => (
                          <li
                            key={`${section.key}-${item.nombre}`}
                            className="px-4 py-3 hover:bg-gray-50/60"
                          >
                            <p className="text-sm font-medium text-gray-800">{item.nombre}</p>
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
