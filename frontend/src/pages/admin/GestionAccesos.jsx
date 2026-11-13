import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, UserMinus, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

import ModalOverlay from "../../Components/ModalOverlay";
import ModuloAccessFields from "../../Components/Admin/ModuloAccessFields";
import UsuarioInstitucionalPicker from "../../Components/Admin/UsuarioInstitucionalPicker";
import { API_URL, apiFetch } from "../../config/api";
import {
  ROL_LABELS,
  esAdminGlobal,
  esAdministradorArea,
  getUserModulos,
} from "../../utils/authRoles";
import { fetchModulosActivos } from "../../utils/modulosCatalog";

const emptyAssignForm = {
  usuario: "",
  jerarquia: "USUARIO",
  accesos: [],
};

const emptyCreateForm = {
  nombres: "",
  usuario: "",
  contrasena: "",
  jerarquia: "USUARIO",
  accesos: [],
};

function isInstitutionActive(estado) {
  const value = (estado || "ACTIVO").toUpperCase();
  return !["INACTIVO", "I", "0", "FALSE", "N"].includes(value);
}

function labelModulo(codigo, catalogo) {
  const hit = catalogo.find((m) => m.codigo === codigo);
  return hit?.nombre ? `${hit.nombre} (${codigo})` : ROL_LABELS[codigo] || codigo;
}

async function readApiError(response, fallback) {
  const data = await response.json().catch(() => ({}));
  const detail = data.detail;
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail[0]?.msg || fallback;
  }
  return fallback;
}

export default function GestionAccesos() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedInstitutional, setSelectedInstitutional] = useState(null);
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [filter, setFilter] = useState("");
  const [catalogoModulos, setCatalogoModulos] = useState([]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await apiFetch(`${API_URL}/usuarios?con_acceso=true`);
      if (!response.ok) {
        throw new Error("No se pudo cargar la lista de usuarios.");
      }
      setUsers(await response.json());
    } catch (error) {
      setMessage(error.message || "Error al cargar usuarios.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    fetchModulosActivos().then(setCatalogoModulos);
  }, [loadUsers]);

  const catalogoModulosGestion = useMemo(() => {
    if (esAdminGlobal()) {
      return catalogoModulos;
    }
    const asignados = new Set(getUserModulos());
    return catalogoModulos.filter((modulo) => asignados.has(modulo.codigo));
  }, [catalogoModulos]);

  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) {
      return users;
    }
    return users.filter(
      (user) =>
        (user.usuario || "").toLowerCase().includes(q) ||
        (user.nombres || "").toLowerCase().includes(q)
    );
  }, [users, filter]);

  function openCreateModal() {
    setCreateForm(emptyCreateForm);
    setCreateModalOpen(true);
  }

  function closeCreateModal() {
    setCreateModalOpen(false);
    setCreateForm(emptyCreateForm);
  }

  function openAssignModal(user = null) {
    setEditingUser(user);
    setSelectedInstitutional(null);
    if (user) {
      const modGestion = esAdminGlobal()
        ? null
        : new Set(getUserModulos().map((m) => (m || "").toUpperCase()));
      const accesosRaw =
        user.accesos?.length > 0
          ? user.accesos.map((a) => ({
              modulo: a.modulo,
              solo_lectura: Boolean(a.solo_lectura),
            }))
          : (user.modulos || []).map((m) => ({
              modulo: m,
              solo_lectura: false,
            }));
      const accesos =
        modGestion == null
          ? accesosRaw
          : accesosRaw.filter((a) =>
              modGestion.has((a.modulo || "").toUpperCase())
            );
      const jerarquiaArea =
        esAdministradorArea() && !esAdminGlobal() ? "USUARIO" : null;
      setAssignForm({
        usuario: user.usuario || "",
        jerarquia:
          jerarquiaArea ||
          user.jerarquia ||
          user.nombre_rol ||
          "USUARIO",
        accesos,
      });
    } else {
      setAssignForm(
        esAdministradorArea() && !esAdminGlobal()
          ? { ...emptyAssignForm, jerarquia: "USUARIO" }
          : emptyAssignForm
      );
    }
    setAssignModalOpen(true);
  }

  function closeAssignModal() {
    setAssignModalOpen(false);
    setEditingUser(null);
    setSelectedInstitutional(null);
    setAssignForm(emptyAssignForm);
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    const promise = (async () => {
      const response = await apiFetch(`${API_URL}/usuarios`, {
        method: "POST",
        body: JSON.stringify({
          nombres: createForm.nombres.trim(),
          usuario: createForm.usuario.trim(),
          contrasena: createForm.contrasena,
          jerarquia: createForm.jerarquia,
          accesos: createForm.accesos,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "No se pudo crear el usuario.")
        );
      }
      closeCreateModal();
      await loadUsers();
      return response.json();
    })();
    toast.promise(promise, {
      loading: "Creando usuario…",
      success: "Usuario creado y accesos asignados",
      error: (error) => error.message || "Error al crear usuario",
    });
  }

  async function handleAssignSubmit(event) {
    event.preventDefault();
    try {
      const isUpdate = editingUser != null;
      const esGlobal =
        (assignForm.jerarquia || "").toUpperCase() === "ADMINISTRADOR_GLOBAL";
      if (!esGlobal && !assignForm.accesos?.length) {
        throw new Error("Seleccione al menos un módulo.");
      }
      const body = {
        jerarquia: assignForm.jerarquia,
        accesos: assignForm.accesos,
      };
      if (isUpdate) {
        const response = await apiFetch(`${API_URL}/usuarios/${editingUser.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          throw new Error(
            await readApiError(response, "No se pudo actualizar los accesos.")
          );
        }
        toast.success("Accesos actualizados");
      } else {
        const login = (
          selectedInstitutional?.usuario ||
          assignForm.usuario ||
          ""
        ).trim();
        if (!login) {
          throw new Error("Seleccione un usuario institucional.");
        }
        const response = await apiFetch(`${API_URL}/usuarios/asignar-rol`, {
          method: "POST",
          body: JSON.stringify({
            usuario: login,
            ...body,
          }),
        });
        if (!response.ok) {
          throw new Error(
            await readApiError(response, "No se pudo asignar el acceso.")
          );
        }
        toast.success("Acceso asignado correctamente");
      }
      closeAssignModal();
      await loadUsers();
    } catch (error) {
      toast.error(error.message || "Error al guardar.");
    }
  }

  async function revokeAccess(user) {
    if (
      !window.confirm(
        `¿Quitar todos los accesos de Indicadores a ${user.usuario}? La cuenta en INTRANET_USUARIOS se mantiene.`
      )
    ) {
      return;
    }
    try {
      const response = await apiFetch(`${API_URL}/usuarios/${user.id}/rol`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "No se pudo revocar el acceso.")
        );
      }
      toast.success("Accesos revocados");
      await loadUsers();
    } catch (error) {
      toast.error(error.message || "Error al revocar acceso.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de accesos</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Usuarios con permisos en Indicadores. Para dar acceso a alguien que aún no
            aparece, use el buscador institucional.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {esAdminGlobal() ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
            >
              <UserPlus size={16} />
              Crear usuario local
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => openAssignModal()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus size={16} />
            Asignar acceso a nuevo usuario
          </button>
        </div>
      </div>

      <input
        type="search"
        placeholder="Buscar por usuario o nombre…"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      {message ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
          {message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-gray-500">Cargando usuarios…</p>
        ) : filteredUsers.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">
            No hay usuarios con acceso asignado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Nombres</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Rol / módulos</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                    <td className="px-4 py-3 text-gray-600">{user.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{user.nombres}</td>
                    <td className="px-4 py-3">{user.usuario}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex w-fit rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-semibold text-pink-700">
                          {ROL_LABELS[user.jerarquia || user.nombre_rol] ||
                            user.jerarquia ||
                            user.nombre_rol ||
                            "—"}
                        </span>
                        {user.es_admin_global ? (
                          <span className="text-xs text-gray-500">Todos los módulos</span>
                        ) : (
                          <span className="text-xs text-gray-600">
                            {(user.accesos?.length
                              ? user.accesos
                              : (user.modulos || []).map((m) => ({
                                  modulo: m,
                                  solo_lectura: false,
                                }))
                            )
                              .map((a) => {
                                const etiqueta = labelModulo(
                                  a.modulo,
                                  catalogoModulos
                                );
                                return a.solo_lectura
                                  ? `${etiqueta} (lectura)`
                                  : etiqueta;
                              })
                              .join(", ") || "—"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isInstitutionActive(user.estado)
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {isInstitutionActive(user.estado) ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openAssignModal(user)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil size={14} />
                          Editar accesos
                        </button>
                        <button
                          type="button"
                          onClick={() => revokeAccess(user)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          <UserMinus size={14} />
                          Quitar acceso
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createModalOpen ? (
        <ModalOverlay onBackdropClick={closeCreateModal}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Crear nuevo usuario</h3>
            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <label className="block text-sm text-gray-700">
                Nombres completos
                <input
                  required
                  value={createForm.nombres}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      nombres: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm text-gray-700">
                Nombre de usuario (login)
                <input
                  required
                  value={createForm.usuario}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      usuario: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm text-gray-700">
                Contraseña
                <input
                  type="password"
                  required
                  minLength={4}
                  value={createForm.contrasena}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      contrasena: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <ModuloAccessFields
                jerarquia={createForm.jerarquia}
                onChangeJerarquia={(jerarquia) =>
                  setCreateForm((current) => ({ ...current, jerarquia }))
                }
                catalogoModulos={catalogoModulosGestion}
                accesos={createForm.accesos}
                onChangeAccesos={(accesos) =>
                  setCreateForm((current) => ({ ...current, accesos }))
                }
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
                >
                  Guardar usuario
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      ) : null}

      {assignModalOpen ? (
        <ModalOverlay onBackdropClick={closeAssignModal}>
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">
              {editingUser ? "Editar accesos" : "Asignar acceso a nuevo usuario"}
            </h3>
            <form onSubmit={handleAssignSubmit} className="mt-4 space-y-4">
              {editingUser ? (
                <p className="text-sm text-gray-600">
                  Usuario:{" "}
                  <span className="font-medium text-gray-800">
                    {editingUser.usuario} — {editingUser.nombres}
                  </span>
                </p>
              ) : (
                <UsuarioInstitucionalPicker
                  value={selectedInstitutional?.usuario || assignForm.usuario}
                  onSelect={(user) => {
                    setSelectedInstitutional(user);
                    setAssignForm((current) => ({
                      ...current,
                      usuario: user.usuario || "",
                    }));
                  }}
                />
              )}
              <ModuloAccessFields
                jerarquia={assignForm.jerarquia}
                onChangeJerarquia={(jerarquia) =>
                  setAssignForm((current) => ({ ...current, jerarquia }))
                }
                catalogoModulos={catalogoModulosGestion}
                accesos={assignForm.accesos}
                onChangeAccesos={(accesos) =>
                  setAssignForm((current) => ({ ...current, accesos }))
                }
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeAssignModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      ) : null}
    </div>
  );
}
