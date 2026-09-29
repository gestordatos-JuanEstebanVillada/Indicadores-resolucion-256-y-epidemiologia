import { RefreshCcw } from "lucide-react";

import NumericInput from "./NumericInput";
import { months } from "./constants";

export default function MonthlyResultsTable({
  rows,
  onUpdateRow,
  onChangeValue,
  onResetForm,
  calculateIndicator,
  formatIndicator,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mt-6 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">
            Resultados mensuales
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Ingrese numerador y denominador para cada mes.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetForm}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
        >
          <RefreshCcw size={16} />
          Limpiar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                Mes
              </th>

              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase min-w-[300px]">
                Numerador
              </th>

              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase min-w-[300px]">
                Denominador
              </th>

              <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                Indicador
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => {
              const month = months[index];
              const indicatorValue = calculateIndicator(
                row.numerador,
                row.denominador
              );

              return (
                <tr
                  key={row.month}
                  className="border-b border-gray-100 hover:bg-gray-50/70"
                >
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-700">
                      {month.name}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <NumericInput
                      value={row.numerador}
                      onChange={(value) =>
                        onUpdateRow(index, "numerador", value)
                      }
                      onMinus={() =>
                        onChangeValue(index, "numerador", -1)
                      }
                      onPlus={() =>
                        onChangeValue(index, "numerador", 1)
                      }
                    />
                  </td>

                  <td className="px-6 py-4">
                    <NumericInput
                      value={row.denominador}
                      onChange={(value) =>
                        onUpdateRow(index, "denominador", value)
                      }
                      onMinus={() =>
                        onChangeValue(index, "denominador", -1)
                      }
                      onPlus={() =>
                        onChangeValue(index, "denominador", 1)
                      }
                    />
                  </td>

                  <td className="px-6 py-4 text-right">
                    <span
                      className={`
                        inline-flex
                        min-w-[90px]
                        justify-center
                        px-3
                        py-2
                        rounded-lg
                        font-semibold
                        text-sm
                        ${
                          indicatorValue === null
                            ? "bg-gray-100 text-gray-400"
                            : "bg-pink-50 text-pink-700"
                        }
                      `}
                    >
                      {formatIndicator(indicatorValue)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
