import { Save } from "lucide-react";

export default function FormActions({
  loading,
  onCancel,
}) {
  return (
    <div className="flex justify-end gap-3 mt-6">
      <button
        type="button"
        onClick={onCancel}
        className="px-5 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium"
      >
        Cancelar
      </button>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold shadow-sm"
      >
        <Save size={18} />
        {loading ? "Guardando..." : "Guardar información"}
      </button>
    </div>
  );
}
