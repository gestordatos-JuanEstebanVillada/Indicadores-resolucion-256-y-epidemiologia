import { Loader2, Save } from "lucide-react";

export default function FormActions({
  loading,
  onCancel,
  readOnly = false,
}) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 focus-visible:ring-offset-2"
      >
        {readOnly ? "Volver" : "Cancelar"}
      </button>

      {!readOnly ? (
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" aria-hidden />
          ) : (
            <Save size={18} aria-hidden />
          )}
          {loading ? "Guardando..." : "Guardar información"}
        </button>
      ) : null}
    </div>
  );
}