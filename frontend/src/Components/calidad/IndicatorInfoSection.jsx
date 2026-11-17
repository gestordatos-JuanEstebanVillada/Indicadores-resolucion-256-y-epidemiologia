import { FileSpreadsheet } from "lucide-react";

import MetaInstitucionalFields from "./MetaInstitucionalFields";

export default function IndicatorInfoSection({
  indicador,
  formula,
  meta,
  observatorio,
  onIndicadorChange,
  onFormulaChange,
  onMetaChange,
  onObservatorioChange,
  sectionSubtitle = "Complete los datos de cabecera del indicador",
}) {
  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100";

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50">
          <FileSpreadsheet
            size={21}
            className="text-pink-600"
          />
        </div>

        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Información del indicador
          </h3>

          <p className="mt-0.5 text-sm text-gray-500">
            {sectionSubtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-gray-800">
            Indicador
          </label>

          <textarea
            rows={2}
            value={indicador}
            onChange={(e) => onIndicadorChange(e.target.value)}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <MetaInstitucionalFields
            value={meta}
            onChange={onMetaChange}
            label="Meta institucional"
          />
        </div>

        <div className="lg:col-span-3">
          <label className="mb-2 block text-sm font-semibold text-gray-800">
            Fórmula
          </label>

          <textarea
            rows={2}
            value={formula}
            onChange={(e) => onFormulaChange(e.target.value)}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="lg:col-span-3">
          <label className="mb-2 block text-sm font-semibold text-gray-800">
            Observatorio
          </label>

          <input
            value={observatorio}
            onChange={(e) => onObservatorioChange(e.target.value)}
            placeholder="Valor del observatorio (ej. 9,24)"
            className={inputClass}
          />
        </div>
      </div>
    </section>
  );
}
