import { FileSpreadsheet } from "lucide-react";

export default function IndicatorInfoSection({
  indicador,
  formula,
  meta,
  observatorio,
  onIndicadorChange,
  onFormulaChange,
  onMetaChange,
  onObservatorioChange,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center">
          <FileSpreadsheet
            size={21}
            className="text-pink-600"
          />
        </div>

        <div>
          <h3 className="font-semibold text-gray-800">
            Información del indicador
          </h3>

          <p className="text-sm text-gray-500">
            Datos generales de la Resolución 256
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Indicador
          </label>

          <textarea
            rows={2}
            value={indicador}
            onChange={(e) => onIndicadorChange(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-100 focus:border-pink-500 outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meta institucional
          </label>

          <input
            value={meta}
            onChange={(e) => onMetaChange(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-100 focus:border-pink-500 outline-none"
          />
        </div>

        <div className="lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fórmula
          </label>

          <textarea
            rows={2}
            value={formula}
            onChange={(e) => onFormulaChange(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-100 focus:border-pink-500 outline-none resize-none"
          />
        </div>

        <div className="lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observatorio
          </label>

          <input
            value={observatorio}
            onChange={(e) => onObservatorioChange(e.target.value)}
            placeholder="Valor del observatorio (ej. 9,24)"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-100 focus:border-pink-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
}
