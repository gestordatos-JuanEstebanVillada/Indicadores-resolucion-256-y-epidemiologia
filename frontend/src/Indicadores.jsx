import React, { useEffect, useState } from "react";
import { CornerDownRight, Edit3, Eye, Plus, Save, Search, Trash2, X } from "lucide-react";
import ModalOverlay from "./Components/ModalOverlay";
import {
  calculateIndicatorValue,
  formatIndicatorRowDisplay,
  recalculateRowsWithIndicator,
  recalculateVersionIndicatorRows,
  recalculateVersionsFromApi,
} from "./utils/formatIndicator";
import {
  MODULO_RESOLUCION_256,
  normalizeObservatorioForPayload,
} from "./utils/moduleConstants";

import { API_URL } from "./config/api";

const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const emptyForm = {
  indicador: "",
  formula: "",
  meta_institucional: "",
  observatorio: "",
  year: "",
};

const emptyRows = () => months.map((_, index) => ({
  month: index + 1,
  numerador: 0,
  denominador: 0,
  indicador_valor: null,
}));

function normalizeIndicadorKey(indicador) {
  return (indicador || "").trim().toLowerCase();
}

function sortVersionsByYearAsc(group) {
  return [...group].sort((a, b) => {
    if (a.year !== b.year) {
      return a.year - b.year;
    }

    return a.mes_inicio - b.mes_inicio;
  });
}

function sortVersionsByYearDesc(group) {
  return [...group].sort((a, b) => {
    if (b.year !== a.year) {
      return b.year - a.year;
    }

    return b.mes_inicio - a.mes_inicio;
  });
}

function getYearRange(group) {
  const years = [...new Set(group.map((version) => version.year))]
    .filter(Boolean)
    .sort((a, b) => a - b);

  if (years.length === 0) {
    return "-";
  }

  if (years.length === 1) {
    return String(years[0]);
  }

  return `${years[0]} - ${years[years.length - 1]}`;
}

function IndicatorRow({
  group,
  startEditing,
  startNewVersion,
  setPreview,
  months,
}) {
  const maxYear = Math.max(...group.map((v) => v.year).filter(Boolean));
  const [selectedYear, setSelectedYear] = useState(
    Number.isFinite(maxYear) ? maxYear : undefined
  );

  const availableYears = [...new Set(group.map((version) => version.year))]
    .filter(Boolean)
    .sort((a, b) => a - b);

  const versionsForYear = group
    .filter((version) => version.year === Number(selectedYear))
    .sort((a, b) => a.mes_inicio - b.mes_inicio);

  return (
    <>
      {versionsForYear.map((version, versionIndex) => (
        <tr
          key={version.id}
          className={`align-top ${versionIndex > 0 ? "bg-pink-50/30" : ""}`}
        >
          <td className="max-w-xl px-5 py-4 font-medium text-gray-800">
            {versionIndex === 0 ? (
              <>
                <div>{group[0]?.indicador || "-"}</div>
                <div className="mt-1 text-xs font-normal text-gray-500">
                  {group.length} registro(s) histórico(s)
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2 pl-5">
                <CornerDownRight
                  size={17}
                  className="mt-0.5 shrink-0 text-pink-500"
                />
                <div>
                  <div>{version.indicador}</div>
                  <div className="mt-1 text-xs font-normal text-gray-500">
                    Continuación de: {group[0].indicador}
                  </div>
                </div>
              </div>
            )}
          </td>

          <td className="px-5 py-4 text-gray-600">
            {versionIndex === 0 ? (
              <select
                value={selectedYear ?? ""}
                onChange={(event) =>
                  setSelectedYear(Number(event.target.value))
                }
                className="rounded border border-gray-300 py-1 px-2 text-sm text-gray-800 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-gray-500">{version.year}</span>
            )}
          </td>

          <td className="px-5 py-4 text-gray-600">
            {months[version.mes_inicio - 1]} - {months[version.mes_fin - 1]}
          </td>

          <td className="px-5 py-4">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => startEditing(version)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Edit3 size={15} /> Editar
              </button>

              <button
                type="button"
                onClick={() => setPreview(group)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Eye size={15} /> Vista previa
              </button>

              <button
                type="button"
                onClick={() => startNewVersion(version)}
                className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-3 py-2 text-xs font-medium text-white hover:bg-pink-700"
              >
                <Plus size={15} /> Nueva desde mes
              </button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export default function Indicadores() {
  const [versions, setVersions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [newVersionFor, setNewVersionFor] = useState(null);
  const [startMonth, setStartMonth] = useState(9);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState(emptyRows());
  const [originalRows, setOriginalRows] = useState(emptyRows());
  const [preview, setPreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadVersions() {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/indicadores?modulo=${encodeURIComponent(MODULO_RESOLUCION_256)}`
      );
      if (!response.ok) throw new Error("No se pudieron cargar los indicadores.");
      setVersions(recalculateVersionsFromApi(await response.json()));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVersions();
  }, []);

  useEffect(() => {
    if (editingId === null && newVersionFor === null && preview === null) return undefined;

    function handleEscape(event) {
      if (event.key !== "Escape") return;
      setEditingId(null);
      setNewVersionFor(null);
      setPreview(null);
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [editingId, newVersionFor, preview]);

  function startEditing(version) {
    setEditingId(version.id);
    setNewVersionFor(null);
    const formula = version.formula || "";
    setForm({
      indicador: version.indicador || "",
      formula,
      meta_institucional: version.meta_institucional || "",
      observatorio: version.observatorio || "",
      year: version.year,
    });
    const recalculatedRows = recalculateVersionIndicatorRows(version, emptyRows());
    setRows(recalculatedRows);
    setOriginalRows(recalculatedRows.map((row) => ({ ...row })));
    setMessage("");
  }

  function updateField(event) {
    const { name, value } = event.target;
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);

    if (
      (name === "formula" || name === "indicador")
      && (editingId !== null || newVersionFor !== null)
    ) {
      setRows((current) =>
        recalculateRowsWithIndicator(
          current,
          nextForm.formula,
          nextForm.indicador
        )
      );
    }
  }

  async function saveVersion(event) {
    event.preventDefault();
    const response = await fetch(`${API_URL}/indicadores/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        observatorio: normalizeObservatorioForPayload(form.observatorio),
        modulo: MODULO_RESOLUCION_256,
        rows,
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      setMessage(data.detail || "No se pudo actualizar el indicador.");
      return;
    }
    setEditingId(null);
    setMessage("Indicador actualizado correctamente.");
    await loadVersions();
  }

  async function saveNewVersion(event) {
    event.preventDefault();
    const response = await fetch(`${API_URL}/indicadores/${newVersionFor}/versiones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        observatorio: normalizeObservatorioForPayload(form.observatorio),
        modulo: MODULO_RESOLUCION_256,
        mes_inicio: Number(startMonth),
        rows,
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      setMessage(data.detail || "No se pudo crear la nueva versión.");
      return;
    }
    setNewVersionFor(null);
    setMessage("Nueva versión creada correctamente.");
    await loadVersions();
  }

  async function deleteVersion() {
    if (!window.confirm("¿Seguro que deseas eliminar este indicador? Esta acción no se puede deshacer.")) return;
    const response = await fetch(`${API_URL}/indicadores/${editingId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      setMessage(data.detail || "No se pudo eliminar el indicador.");
      return;
    }
    setEditingId(null);
    setMessage("Indicador eliminado correctamente.");
    await loadVersions();
  }

  function startNewVersion(version) {
    setNewVersionFor(version.calidad_id);
    setEditingId(null);
    const formula = version.formula || "";
    setStartMonth(Math.min(version.mes_fin + 1, 12));
    setForm({
      indicador: version.indicador || "",
      formula,
      meta_institucional: version.meta_institucional || "",
      observatorio: version.observatorio || "",
      year: version.year,
    });
    const recalculatedRows = recalculateVersionIndicatorRows(version, emptyRows());
    setRows(recalculatedRows);
    setOriginalRows(recalculatedRows.map((row) => ({ ...row })));
    setMessage("");
  }

  function cancelForm() {
    setEditingId(null);
    setNewVersionFor(null);
  }

  function closePreview() {
    setPreview(null);
  }

  function closeOnBackdrop(event, close) {
    if (event.target === event.currentTarget) close();
  }

  function updateRow(index, field, value) {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value === "" ? null : Number(value) };
    if (field === "numerador" || field === "denominador") {
      const numerator = Number(next[index].numerador) || 0;
      const denominator = Number(next[index].denominador) || 0;
      next[index].indicador_valor = calculateIndicatorValue(
        numerator,
        denominator,
        form.formula,
        form.indicador
      );
    }
    setRows(next);
  }

  useEffect(() => {
    if (newVersionFor === null) return;
    const changedRow = rows.findIndex((row, index) => (
      row.numerador !== originalRows[index]?.numerador
      || row.denominador !== originalRows[index]?.denominador
      || row.indicador_valor !== originalRows[index]?.indicador_valor
    ));
    if (changedRow >= 0) setStartMonth(changedRow + 1);
  }, [newVersionFor, originalRows, rows]);

  const versionGroups = Object.values(
    versions.reduce((groups, version) => {
      const key = normalizeIndicadorKey(version.indicador);

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(version);
      return groups;
    }, {})
  )
    .map(sortVersionsByYearAsc)
    .sort((groupA, groupB) => {
      const aFirst = sortVersionsByYearAsc(groupA)[0];
      const bFirst = sortVersionsByYearAsc(groupB)[0];

      if ((aFirst?.year ?? 0) !== (bFirst?.year ?? 0)) {
        return (aFirst?.year ?? 0) - (bFirst?.year ?? 0);
      }

      return (aFirst?.calidad_id ?? 0) - (bFirst?.calidad_id ?? 0);
    });

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredGroups = versionGroups.filter(
    (group) =>
      !normalizedSearch ||
      group.some((version) => {
        const searchableText = [
          version.indicador,
          version.formula,
          version.meta_institucional,
          version.observatorio,
          version.year,
          months[version.mes_inicio - 1],
          months[version.mes_fin - 1],
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Indicadores</h2>
        <p className="mt-1 text-sm text-gray-500">
          Consulta y administra las versiones vigentes por periodo.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-pink-100 bg-pink-50 px-4 py-3 text-sm text-pink-700">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Cargando indicadores...</p>
      ) : versions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          Aún no hay indicadores guardados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-white p-4">
            <label className="relative block max-w-md">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar indicador, fórmula, año o vigencia"
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">Indicador</th>
                  <th className="px-5 py-4">Año</th>
                  <th className="px-5 py-4">Vigencia</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGroups.map((group) => (
                  <IndicatorRow
                    key={normalizeIndicadorKey(group[0]?.indicador)}
                    group={group}
                    startEditing={startEditing}
                    startNewVersion={startNewVersion}
                    setPreview={setPreview}
                    months={months}
                  />
                ))}
              </tbody>
            </table>
            {filteredGroups.length === 0 && (
              <p className="p-8 text-center text-sm text-gray-500">No se encontraron indicadores.</p>
            )}
          </div>
        </div>
      )}

      {(editingId !== null || newVersionFor !== null) && (
        <ModalOverlay onBackdropClick={(event) => closeOnBackdrop(event, cancelForm)}>
        <form
          onSubmit={editingId !== null ? saveVersion : saveNewVersion}
          onMouseDown={(event) => event.stopPropagation()}
          className="max-h-[92vh] w-full max-w-6xl flex flex-col rounded-xl bg-white shadow-xl overflow-hidden"
        >
          <div className="overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">
              {editingId !== null ? "Editar versión" : "Crear nueva versión"}
            </h3>
            <button type="button" onClick={cancelForm} className="text-gray-400 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>

          {newVersionFor !== null && (
            <label className="block text-sm text-gray-600">
              Aplicar desde el mes
              <div className="mt-1 rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 font-medium text-pink-700">
                {months[startMonth - 1]}
              </div>
              <span className="mt-1 block text-xs text-gray-500">
                Se detecta automáticamente al ingresar el primer dato nuevo.
              </span>
            </label>
          )}

          <label className="block text-sm text-gray-600">
            <div className="mb-1 flex items-center gap-2">
              <span>Indicador</span>
              {form.year && (
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                  Año {form.year}
                </span>
              )}
            </div>
            <input name="indicador" value={form.indicador} onChange={updateField} required className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800" />
          </label>
          <label className="block text-sm text-gray-600">
            Fórmula
            <textarea name="formula" value={form.formula} onChange={updateField} rows="2" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-gray-600">
              Meta institucional
              <input name="meta_institucional" value={form.meta_institucional} onChange={updateField} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800" />
            </label>
            <label className="block text-sm text-gray-600">
              Observatorio
              <input
                name="observatorio"
                value={form.observatorio}
                onChange={updateField}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800"
              />
            </label>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">Resultados mensuales</h4>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-3 py-2">Mes</th><th className="px-3 py-2">Numerador</th><th className="px-3 py-2">Denominador</th><th className="px-3 py-2">Indicador</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, index) => (
                    <tr key={row.month}>
                      <td className="px-3 py-2 font-medium">{months[index]}</td>
                      <td className="px-3 py-2"><input type="number" step="any" value={row.numerador ?? ""} onChange={(event) => updateRow(index, "numerador", event.target.value)} className="w-32 rounded border border-gray-300 px-2 py-1" /></td>
                      <td className="px-3 py-2"><input type="number" step="any" value={row.denominador ?? ""} onChange={(event) => updateRow(index, "denominador", event.target.value)} className="w-32 rounded border border-gray-300 px-2 py-1" /></td>
                      <td className="px-3 py-2 text-gray-600">
                        {formatIndicatorRowDisplay(row, form.formula, form.indicador)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700">
            <Save size={16} /> Guardar cambios
          </button>
          {editingId !== null && (
            <button type="button" onClick={deleteVersion} className="ml-2 inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
              <Trash2 size={16} /> Eliminar
            </button>
          )}
          </div>
        </form>
        </ModalOverlay>
      )}

      {preview && (
        <ModalOverlay onBackdropClick={(event) => closeOnBackdrop(event, closePreview)}>
          <div
            onMouseDown={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full max-w-6xl flex flex-col rounded-xl bg-white shadow-xl overflow-hidden"
          >
            <div className="overflow-y-auto p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">
                  Vista previa del indicador
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Histórico unificado · {getYearRange(preview)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreview(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-800">
                {preview[0]?.indicador || "-"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {preview.length} periodo(s) registrado(s)
              </p>
            </div>

            <div className="space-y-8">
              {sortVersionsByYearDesc(preview).map((version) => (
                <section
                  key={`${version.id}-${version.year}-${version.mes_inicio}`}
                  className="rounded-xl border border-gray-200"
                >
                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                    <h4 className="font-semibold text-gray-800">
                      Año {version.year}
                    </h4>
                    <p className="text-sm text-gray-500">
                      Vigencia: {months[version.mes_inicio - 1]} -{" "}
                      {months[version.mes_fin - 1]}
                    </p>
                  </div>

                  <div className="grid gap-4 border-b border-gray-200 p-4 md:grid-cols-3">
                    <div>
                      <b className="text-sm text-gray-700">Fórmula</b>
                      <p className="mt-1 text-sm text-gray-600">
                        {version.formula || "-"}
                      </p>
                    </div>

                    <div>
                      <b className="text-sm text-gray-700">Meta</b>
                      <p className="mt-1 text-sm text-gray-600">
                        {version.meta_institucional || "-"}
                      </p>
                    </div>

                    <div>
                      <b className="text-sm text-gray-700">Observatorio</b>
                      <p className="mt-1 text-sm text-gray-600">
                        {version.observatorio || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto p-4">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Mes</th>
                          <th className="px-3 py-2">Numerador</th>
                          <th className="px-3 py-2">Denominador</th>
                          <th className="px-3 py-2">Indicador</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {(version.rows || []).map((row, index) => (
                          <tr
                            key={`${version.id}-${row.month}`}
                            className={`
                              hover:bg-gray-50/50 transition-colors
                              ${version.mes_inicio > 1 && row.month === version.mes_inicio ? "bg-pink-50/60" : ""}
                            `}
                          >
                            <td className="px-3 py-2 font-medium relative">
                              {version.mes_inicio > 1 && row.month === version.mes_inicio && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500" />
                              )}
                              <div className="flex items-center gap-2">
                                {months[index]}
                                {version.mes_inicio > 1 && row.month === version.mes_inicio && (
                                  <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-600 uppercase tracking-wide">
                                    Inicio de cambio
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {row.numerador ?? "-"}
                            </td>
                            <td className="px-3 py-2">
                              {row.denominador ?? "-"}
                            </td>
                            <td className="px-3 py-2">
                              {formatIndicatorRowDisplay(row, version.formula, version.indicador)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
