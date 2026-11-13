import React, { useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import { API_URL, apiFetch, readApiErrorMessage } from "../../config/api";

const emptyForm = {
  nombre: "",
  codigo: "",
  icono: "Folder",
};

/** Misma regla que app/modules/modulos/schemas.py::_normalize_codigo */
export function deriveModuloCodigo(value) {
  if (!value) {
    return "";
  }
  return Array.from(value.trim().toUpperCase().replace(/ /g, "_"))
    .map((char) => (/^[A-Z0-9]$/i.test(char) ? char : "_"))
    .join("")
    .replace(/^_+|_+$/g, "");
}

export default function CrearModulo({ onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [codigoManual, setCodigoManual] = useState(false);

  function handleNombreChange(nombre) {
    setForm((f) => {
      const next = { ...f, nombre };
      if (!codigoManual) {
        next.codigo = deriveModuloCodigo(nombre);
      }
      return next;
    });
    setFormError("");
  }

  function handleCodigoChange(codigo) {
    setCodigoManual(Boolean(codigo.trim()));
    setForm((f) => ({ ...f, codigo: deriveModuloCodigo(codigo) || codigo.toUpperCase() }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    const nombre = form.nombre.trim();
    const codigo = deriveModuloCodigo(form.codigo.trim() || nombre);
    const icono = form.icono.trim() || "Folder";

    if (!nombre) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    if (!codigo || /\s/.test(codigo)) {
      setFormError(
        "No se pudo generar un código válido. Use letras, números y guiones bajos (ej. SEGURIDAD_SALUD)."
      );
      return;
    }

    setLoading(true);
    try {
      const body = {
        nombre,
        codigo,
        icono,
        estado: "ACTIVO",
      };
      const response = await apiFetch(`${API_URL}/modulos`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const message = await readApiErrorMessage(
          response,
          "No se pudo crear el módulo"
        );
        setFormError(message);
        toast.error(message);
        return;
      }
      const created = await response.json();
      toast.success(`Módulo «${created.nombre}» creado (${created.codigo})`);
      setForm(emptyForm);
      setCodigoManual(false);
      onCreated?.(created);
    } catch (error) {
      const message = error?.message || "Error al crear módulo";
      setFormError(message);
      toast.error(message);
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
      {formError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {formError}
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm">
          <span className="text-gray-600">Nombre visible</span>
          <input
            required
            value={form.nombre}
            onChange={(e) => handleNombreChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Seguridad y Salud"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Código</span>
          <input
            required
            value={form.codigo}
            onChange={(e) => handleCodigoChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
            placeholder="SEGURIDAD_SALUD"
          />
          <span className="mt-1 block text-xs text-gray-400">
            Se genera desde el nombre; puede editarlo antes de crear.
          </span>
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Icono Lucide o emoji</span>
          <input
            required
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
