import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

import ExcelUploadPreviewModal from "./Components/Resolucion256/ExcelUploadPreviewModal";
import ExcelUploadSection from "./Components/Resolucion256/ExcelUploadSection";
import FormActions from "./Components/Resolucion256/FormActions";
import IndicatorInfoSection from "./Components/Resolucion256/IndicatorInfoSection";
import MonthlyResultsTable from "./Components/Resolucion256/MonthlyResultsTable";
import Resolucion256Header from "./Components/Resolucion256/Resolucion256Header";
import StatusMessage from "./Components/Resolucion256/StatusMessage";
import {
  API_URL,
  createEmptyRows,
  months,
} from "./Components/Resolucion256/constants";
import {
  buildPlantillaUploadSummary,
  buildTableroUploadSummary,
} from "./utils/buildExcelUploadSummary";
import {
  calculateIndicatorValue,
  formatIndicatorDisplay,
} from "./utils/formatIndicator";
import {
  MODULO_RESOLUCION_256,
  normalizeObservatorioForPayload,
} from "./utils/moduleConstants";
import {
  extractYearFromFilename,
  indicadorToApiPayload,
  isIndicadores256Workbook,
  monthNameToNumber,
  normalizeText,
  parseIndicadores256Workbook,
  parseNumeric,
} from "./utils/parseIndicadores256Excel";

export default function Resolucion256() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [indicador, setIndicador] = useState(
    "P.2.1. Tasa de Incidencia de Neumonía Asociada a Ventilador Mecánico (NAV)"
  );
  const [formula, setFormula] = useState(
    "# Neumonías asociadas a VM nuevas en UCI / # días VM en UCI x 1000"
  );
  const [meta, setMeta] = useState("<=1");
  const [observatorio, setObservatorio] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState(createEmptyRows());
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedIndicators, setParsedIndicators] = useState([]);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [pendingUpload, setPendingUpload] = useState(null);

  useEffect(() => {
    if (!uploadPreview) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setUploadPreview(null);
        setPendingUpload(null);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () =>
      document.removeEventListener("keydown", handleEscape);
  }, [uploadPreview]);

  function calculateIndicator(numerador, denominador) {
    return calculateIndicatorValue(numerador, denominador, formula, indicador);
  }

  function updateRow(index, field, value) {
    setRows((current) => {
      const next = [...current];
      next[index] = {
        ...next[index],
        [field]: value === "" ? "" : Number(value),
      };
      return next;
    });
  }

  function changeValue(index, field, amount) {
    setRows((current) => {
      const next = [...current];
      const currentValue = Number(next[index][field]) || 0;
      next[index] = {
        ...next[index],
        [field]: Math.max(0, currentValue + amount),
      };
      return next;
    });
  }

  function calculatePeriod(startMonth, endMonth) {
    const periodRows = rows.filter(
      (row) => row.month >= startMonth && row.month <= endMonth
    );

    const numerador = periodRows.reduce(
      (total, row) => total + (Number(row.numerador) || 0),
      0
    );

    const denominador = periodRows.reduce(
      (total, row) => total + (Number(row.denominador) || 0),
      0
    );

    return {
      numerador,
      denominador,
      indicador: calculateIndicatorValue(numerador, denominador, formula, indicador),
    };
  }

  const quarters = useMemo(
    () => ({
      1: calculatePeriod(1, 3),
      2: calculatePeriod(4, 6),
      3: calculatePeriod(7, 9),
      4: calculatePeriod(10, 12),
    }),
    [rows]
  );

  const semesters = useMemo(
    () => ({
      1: calculatePeriod(1, 6),
      2: calculatePeriod(7, 12),
    }),
    [rows]
  );

  function formatIndicator(value) {
    return formatIndicatorDisplay(value, formula, indicador);
  }

  function applyIndicadorToForm(indicadorData) {
    setIndicador(indicadorData.nombre || "");
    setFormula(indicadorData.formula || "");
    setMeta(indicadorData.meta || "");
    setObservatorio(indicadorData.observatorio || "");

    const newRows = createEmptyRows();

    indicadorData.datosMensuales.forEach((dato) => {
      const monthNumber = monthNameToNumber(dato.mes);

      if (!monthNumber) {
        return;
      }

      const rowIndex = newRows.findIndex(
        (row) => row.month === monthNumber
      );

      if (rowIndex === -1) {
        return;
      }

      newRows[rowIndex] = {
        ...newRows[rowIndex],
        numerador: parseNumeric(dato.numerador),
        denominador: parseNumeric(dato.denominador),
      };
    });

    setRows(newRows);
  }

  function parsePlantillaExcel(data) {
    const normalize = (value) => normalizeText(value);
    const newRows = createEmptyRows();
    let rowsIgnored = 0;

    data.forEach((excelRow) => {
      const normalized = {};

      Object.entries(excelRow).forEach(([key, value]) => {
        normalized[normalize(key)] = value;
      });

      let monthValue = normalized["MES"];
      let monthNumber;

      if (typeof monthValue === "number") {
        monthNumber = monthValue;
      } else {
        monthNumber = months.find(
          (m) => normalize(m.name) === normalize(monthValue)
        )?.id;
      }

      if (!monthNumber) {
        rowsIgnored += 1;
        return;
      }

      const rowIndex = newRows.findIndex(
        (row) => row.month === monthNumber
      );

      if (rowIndex === -1) {
        rowsIgnored += 1;
        return;
      }

      newRows[rowIndex] = {
        ...newRows[rowIndex],
        numerador: parseNumeric(normalized["NUMERADOR"]),
        denominador: parseNumeric(normalized["DENOMINADOR"]),
      };
    });

    return {
      rows: newRows,
      indicador: data[0]?.["INDICADOR"] || "",
      formula: data[0]?.["FORMULA"] || "",
      meta: data[0]?.["META INSTITUCIONAL"] || "",
      observatorio: data[0]?.["OBSERVATORIO"] != null && data[0]?.["OBSERVATORIO"] !== ""
        ? String(data[0]["OBSERVATORIO"]).trim()
        : "",
      year: data[0]?.["YEAR"] ? Number(data[0]["YEAR"]) : null,
      rowsIgnored,
    };
  }

  async function handleBulkSave() {
    if (!parsedIndicators.length) {
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType("");

    const errors = [];
    let saved = 0;

    try {
      for (const indicadorItem of parsedIndicators) {
        const payload = indicadorToApiPayload(indicadorItem, {
          year,
          observatorio: indicadorItem.observatorio || observatorio,
        });

        const response = await fetch(`${API_URL}/api/calidad`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          errors.push(
            indicadorItem.nombre || "Indicador sin nombre"
          );
          continue;
        }

        saved += 1;
      }

      if (errors.length) {
        setMessage(
          `Se guardaron ${saved} de ${parsedIndicators.length} indicadores. Fallaron: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`
        );
        setMessageType(saved > 0 ? "success" : "error");
      } else {
        setMessage(
          `Se guardaron correctamente ${saved} indicadores en la base de datos.`
        );
        setMessageType("success");
        setParsedIndicators([]);
        setIndicador("");
        setFormula("");
        setMeta("");
        setObservatorio("");
        setRows(createEmptyRows());
      }
    } catch (error) {
      console.error(error);
      setMessage(
        error.message || "Error al guardar los indicadores."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  function applyTableroUpload(indicadores, extractedYear) {
    if (extractedYear) {
      setYear(extractedYear);
    }

    setParsedIndicators(indicadores);
    applyIndicadorToForm(indicadores[0]);

    const totalMeses = indicadores.reduce(
      (sum, item) => sum + item.datosMensuales.length,
      0
    );

    if (indicadores.length === 1) {
      setMessage(
        `Excel tablero cargado: 1 indicador con ${indicadores[0].datosMensuales.length} meses.`
      );
    } else {
      setMessage(
        `Excel tablero cargado: ${indicadores.length} indicadores (${totalMeses} registros mensuales). Se muestra el primero; use "Guardar todos" para subir los ${indicadores.length} a la base de datos.`
      );
    }

    setMessageType("success");
  }

  function applyPlantillaUpload(plantilla, extractedYear) {
    setRows(plantilla.rows);
    setParsedIndicators([]);

    if (plantilla.indicador) {
      setIndicador(plantilla.indicador);
    }

    if (plantilla.formula) {
      setFormula(plantilla.formula);
    }

    if (plantilla.meta) {
      setMeta(plantilla.meta);
    }

    if (plantilla.observatorio) {
      setObservatorio(plantilla.observatorio);
    }

    if (plantilla.year) {
      setYear(plantilla.year);
    } else if (extractedYear) {
      setYear(extractedYear);
    }

    setMessage("Plantilla cargada correctamente.");
    setMessageType("success");
  }

  function handleConfirmUpload() {
    if (!pendingUpload) {
      return;
    }

    if (pendingUpload.type === "tablero") {
      applyTableroUpload(
        pendingUpload.indicadores,
        pendingUpload.extractedYear
      );
    } else {
      applyPlantillaUpload(
        pendingUpload.plantilla,
        pendingUpload.extractedYear
      );
    }

    setUploadPreview(null);
    setPendingUpload(null);
  }

  function handleCancelUpload() {
    setUploadPreview(null);
    setPendingUpload(null);
  }

  async function handleExcelUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setMessage("");
      setMessageType("");
      setParsedIndicators([]);
      setUploadPreview(null);
      setPendingUpload(null);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const extractedYear = extractYearFromFilename(file.name);

      if (isIndicadores256Workbook(workbook)) {
        const { indicadores, sheetName } =
          parseIndicadores256Workbook(workbook);

        const summary = buildTableroUploadSummary({
          fileName: file.name,
          extractedYear,
          indicadores,
          sheetName,
        });

        setUploadPreview(summary);
        setPendingUpload({
          type: "tablero",
          indicadores,
          extractedYear,
        });

        return;
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!data.length) {
        setMessage("El archivo Excel está vacío.");
        setMessageType("error");
        return;
      }

      const plantilla = parsePlantillaExcel(data);

      const summary = buildPlantillaUploadSummary({
        fileName: file.name,
        extractedYear,
        plantilla,
        totalRows: data.length,
        rowsIgnored: plantilla.rowsIgnored,
      });

      setUploadPreview(summary);
      setPendingUpload({
        type: "plantilla",
        plantilla,
        extractedYear,
      });
    } catch (error) {
      console.error(error);
      setMessage(
        error.message || "No se pudo procesar el archivo Excel."
      );
      setMessageType("error");
    } finally {
      event.target.value = "";
    }
  }

  function downloadTemplate() {
    const template = months.map((month) => ({
      INDICADOR: indicador,
      FORMULA: formula,
      "META INSTITUCIONAL": meta,
      OBSERVATORIO: observatorio,
      YEAR: year,
      MES: month.name,
      NUMERADOR: 0,
      DENOMINADOR: 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Resolucion 256"
    );

    XLSX.writeFile(
      workbook,
      `plantilla_resolucion_256_${year}.xlsx`
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const payload = {
        indicador,
        formula,
        meta_institucional: meta,
        observatorio: normalizeObservatorioForPayload(observatorio),
        modulo: MODULO_RESOLUCION_256,
        year,
        rows: rows.map((row) => ({
          month: row.month,
          numerador: Number(row.numerador) || 0,
          denominador: Number(row.denominador) || 0,
          indicador_valor: calculateIndicator(
            row.numerador,
            row.denominador
          ),
          trimestre: getQuarterValue(row.month),
          semestre: getSemesterValue(row.month),
        })),
      };

      const response = await fetch(`${API_URL}/api/calidad`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "No se pudo guardar la información."
        );
      }

      setMessage(
        `Información guardada correctamente. Registros: ${data.created ?? rows.length}`
      );
      setMessageType("success");
      setIndicador("");
      setFormula("");
      setMeta("");
      setObservatorio("");
      setRows(createEmptyRows());
    } catch (error) {
      console.error(error);
      setMessage(
        error.message || "Error de conexión con el servidor."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  function getQuarterValue(month) {
    if (month <= 3) {
      return quarters[1].indicador;
    }

    if (month <= 6) {
      return quarters[2].indicador;
    }

    if (month <= 9) {
      return quarters[3].indicador;
    }

    return quarters[4].indicador;
  }

  function getSemesterValue(month) {
    if (month <= 6) {
      return semesters[1].indicador;
    }

    return semesters[2].indicador;
  }

  function resetForm() {
    setRows(createEmptyRows());
    setParsedIndicators([]);
    setUploadPreview(null);
    setPendingUpload(null);
    setMessage("");
    setMessageType("");
  }

  return (
    <div className="space-y-6">
      <ExcelUploadPreviewModal
        summary={uploadPreview}
        loading={loading}
        onConfirm={handleConfirmUpload}
        onClose={handleCancelUpload}
      />
      <Resolucion256Header
        year={year}
        onYearChange={setYear}
        onBack={() => navigate("/app")}
      />

      <form onSubmit={handleSubmit}>
        <ExcelUploadSection
          fileInputRef={fileInputRef}
          onDownloadTemplate={downloadTemplate}
          onExcelUpload={handleExcelUpload}
          onBulkSave={handleBulkSave}
          parsedIndicatorsCount={parsedIndicators.length}
          loading={loading}
        />

        <IndicatorInfoSection
          indicador={indicador}
          formula={formula}
          meta={meta}
          observatorio={observatorio}
          onIndicadorChange={setIndicador}
          onFormulaChange={setFormula}
          onMetaChange={setMeta}
          onObservatorioChange={setObservatorio}
        />

        <StatusMessage
          message={message}
          messageType={messageType}
        />

        <MonthlyResultsTable
          rows={rows}
          onUpdateRow={updateRow}
          onChangeValue={changeValue}
          onResetForm={resetForm}
          calculateIndicator={calculateIndicator}
          formatIndicator={formatIndicator}
        />

        <FormActions
          loading={loading}
          onCancel={() => navigate("/app/pacientes")}
        />
      </form>
    </div>
  );
}
