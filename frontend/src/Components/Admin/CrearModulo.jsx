import React, { useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import { API_URL, apiFetch, readApiErrorMessage } from "../../config/api";

const emptyForm = {
  nombre: "",
  codigo: "",
  icono: "Folder",
};

export default function CrearModulo({ onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const body = {
        nombre: form.nombre.trim(),
        icono: form.icono.trim() || "Folder",
      };
      if (form.codigo.trim()) {
        body.codigo = form.codigo.trim();
      }
      const response = await apiFetch(`${API_URL}/modulos`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, "No se pudo crear el módulo"));
      }
      const created = await response.json();
      toast.success(`Módulo «${created.nombre}» creado (${created.codigo})`);
      setForm(emptyForm);
      onCreated?.(created);
    } catch (error) {
      toast.error(error.message || "Error al crear módulo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
    >
      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
        <Plus size={18} className="text-pink-600" />
        Registrar nuevo módulo
      </h3>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm">
          <span className="text-gray-600">Nombre visible</span>
          <input
            required
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Urgencias"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Código (opcional)</span>
          <input
            value={form.codigo}
            onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="URGENCIAS"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Icono Lucide o emoji</span>
          <input
            value={form.icono}
            onChange={(e) => setForm((f) => ({ ...f, icono: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Hospital o 🏥"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-50"
      >
        {loading ? "Guardando…" : "Crear módulo"}
      </button>
    </form>
  );
}
