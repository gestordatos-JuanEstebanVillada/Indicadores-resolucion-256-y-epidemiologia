import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { BarChart3, LineChart, TrendingUp } from "lucide-react";
import {
  formatIndicatorRowDisplay,
  recalculateVersionsFromApi,
  resolveIndicatorValue,
  toChartIndicatorDisplayValue,
} from "./utils/formatIndicator";
import { MODULO_RESOLUCION_256 } from "./utils/moduleConstants";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_URL = "http://127.0.0.1:8000/api";

const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const YEAR_COLORS = [
  { border: "rgb(219, 39, 119)", background: "rgba(219, 39, 119, 0.12)" },
  { border: "rgb(75, 85, 99)", background: "rgba(75, 85, 99, 0.12)" },
  { border: "rgb(244, 114, 182)", background: "rgba(244, 114, 182, 0.12)" },
  { border: "rgb(107, 114, 128)", background: "rgba(107, 114, 128, 0.12)" },
];

function normalizeIndicadorKey(indicador) {
  return (indicador || "").trim().toLowerCase();
}

function sortVersionsByYearDesc(group) {
  return [...group].sort((a, b) => {
    if (b.year !== a.year) {
      return b.year - a.year;
    }

    return b.mes_inicio - a.mes_inicio;
  });
}

function getVersionForYear(group, year) {
  const yearVersions = group.filter((version) => version.year === year);

  return sortVersionsByYearDesc(yearVersions)[0] ?? null;
}

function toChartVolumeValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const num = Number(value);

  if (!Number.isFinite(num)) {
    return null;
  }

  return num;
}

function parseMetaValue(meta) {
  if (!meta) {
    return null;
  }

  const match = String(meta).match(/[\d.]+/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);

  return Number.isFinite(parsed) ? parsed : null;
}

function groupVersionsByIndicador(versions) {
  const groups = versions.reduce((acc, version) => {
    const key = normalizeIndicadorKey(version.indicador);

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(version);
    return acc;
  }, {});

  return Object.entries(groups)
    .map(([key, group]) => ({
      key,
      name: group[0]?.indicador || "Sin nombre",
      versions: sortVersionsByYearDesc(group),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index",
    intersect: false,
  },
  plugins: {
    legend: {
      position: "top",
      labels: {
        usePointStyle: true,
        boxWidth: 8,
        font: { size: 12 },
      },
    },
    tooltip: {
      backgroundColor: "rgba(17, 24, 39, 0.92)",
      titleFont: { size: 13 },
      bodyFont: { size: 12 },
      padding: 12,
      cornerRadius: 8,
    },
  },
};

export default function IndicadoresCharts() {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedBarYear, setSelectedBarYear] = useState("");

  useEffect(() => {
    async function loadVersions() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/indicadores?modulo=${encodeURIComponent(MODULO_RESOLUCION_256)}`
        );

        if (!response.ok) {
          throw new Error("No se pudieron cargar los indicadores.");
        }

        setVersions(recalculateVersionsFromApi(await response.json()));
      } catch (loadError) {
        setError(loadError.message || "Error al cargar los datos.");
      } finally {
        setLoading(false);
      }
    }

    loadVersions();
  }, []);

  const indicatorGroups = useMemo(
    () => groupVersionsByIndicador(versions),
    [versions]
  );

  const selectedGroup = useMemo(
    () =>
      indicatorGroups.find((group) => group.key === selectedKey) ??
      indicatorGroups[0] ??
      null,
    [indicatorGroups, selectedKey]
  );

  const availableYears = useMemo(() => {
    if (!selectedGroup) {
      return [];
    }

    return [...new Set(selectedGroup.versions.map((v) => v.year))]
      .filter(Boolean)
      .sort((a, b) => b - a);
  }, [selectedGroup]);

  useEffect(() => {
    if (!selectedKey && indicatorGroups.length > 0) {
      setSelectedKey(indicatorGroups[0].key);
    }
  }, [indicatorGroups, selectedKey]);

  useEffect(() => {
    if (
      availableYears.length > 0 &&
      !availableYears.includes(Number(selectedBarYear))
    ) {
      setSelectedBarYear(String(availableYears[0]));
    }
  }, [availableYears, selectedBarYear]);

  const metaValue = useMemo(() => {
    if (!selectedGroup) {
      return null;
    }

    const latest = selectedGroup.versions[0];
    return parseMetaValue(latest?.meta_institucional);
  }, [selectedGroup]);

  const lineChartData = useMemo(() => {
    if (!selectedGroup) {
      return { labels: MONTH_LABELS, datasets: [] };
    }

    const datasets = availableYears.map((year, index) => {
      const version = getVersionForYear(selectedGroup.versions, year);
      const palette = YEAR_COLORS[index % YEAR_COLORS.length];

      return {
        label: `Indicador ${year}`,
        data: (version?.rows ?? []).map((row) =>
          toChartIndicatorDisplayValue(
            resolveIndicatorValue(row, version?.formula, version?.indicador),
            version?.formula
          )
        ),
        borderColor: palette.border,
        backgroundColor: palette.background,
        pointBackgroundColor: palette.border,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        tension: 0.3,
        spanGaps: false,
      };
    });

    if (metaValue !== null) {
      datasets.push({
        label: `Meta (${metaValue})`,
        data: MONTH_LABELS.map(() => metaValue),
        borderColor: "rgb(234, 179, 8)",
        backgroundColor: "transparent",
        borderWidth: 2,
        borderDash: [8, 6],
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
      });
    }

    return {
      labels: MONTH_LABELS,
      datasets,
    };
  }, [selectedGroup, availableYears, metaValue]);

  const barChartData = useMemo(() => {
    const year = Number(selectedBarYear);
    const version = selectedGroup
      ? getVersionForYear(selectedGroup.versions, year)
      : null;

    const rows = version?.rows ?? [];

    return {
      labels: MONTH_LABELS,
      rows,
      formula: version?.formula,
      indicadorName: selectedGroup?.name ?? version?.indicador ?? "",
      datasets: [
        {
          label: "Numerador",
          data: rows.map((row) => toChartVolumeValue(row.numerador)),
          backgroundColor: "rgba(219, 39, 119, 0.75)",
          borderColor: "rgb(219, 39, 119)",
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: "Denominador",
          data: rows.map((row) => toChartVolumeValue(row.denominador)),
          backgroundColor: "rgba(107, 114, 128, 0.65)",
          borderColor: "rgb(75, 85, 99)",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }, [selectedGroup, selectedBarYear]);

  const lineChartOptions = useMemo(
    () => ({
      ...baseChartOptions,
      plugins: {
        ...baseChartOptions.plugins,
        title: {
          display: false,
        },
        tooltip: {
          ...baseChartOptions.plugins.tooltip,
          callbacks: {
            label(context) {
              const value = context.parsed.y;

              if (value === null || value === undefined) {
                return `${context.dataset.label}: Sin dato`;
              }

              return `${context.dataset.label}: ${Number(value).toFixed(1)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(229, 231, 235, 0.8)" },
          ticks: { font: { size: 11 } },
          title: {
            display: true,
            text: "Valor del indicador",
            font: { size: 12 },
          },
        },
      },
    }),
    []
  );

  const barChartOptions = useMemo(() => {
    const rows = barChartData.rows ?? [];
    const formula = barChartData.formula;
    const indicadorName = barChartData.indicadorName ?? "";

    return {
      ...baseChartOptions,
      plugins: {
        ...baseChartOptions.plugins,
        tooltip: {
          ...baseChartOptions.plugins.tooltip,
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${Math.round(context.parsed.y)}`;
            },
            footer(tooltipItems) {
              if (!tooltipItems || tooltipItems.length === 0) {
                return "";
              }

              const dataIndex = tooltipItems[0].dataIndex;
              const row = rows[dataIndex];

              if (row) {
                const label = formatIndicatorRowDisplay(row, formula, indicadorName);
                if (label !== "—") {
                  return `Indicador: ${label}`;
                }
              }

              return "Indicador: -";
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(229, 231, 235, 0.8)" },
          ticks: {
            font: { size: 11 },
            callback(value) {
              return Math.round(Number(value)).toString();
            },
          },
          title: {
            display: true,
            text: "Volumen",
            font: { size: 12 },
          },
        },
      },
    };
  }, [barChartData]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Gráficos de indicadores
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Visualización analítica del comportamiento mensual por año.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Cargando indicadores...</p>
      ) : indicatorGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          Aún no hay indicadores para graficar.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-medium text-gray-700">
              Indicador a graficar
              <select
                value={selectedGroup?.key ?? ""}
                onChange={(event) => setSelectedKey(event.target.value)}
                className="mt-2 block w-full max-w-3xl rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              >
                {indicatorGroups.map((group) => (
                  <option key={group.key} value={group.key}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedGroup && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                <span>
                  <strong className="text-gray-800">Años:</strong>{" "}
                  {availableYears.join(", ") || "—"}
                </span>
                {metaValue !== null && (
                  <span>
                    <strong className="text-gray-800">Meta:</strong>{" "}
                    {selectedGroup.versions[0]?.meta_institucional}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50">
                  <LineChart size={20} className="text-pink-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    Comportamiento del indicador
                  </h3>
                  <p className="text-sm text-gray-500">
                    Comparativa anual mes a mes
                  </p>
                </div>
              </div>

              <div className="h-80">
                <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50">
                    <BarChart3 size={20} className="text-pink-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Numerador vs denominador
                    </h3>
                    <p className="text-sm text-gray-500">
                      Volumen mensual por año
                    </p>
                  </div>
                </div>

                <label className="text-sm text-gray-600">
                  Año
                  <select
                    value={selectedBarYear}
                    onChange={(event) =>
                      setSelectedBarYear(event.target.value)
                    }
                    className="ml-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="h-80">
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
