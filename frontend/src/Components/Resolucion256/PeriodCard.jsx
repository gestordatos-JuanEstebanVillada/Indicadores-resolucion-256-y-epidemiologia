export default function PeriodCard({ title, data }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-gray-700">
          {title}
        </span>

        <span className="text-lg font-bold text-pink-600">
          {data?.indicador === null || data?.indicador === undefined
            ? "—"
            : Number(data.indicador).toFixed(3)}
        </span>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <div className="flex justify-between">
          <span>Numerador</span>
          <strong>{data?.numerador ?? 0}</strong>
        </div>

        <div className="flex justify-between">
          <span>Denominador</span>
          <strong>{data?.denominador ?? 0}</strong>
        </div>
      </div>
    </div>
  );
}
