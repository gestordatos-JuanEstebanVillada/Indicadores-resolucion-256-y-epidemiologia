import React, { useCallback, useEffect, useMemo, useState } from "react";

import { API_URL, apiFetch } from "../config/api";
import { esAdminGlobal, getUserModulos } from "../utils/authRoles";

const PAGE_SIZE = 50;

function formatDate(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function logMatchesUsuario(rowUsuario, filterLogin) {
  if (!filterLogin) {
    return true;
  }
  const row = (rowUsuario || "").toUpperCase();
  const login = filterLogin.trim().toUpperCase();
  return row.includes(login) || row.includes(`(${login})`);
}

export default function AuditoriaList() {
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modulo, setModulo] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [search, setSearch] = useState("");

  const opcionesModulo = useMemo(() => {
    const filtrosGlobales = [
      { value: "INDICADORES", label: "Indicadores (sistema)" },
      { value: "PLANES_MEJORA", label: "Planes de mejora (sistema)" },
      { value: "USUARIOS", label: "Usuarios (sistema)" },
    ];
    const asignados = getUserModulos().map((c) => ({
      value: c,
      label: c,
    }));
    if (esAdminGlobal()) {
      return [...filtrosGlobales, ...asignados];
    }
    return asignados;
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const loadUsers = useCallback(async () => {
    try {
      const response = await apiFetch(`${API_URL}/usuarios?con_acceso=true`);
      if (response.ok) {
        setUsers(await response.json());
      }
    } catch {
      setUsers([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
      });
      if (modulo) {
        params.set("modulo", modulo);
      }
      const response = await apiFetch(`${API_URL}/auditoria?${params}`);
      if (!response.ok) {
        throw new Error("No se pudo cargar la auditoría.");
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setRows(data);
        setTotalCount(data.length);
      } else {
        setRows(data.items || []);
        setTotalCount(data.total_count ?? data.items?.length ?? 0);
      }
    } catch {
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [modulo, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [modulo]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filtroUsuario) {
      list = list.filter((row) => logMatchesUsuario(row.usuario, filtroUsuario));
    }
    const q = search.trim().toLowerCase();
    if (!q) {
      return list;
    }
    return list.filter(
      (row) =>
        (row.usuario || "").toLowerCase().includes(q) ||
        (row.detalle || "").toLowerCase().includes(q) ||
        (row.modulo || "").toLowerCase().includes(q) ||
        (row.accion || "").toLowerCase().includes(q)
    );
  }, [rows, search, filtroUsuario]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Historial de auditoría</h2>
        <p className="mt-1 text-sm text-gray-500">
          Registro de creaciones, ediciones y eliminaciones en indicadores, planes y usuarios.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Buscar en detalle, usuario, módulo…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={filtroUsuario}
          onChange={(event) => setFiltroUsuario(event.target.value)}
          className="min-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los usuarios</option>
          {users.map((user) => (
            <option key={user.id} value={user.usuario}>
              {user.nombres ? `${user.nombres} (${user.usuario})` : user.usuario}
            </option>
          ))}
        </select>
        <select
          value={modulo}
          onChange={(event) => setModulo(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los módulos</option>
          {opcionesModulo.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
        <span>
          Página {page} de {totalPages} ({totalCount} registros)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-gray-500">Cargando historial…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">No hay registros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Módulo</th>
                  <th className="px-4 py-3">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 align-top hover:bg-gray-50/60"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.usuario}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {row.accion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.modulo}</td>
                    <td className="max-w-xl px-4 py-3 text-gray-600">{row.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
