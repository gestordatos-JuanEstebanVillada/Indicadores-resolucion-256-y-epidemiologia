import { Minus, Plus } from "lucide-react";

export default function NumericInput({
  value,
  onChange,
  onMinus,
  onPlus,
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center border border-gray-300 rounded-xl overflow-hidden bg-white focus-within:border-pink-500 focus-within:ring-2 focus-within:ring-pink-100">
        <button
          type="button"
          onClick={onMinus}
          className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 text-gray-500 border-r border-gray-200"
          title="Disminuir"
        >
          <Minus size={17} />
        </button>

        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 px-4 py-2.5 outline-none text-gray-800"
          inputMode="decimal"
        />

        <button
          type="button"
          onClick={onPlus}
          className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 text-gray-500 border-l border-gray-200"
          title="Aumentar"
        >
          <Plus size={17} />
        </button>
      </div>

      <div className="flex gap-1">
        {[10, 100].map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() =>
              onChange((Number(value) || 0) + amount)
            }
            className="px-2.5 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-600"
          >
            +{amount}
          </button>
        ))}
      </div>
    </div>
  );
}
