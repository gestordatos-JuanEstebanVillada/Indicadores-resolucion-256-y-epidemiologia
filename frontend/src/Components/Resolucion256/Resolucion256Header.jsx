import { ArrowLeft } from "lucide-react";

export default function Resolucion256Header({
  year,
  onYearChange,
  onBack,
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
        >
          <ArrowLeft size={19} />
        </button>

        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Resolución 256
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Registro de indicadores de calidad
          </p>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">
          Año
        </label>

        <input
          type="number"
          value={year}
          onChange={(e) =>
            onYearChange(Number(e.target.value))
          }
          className="w-28 border border-gray-300 rounded-lg px-3 py-2 bg-white"
        />
      </div>
    </div>
  );
}
