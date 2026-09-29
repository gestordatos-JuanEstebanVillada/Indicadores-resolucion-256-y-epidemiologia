import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  X,
} from "lucide-react";

const statusConfig = {
  ok: {
    label: "Listo",
    className: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  warning: {
    label: "Advertencia",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: AlertTriangle,
  },
  error: {
    label: "Error",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: AlertCircle,
  },
};

function closeOnBackdrop(event, onClose) {
  if (event.target === event.currentTarget) {
    onClose();
  }
}

export default function ExcelUploadPreviewModal({
  summary,
  loading,
  onConfirm,
  onClose,
}) {
  if (!summary) {
    return null;
  }

  const { totals } = summary;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => closeOnBackdrop(event, onClose)}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50">
              <FileSpreadsheet
                size={20}
                className="text-pink-600"
              />
            </div>

            <div>
              <h3 className="font-semibold text-gray-800">
                Resumen de carga Excel
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {summary.fileName}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Formato:{" "}
                {summary.format === "tablero"
                  ? `Tablero oficial (${summary.sheetName})`
                  : "Plantilla simple"}
                {summary.year ? ` · Año ${summary.year}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-gray-100 bg-gray-50 px-6 py-4 md:grid-cols-4">
          <StatCard
            label="Indicadores"
            value={totals.indicadores}
          />
          <StatCard
            label="Listos"
            value={totals.listos}
            tone="green"
          />
          <StatCard
            label="Advertencias"
            value={totals.conAdvertencias}
            tone="amber"
          />
          <StatCard
            label="Errores"
            value={totals.conErrores}
            tone="red"
          />
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <p className="mb-3 text-sm text-gray-600">
            Revise qué se cargará correctamente y qué requiere atención
            antes de aplicar los datos al formulario.
          </p>

          <div className="space-y-3">
            {summary.items.map((item) => {
              const config = statusConfig[item.status];
              const Icon = config.icon;

              return (
                <div
                  key={item.index}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Indicador {item.index}
                      </p>
                      <p className="mt-1 font-medium text-gray-800">
                        {item.nombre}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
                    >
                      <Icon size={14} />
                      {config.label}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                    <p>
                      <span className="text-gray-500">Fórmula:</span>{" "}
                      {item.formula}
                    </p>
                    <p>
                      <span className="text-gray-500">Meta:</span>{" "}
                      {item.meta}
                    </p>
                    <p>
                      <span className="text-gray-500">Meses cargados:</span>{" "}
                      {item.mesesCargados}
                    </p>
                    <p>
                      <span className="text-gray-500">Meses faltantes:</span>{" "}
                      {item.mesesFaltantes.length > 0
                        ? item.mesesFaltantes.join(", ")
                        : "Ninguno"}
                    </p>
                  </div>

                  {item.issues.length > 0 && (
                    <ul className="mt-3 space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                      {item.issues.map((issue) => (
                        <li
                          key={issue}
                          className="flex items-start gap-2"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {summary.totals.filasIgnoradas > 0 && (
            <p className="mt-4 text-sm text-amber-700">
              {summary.totals.filasIgnoradas} fila(s) del Excel no se
              procesaron por datos inválidos.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !summary.canConfirm}
            className="rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-60"
          >
            {loading
              ? "Aplicando..."
              : summary.format === "tablero" && totals.indicadores > 1
                ? `Confirmar carga (${totals.indicadores} indicadores)`
                : "Confirmar carga"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = "default" }) {
  const toneClasses = {
    default: "text-gray-800",
    green: "text-green-700",
    amber: "text-amber-700",
    red: "text-red-700",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${toneClasses[tone]}`}>
        {value}
      </p>
    </div>
  );
}
