'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Calculator, Save, AlertCircle, RefreshCw } from 'lucide-react';
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

export default function FiscalSettingsPage() {
  const [ut, setUt] = useState<UtValue>({ name: 'UNIDAD_TRIBUTARIA', value: 0 });
  const [concepts, setConcepts] = useState<IslrConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUT, setSavingUT] = useState(false);
  const [seeding, setSeeding] = useState(false);

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
    } catch (error) {
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
    } catch (error) {
      toast.error('Ocurrió un error al actualizar la UT');
    } finally {
      setSavingUT(false);
    }
  };

  const handleSeedMatrix = async () => {
    try {
      setSeeding(true);
      const res = await apiClient.post<{message: string; seededCount: number}>('/islr/seed', {});
      toast.success(res.message || 'Catálogo Oficial Precargado (' + res.seededCount + ' registros)');
      fetchData();
    } catch (error) {
      toast.error('Error al precargar matriz SENIAT');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="text-blue-500" /> Ajustes Fiscales (ISLR)
          </h1>
          <p className="text-gray-400 mt-1">
            Gestione la Unidad Tributaria y consulte las retenciones vigentes s/Decreto 1808.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* UT Config */}
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
                   Las facturas de proveedor autocalcularán su deducción (Sustraendo) en tiempo real en función de la UT registrada aquí.
                 </p>
               </div>
            </div>
            
            <div className="mt-4 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  <strong>Configuración SaaS Global:</strong> Modificar la Unidad Tributaria afecta a todas las empresas registradas en este servicio Puesto que es una normativa de Estado.
                </p>
            </div>
          </div>
        </div>

        {/* Conceptos y Tasas List */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Calculator size={18} className="text-green-400" />
                Catálogo Vigente - Decreto 1808
              </h2>
              <button
                onClick={handleSeedMatrix}
                disabled={seeding || loading}
                className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
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
                    <th className="p-4 font-medium w-80">Asignaciones (T.P. | % | Sustr.)</th>
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
                      <td colSpan={3} className="p-8 text-center text-gray-400">
                        <p>No hay conceptos registrados en la matriz global.</p>
                      </td>
                    </tr>
                  ) : (
                     concepts.map(concept => (
                       <tr key={concept.id} className="hover:bg-gray-700/20">
                         <td className="p-4 text-white font-mono text-sm">{concept.code}</td>
                         <td className="p-4 text-gray-300 text-sm">{concept.description}</td>
                         <td className="p-4">
                            <div className="space-y-1">
                              {concept.rates.map(r => (
                                <div key={r.id} className="flex items-center gap-2 text-xs bg-gray-900/30 rounded px-2 py-1.5 border border-gray-700/50">
                                  <span className="font-semibold text-blue-400 w-9">{r.personType}</span>
                                  <span className="text-gray-300">T: <b className="text-white">{Number(r.percentage)}%</b></span>
                                  <div className="h-3 w-px bg-gray-700 mx-1"></div>
                                  <span className="text-gray-400">
                                    Base Min: <b className="text-gray-300">{Number(r.minBaseUt)}</b> UT
                                  </span>
                                  <div className="h-3 w-px bg-gray-700 mx-1"></div>
                                  <span className="text-gray-400">
                                    Sustr: <b className="text-gray-300">{Number(r.sustraendoFact)}</b>
                                  </span>
                                </div>
                              ))}
                              {concept.rates.length === 0 && (
                                <span className="text-xs text-orange-400">No hay tasas aplicables asignadas</span>
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
  );
}
