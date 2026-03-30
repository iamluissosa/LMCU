'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Calculator,
  Save,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface UtValue {
  name: string;
  value: number;
  effectiveDate?: string;
}

interface IslrRate {
  id: string;
  personType: string;
  percentage: number;
  sustraendoFact: number;
  minBaseUt: number;
}

interface IslrConcept {
  id: string;
  code: string;
  description: string;
  rates: IslrRate[];
}

interface ImportRowError {
  sheet: string;
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  success: boolean;
  conceptsProcessed: number;
  ratesProcessed: number;
  errors: ImportRowError[];
  message: string;
}

// ─── Componente: Modal de resultado de importación ─────────────────────────────
function ImportResultModal({
  result,
  onClose,
}: {
  result: ImportResult;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b ${
            result.success ? 'border-green-800/50' : 'border-red-800/50'
          }`}
        >
          <div className="flex items-center gap-3">
            {result.success ? (
              <CheckCircle2 className="text-green-400" size={24} />
            ) : (
              <XCircle className="text-red-400" size={24} />
            )}
            <div>
              <h3 className="text-lg font-bold text-white">
                {result.success ? 'Importación Exitosa' : 'Errores en la Importación'}
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">{result.message}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto flex-1 p-6">
          {result.success ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-400">{result.conceptsProcessed}</p>
                  <p className="text-sm text-green-300/70 mt-1">Conceptos procesados</p>
                </div>
                <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-blue-400">{result.ratesProcessed}</p>
                  <p className="text-sm text-blue-300/70 mt-1">Tasas actualizadas</p>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300">
                  Los datos de la tabla del Decreto 1808 han sido actualizados exitosamente. El catálogo
                  se mostrará con los nuevos valores inmediatamente.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-4">
                Corrija los siguientes errores en el archivo Excel y vuelva a importarlo.
                <strong className="text-white"> Ningún dato fue modificado en la base de datos.</strong>
              </p>
              {result.errors.map((err, i) => (
                <div
                  key={i}
                  className="bg-red-900/10 border border-red-800/30 rounded-lg px-4 py-3 flex items-start gap-3"
                >
                  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="text-red-300 font-mono font-semibold">
                      [{err.sheet} – Fila {err.row}]
                    </span>{' '}
                    <span className="text-yellow-300">Campo: {err.field}</span>
                    <span className="text-gray-300"> — {err.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors ${
              result.success
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            {result.success ? 'Cerrar' : 'Entendido, voy a corregirlo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────────
export default function FiscalSettingsPage() {
  const [ut, setUt] = useState<UtValue>({ name: 'UNIDAD_TRIBUTARIA', value: 0 });
  const [concepts, setConcepts] = useState<IslrConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUT, setSavingUT] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const utData = await apiClient.get<UtValue>('/islr/ut');
      if (utData) setUt(utData);

      const conceptsData = await apiClient.get<IslrConcept[]>('/islr/concepts');
      if (conceptsData) setConcepts(conceptsData);
    } catch {
      toast.error('Error al cargar configuraciones fiscales');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUT = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingUT(true);
      await apiClient.post('/islr/ut', { value: Number(ut.value) });
      toast.success('Unidad Tributaria (UT) actualizada exitosamente');
      fetchData();
    } catch {
      toast.error('Ocurrió un error al actualizar la UT');
    } finally {
      setSavingUT(false);
    }
  };

  const handleSeedMatrix = async () => {
    try {
      setSeeding(true);
      const res = await apiClient.post<{ message: string; seededCount: number }>('/islr/seed', {});
      toast.success(res.message || 'Catálogo Oficial Precargado (' + res.seededCount + ' registros)');
      fetchData();
    } catch {
      toast.error('Error al precargar matriz SENIAT');
    } finally {
      setSeeding(false);
    }
  };

  // ── Descargar plantilla Excel ──────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const url = `${apiBase}/islr/export-template`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al descargar la plantilla');

      const blob = await response.blob();
      const date = new Date().toISOString().slice(0, 10);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `decreto1808_${date}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success('Plantilla descargada. Los datos actuales están pre-cargados.');
    } catch {
      toast.error('Error al descargar la plantilla Excel');
    } finally {
      setDownloading(false);
    }
  };

  // ── Importar desde Excel ───────────────────────────────────────────────────
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Resetear el input para permitir re-seleccionar el mismo archivo
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (!file.name.endsWith('.xlsx')) {
      toast.error('Solo se aceptan archivos Excel (.xlsx)');
      return;
    }

    try {
      setImporting(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiBase}/islr/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result: ImportResult = await response.json() as ImportResult;
      setImportResult(result);

      if (result.success) {
        await fetchData(); // Refrescar la tabla
      }
    } catch {
      toast.error('Error de conexión al importar el archivo');
    } finally {
      setImporting(false);
    }
  };

  const personTypeBadgeColor: Record<string, string> = {
    PJD:  'bg-blue-900/40 text-blue-300 border-blue-700/50',
    PNR:  'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
    PNNR: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
    PJND: 'bg-orange-900/40 text-orange-300 border-orange-700/50',
  };

  return (
    <>
      {/* Modal de resultado de importación */}
      {importResult && (
        <ImportResultModal
          result={importResult}
          onClose={() => setImportResult(null)}
        />
      )}

      {/* Input oculto para selección de archivo */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleFileSelected}
        id="islr-file-input"
      />

      <div className="space-y-6 animate-fade-in pb-12">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Calculator className="text-blue-500" /> Ajustes Fiscales (ISLR)
            </h1>
            <p className="text-gray-400 mt-1">
              Gestione la Unidad Tributaria y el catálogo de retenciones del Decreto 1808.
            </p>
          </div>

          {/* Botones de importación/exportación */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadTemplate}
              disabled={downloading || loading}
              title="Descarga el Excel con los datos actuales pre-cargados"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {downloading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Download size={14} className="text-blue-400" />
              )}
              {downloading ? 'Descargando...' : 'Descargar Plantilla'}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing || loading}
              title="Importa un Excel con la estructura de la plantilla oficial"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-700/20 border border-emerald-700/50 hover:bg-emerald-700/40 text-emerald-300 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {importing ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {importing ? 'Importando...' : 'Importar Excel'}
            </button>
          </div>
        </div>

        {/* ── Banner informativo de Excel ─────────────────────────────────── */}
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 flex items-start gap-3">
          <FileSpreadsheet size={18} className="text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200/80">
            <strong className="text-blue-300">¿Cómo actualizar el catálogo?</strong>
            {' '}Descarga la plantilla Excel (incluye los datos actuales), modifica los conceptos
            y tasas según el decreto vigente, y luego importa el archivo. La importación
            es <strong className="text-white">atómica</strong>: si hay errores, no se realizará
            ningún cambio.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── UT Config ──────────────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <RefreshCw size={18} className="text-orange-400" />
                Unidad Tributaria Actual
              </h2>
              <form onSubmit={handleSaveUT} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Valor Actual de la UT (VES)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400">Bs.</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={ut.value}
                      onChange={(e) => setUt({ ...ut, value: Number(e.target.value) })}
                      className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  {ut.effectiveDate && (
                    <p className="text-xs text-gray-500 mt-2">
                      Última actualización: {new Date(ut.effectiveDate).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingUT || loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 font-medium"
                  >
                    <Save size={18} />
                    {savingUT ? 'Guardando...' : 'Actualizar Valor UT'}
                  </button>
                </div>
              </form>

              <div className="mt-6 bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={16} />
                  <p className="text-sm text-blue-200/80">
                    Las facturas de proveedor autocalcularán su deducción (Sustraendo) en tiempo
                    real en función de la UT registrada aquí.
                  </p>
                </div>
              </div>

              <div className="mt-4 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  <strong>Configuración SaaS Global:</strong> Modificar la Unidad Tributaria afecta
                  a todas las empresas registradas en este servicio, puesto que es una normativa de
                  Estado.
                </p>
              </div>
            </div>
          </div>

          {/* ── Tabla de Conceptos y Tasas ──────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-gray-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h2 className="text-lg font-medium text-white flex items-center gap-2">
                  <Calculator size={18} className="text-green-400" />
                  Catálogo Vigente — Decreto 1808
                  {concepts.length > 0 && (
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                      {concepts.length} conceptos
                    </span>
                  )}
                </h2>
                <button
                  onClick={handleSeedMatrix}
                  disabled={seeding || loading}
                  className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw size={14} className={seeding ? 'animate-spin' : ''} />
                  {seeding ? 'Cargando...' : 'Precargar Default Oficial (2026)'}
                </button>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-900 border-b border-gray-700 text-xs uppercase tracking-wider text-gray-400">
                      <th className="p-4 font-medium w-24">Código</th>
                      <th className="p-4 font-medium">Descripción del Concepto</th>
                      <th className="p-4 font-medium w-80">Tipo Persona | % | Sustraendo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-3">
                            <RefreshCw className="animate-spin text-blue-500" size={24} />
                            Cargando matriz tributaria...
                          </div>
                        </td>
                      </tr>
                    ) : concepts.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-10 text-center">
                          <div className="flex flex-col items-center gap-4 text-gray-400">
                            <FileSpreadsheet size={40} className="text-gray-600" />
                            <div>
                              <p className="font-medium text-gray-300">Sin conceptos registrados</p>
                              <p className="text-sm mt-1">
                                Importa un Excel o usa el botón &quot;Precargar Default Oficial&quot;
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      concepts.map((concept) => (
                        <tr key={concept.id} className="hover:bg-gray-700/20 transition-colors">
                          <td className="p-4 text-white font-mono text-sm font-semibold">
                            {concept.code}
                          </td>
                          <td className="p-4 text-gray-300 text-sm leading-snug">
                            {concept.description}
                          </td>
                          <td className="p-4">
                            <div className="space-y-1.5">
                              {concept.rates.map((r) => (
                                <div
                                  key={r.id}
                                  className={`flex items-center gap-2 text-xs rounded-md px-2.5 py-1.5 border ${
                                    personTypeBadgeColor[r.personType] ??
                                    'bg-gray-700/40 text-gray-300 border-gray-600/50'
                                  }`}
                                >
                                  <span className="font-bold w-9 shrink-0">{r.personType}</span>
                                  <span className="text-white/90">
                                    <b>{Number(r.percentage)}%</b>
                                  </span>
                                  <div className="h-3 w-px bg-current opacity-30 mx-0.5" />
                                  <span className="opacity-80">
                                    Sust: <b className="text-white/90">{Number(r.sustraendoFact)}</b>
                                  </span>
                                  {Number(r.minBaseUt) > 0 && (
                                    <>
                                      <div className="h-3 w-px bg-current opacity-30 mx-0.5" />
                                      <span className="opacity-80">
                                        Min: <b className="text-white/90">{Number(r.minBaseUt)} UT</b>
                                      </span>
                                    </>
                                  )}
                                </div>
                              ))}
                              {concept.rates.length === 0 && (
                                <span className="text-xs text-orange-400">
                                  Sin tasas asignadas
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
