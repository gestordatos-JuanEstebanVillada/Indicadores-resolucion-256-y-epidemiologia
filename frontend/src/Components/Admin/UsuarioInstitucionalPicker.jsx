import React, { useCallback, useEffect, useState } from "react";

import { API_URL, apiFetch } from "../../config/api";

export default function UsuarioInstitucionalPicker({
  value,
  onSelect,
  disabled = false,
}) {
  const [query, setQuery] = useState(value || "");
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchOptions = useCallback(async (q) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sin_acceso: "true" });
      if (q?.trim()) {
        params.set("q", q.trim());
      }
      const response = await apiFetch(
        `${API_URL}/usuarios/institucionales?${params.toString()}`
      );
      if (!response.ok) {
        setOptions([]);
        return;
      }
      setOptions(await response.json());
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const timer = setTimeout(() => fetchOptions(query), 250);
    return () => clearTimeout(timer);
  }, [open, query, fetchOptions]);

  function pick(user) {
    onSelect(user);
    setQuery(user.usuario || "");
    setOpen(false);
  }

  return (
    <div className="relative block w-full text-sm text-gray-700">
      <label>
        Usuario institucional (login)
        <input
          required
          disabled={disabled}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            fetchOptions(query);
          }}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          placeholder="Buscar por login o nombre…"
          autoComplete="off"
        />
      </label>
      {open && !disabled ? (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <p className="px-3 py-2 text-xs text-gray-500">Buscando…</p>
          ) : options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-500">
              Sin coincidencias (solo usuarios sin acceso previo).
            </p>
          ) : (
            options.map((user) => (
              <button
                key={user.id}
                type="button"
                className="flex w-full flex-col items-start gap-0.5 border-b border-gray-50 px-3 py-2 text-left text-sm hover:bg-pink-50"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(user);
                }}
              >
                <span className="font-medium text-gray-800">{user.usuario}</span>
                <span className="text-xs text-gray-500">{user.nombres}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
