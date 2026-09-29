import { Download, Save, Upload } from "lucide-react";

export default function ExcelUploadSection({
  fileInputRef,
  onDownloadTemplate,
  onExcelUpload,
  onBulkSave,
  parsedIndicatorsCount,
  loading,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-800">
            Carga de información
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Digita los datos, carga la plantilla simple o el tablero oficial (hoja &quot;INDICADORES 256&quot;).
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium"
          >
            <Download size={17} />
            Descargar plantilla
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-gray-800 text-sm font-medium"
          >
            <Upload size={17} />
            Cargar Excel
          </button>

          {parsedIndicatorsCount > 1 && (
            <button
              type="button"
              onClick={onBulkSave}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60 text-sm font-medium"
            >
              <Save size={17} />
              Guardar todos ({parsedIndicatorsCount})
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={onExcelUpload}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
