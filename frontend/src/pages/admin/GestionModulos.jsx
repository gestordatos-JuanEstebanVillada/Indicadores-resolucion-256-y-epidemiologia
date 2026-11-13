import React, { useCallback, useEffect, useState } from "react";
import {
  Edit3,
  FolderPlus,
  Trash2,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import CrearModulo from "../../Components/Admin/CrearModulo";
import ModalOverlay from "../../Components/ModalOverlay";
import { API_URL, apiFetch, readApiErrorMessage } from "../../config/api";
import {
  fetchModulosCatalog,
  resolveModuloDeleteKey,
  resolveModuloIcon,
} from "../../utils/modulosCatalog";

const emptyEdit = {
  nombre: "",
  icono: "",
  codigo_nuevo: "",
};

export default function GestionModulos() {
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [usuariosModal, setUsuariosModal] = useState(null);
  const [usuariosModulo, setUsuariosModulo] = useState([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadModulos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchModulosCatalog({ soloActivos: false });
      setModulos(data);
    } catch {
      setModulos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModulos();
  }, [loadModulos]);

  function openEdit(modulo) {
    setEditing(modulo);
    setEditForm({
      nombre: modulo.nombre || "",
      icono: modulo.icono || "Folder",
      codigo_nuevo: modulo.codigo || "",
    });
  }

  function closeEdit() {
    setEditing(null);
    setEditForm(emptyEdit);
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editing) {
      return;
    }
    try {
      const body = {
        nombre: editForm.nombre.trim(),
        icono: editForm.icono.trim() || "Folder",
      };
      const nuevo = editForm.codigo_nuevo.trim().toUpperCase();
      if (nuevo && nuevo !== editing.codigo) {
        body.codigo_nuevo = nuevo;
      }
      const editKey = resolveModuloDeleteKey(editing);
      if (!editKey) {
        throw new Error(
          "El módulo no tiene ID ni código válido; recargue la página."
        );
      }
      const response = await apiFetch(
        `${API_URL}/modulos/${encodeURIComponent(editKey)}`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        }
      );
      if (!response.ok) {
        const message = await readApiErrorMessage(
          response,
          "No se pudo actualizar el módulo."
        );
        throw new Error(message);
      }
      toast.success("Módulo actualizado en Oracle");
      closeEdit();
      await loadModulos();
    } catch (error) {
      toast.error(error.message || "Error al guardar.");
    }
  }

  async function handleDelete(modulo) {
    setDeleteError("");
    if (
      !window.confirm(
        `¿Eliminar permanentemente el módulo «${modulo.nombre}» (${modulo.codigo}) del catálogo?`
      )
    ) {
      return;
    }

    const deleteKey = resolveModuloDeleteKey(modulo);
    if (!deleteKey) {
      const msg =
        "No se puede eliminar: el módulo no tiene ID ni código válido en el catálogo.";
      setDeleteError(msg);
      toast.error(msg);
      return;
    }

    try {
      const response = await apiFetch(
        `${API_URL}/modulos/${encodeURIComponent(deleteKey)}`,
        { method: "DELETE" }
      );

      if (response.status === 204 || response.ok) {
        setModulos((prev) =>
          prev.filter((item) => resolveModuloDeleteKey(item) !== deleteKey)
        );
        toast.success("Módulo eliminado del catálogo");
        await loadModulos();
        return;
      }

      const message = await readApiErrorMessage(
        response,
        "No se pudo eliminar el módulo."
      );
      setDeleteError(message);
      toast.error(message);
    } catch (error) {
      const message = error?.message || "Error al eliminar el módulo.";
      setDeleteError(message);
      toast.error(message);
    }
  }

  async function openUsuarios(modulo) {
    setUsuariosModal(modulo);
    setUsuariosLoading(true);
    try {
      const response = await apiFetch(
        `${API_URL}/modulos/codigo/${encodeURIComponent(modulo.codigo)}/usuarios`
      );
      if (!response.ok) {
        throw new Error("No se pudieron cargar los usuarios.");
      }
      setUsuariosModulo(await response.json());
    } catch (error) {
      toast.error(error.message || "Error al cargar usuarios.");
      setUsuariosModulo([]);
    } finally {
      setUsuariosLoading(false);
    }
  }

  function closeUsuariosModal() {
    setUsuariosModal(null);
    setUsuariosModulo([]);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Gestión de módulos</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Catálogo de áreas de indicadores. Al renombrar un código, el backend actualiza
          INTRANET_CALIDAD y INTRANET_CALIDAD_ROLES para conservar la trazabilidad.
        </p>
      </div>

      <CrearModulo onCreated={loadModulos} />

      {deleteError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {deleteError}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Cargando módulos…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modulos.map((modulo) => {
            const Icon = resolveModuloIcon(modulo.icono);
            return (
              <article
                key={modulo.id ?? modulo.codigo}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                    <Icon size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900">{modulo.nombre}</h3>
                    <p className="text-xs font-mono text-gray-500">
                      {modulo.codigo}
                      {modulo.id != null ? ` · ID ${modulo.id}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(modulo)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Edit3 size={14} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => openUsuarios(modulo)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Users size={14} />
                    Usuarios con acceso
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(modulo)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && modulos.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <FolderPlus size={16} />
          No hay módulos registrados. Cree uno arriba.
        </p>
      ) : null}

      {editing ? (
        <ModalOverlay onBackdropClick={closeEdit}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Editar módulo</h3>
            <form onSubmit={saveEdit} className="mt-4 space-y-4">
              <label className="block text-sm text-gray-700">
                Nombre visible
                <input
                  required
                  value={editForm.nombre}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, nombre: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm text-gray-700">
                Código (renombra datos en Oracle si cambia)
                <input
                  value={editForm.codigo_nuevo}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, codigo_nuevo: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
                />
              </label>
              <label className="block text-sm text-gray-700">
                Icono Lucide o emoji
                <input
                  value={editForm.icono}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, icono: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      ) : null}

      {usuariosModal ? (
        <ModalOverlay onBackdropClick={closeUsuariosModal}>
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">
              Usuarios con acceso — {usuariosModal.nombre}
            </h3>
            <p className="mt-1 text-xs text-gray-500 font-mono">{usuariosModal.codigo}</p>
            <div className="mt-4 max-h-72 overflow-y-auto rounded-md border border-gray-200">
              {usuariosLoading ? (
                <p className="p-4 text-sm text-gray-500">Cargando…</p>
              ) : usuariosModulo.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">
                  Nadie tiene este módulo asignado (los administradores globales también aparecen aquí).
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {usuariosModulo.map((user) => (
                    <li key={user.id} className="px-4 py-3 text-sm">
                      <p className="font-medium text-gray-800">
                        {user.nombres || user.usuario}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user.usuario} · roles: {(user.roles || []).join(", ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={closeUsuariosModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </ModalOverlay>
      ) : null}
    </div>
  );
}
