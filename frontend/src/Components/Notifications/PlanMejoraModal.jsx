import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

import ModalOverlay from "../ModalOverlay";
import { API_URL, apiFetch } from "../../config/api";
import { dispatchIncumplimientosRefresh } from "../../utils/incumplimientosEvents";

const emptyForm = {
  observaciones: "",
  responsable_nombre: "",
  responsable_correo: "",
  fecha_cumplimiento: "",
};

export default function PlanMejoraModal({ alert, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(emptyForm);
    setError("");
  }, [alert]);

  if (!alert) {
    return null;
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (
      !form.observaciones.trim()
      || !form.responsable_nombre.trim()
      || !form.responsable_correo.trim()
      || !form.fecha_cumplimiento
    ) {
      setError("Complete todos los campos obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const response = await apiFetch(`${API_URL}/planes-mejora`, {
        method: "POST",
        body: JSON.stringify({
          calidad_id: alert.calidad_id,
          modulo: alert.modulo,
          year: alert.year,
          mes: alert.mes,
          valor_obtenido: alert.valor_obtenido,
          meta_institucional: alert.meta_institucional,
          observaciones: form.observaciones.trim(),
          responsable_nombre: form.responsable_nombre.trim(),
          responsable_correo: form.responsable_correo.trim(),
          fecha_cumplimiento: form.fecha_cumplimiento,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "No se pudo guardar el plan de mejora.");
      }

      onSaved(alert);
      dispatchIncumplimientosRefresh();
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalOverlay onBackdropClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Plan de mejora</h2>
            <p className="mt-1 text-sm text-gray-600">{alert.indicador}</p>
            <p className="text-xs text-gray-500 mt-1 capitalize">
              {alert.mes_nombre} {alert.year} · Meta: {alert.meta_institucional || "—"} ·
              Obtenido: {alert.valor_obtenido}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Observaciones / causa raíz
            </label>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={updateField}
              required
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Responsable — nombre
            </label>
            <input
              name="responsable_nombre"
              value={form.responsable_nombre}
              onChange={updateField}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Responsable — correo
            </label>
            <input
              type="email"
              name="responsable_correo"
              value={form.responsable_correo}
              onChange={updateField}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fecha a cumplir el plan
            </label>
            <input
              type="date"
              name="fecha_cumplimiento"
              value={form.fecha_cumplimiento}
              onChange={updateField}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar plan de mejora"}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
