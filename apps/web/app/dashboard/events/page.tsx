'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Calendar, Plus, Search, Eye, TrendingUp, CheckCircle, Clock, Upload, Download, FileSpreadsheet, X, AlertCircle, CheckCircle2, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  // Modal para Nuevo Evento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', date: '' });

  // Modal para Importar Excel
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: { row: number; message: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any[]>('/events');
      setEvents(data || []);
    } catch (e) {
      toast.error('Error cargando eventos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.post('/events', formData);
      toast.success('Evento creado con éxito');
      setIsModalOpen(false);
      setFormData({ name: '', date: '' });
      fetchEvents();
    } catch (e) {
      toast.error('Error al crear evento');
    } finally {
      setIsSaving(false);
    }
  };

  // ── IMPORTACIÓN EXCEL ────────────────────────────────

  const handleDownloadTemplate = async () => {
    try {
      // Obtenemos el token para autenticarnos
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_URL}/events/template`, {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      });

      if (!res.ok) throw new Error('Error descargando plantilla');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_eventos.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Plantilla descargada exitosamente');
    } catch (e) {
      toast.error('Error al descargar la plantilla');
    }
  };

  const handleFileSelect = (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx')) {
      toast.error('Solo se permiten archivos Excel (.xlsx)');
      return;
    }
    setImportFile(file);
    setImportResult(null);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleImport = async () => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const result = await apiClient.upload<{ created: number; skipped: number; errors: { row: number; message: string }[] }>(
        '/events/import',
        formData,
      );
      setImportResult(result);
      if (result.created > 0) {
        toast.success(`${result.created} evento(s) importado(s) exitosamente`);
        fetchEvents();
      }
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} fila(s) con error`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al importar el archivo');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportResult(null);
    setIsDragging(false);
  };

  // Array de años disponibles
  const availableYears = Array.from(new Set(events.map(ev => new Date(ev.date).getFullYear()))).sort((a, b) => b - a);
  const monthsNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const filteredEvents = events.filter(ev => {
    const date = new Date(ev.date);
    const matchName = ev.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchYear = selectedYear === 'Todos' || date.getFullYear().toString() === selectedYear;
    const matchMonth = selectedMonth === 'Todos' || date.getMonth().toString() === selectedMonth;
    const matchStatus = selectedStatus === 'Todos' || ev.status === selectedStatus;
    
    return matchName && matchYear && matchMonth && matchStatus;
  });

  const groupedEvents = filteredEvents.reduce((acc, ev) => {
    const date = new Date(ev.date);
    const year = date.getFullYear();
    const monthName = monthsNames[date.getMonth()];
    const key = `${monthName} ${year}`;
    
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {} as Record<string, any[]>);

  const sortedGroupKeys = Object.keys(groupedEvents).sort((a, b) => {
    const [mA, yA] = a.split(' ');
    const [mB, yB] = b.split(' ');
    const dateA = new Date(Number(yA), monthsNames.indexOf(mA || ''));
    const dateB = new Date(Number(yB), monthsNames.indexOf(mB || ''));
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-[#1A1F2C] p-6 rounded-3xl shadow-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-fuchsia-500" />
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Calendar className="text-purple-500" /> Eventos
          </h1>
          <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest font-bold">Mide la Rentabilidad y Utilidad por Proyecto</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/dashboard/events/report')} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-[10px] font-black uppercase tracking-widest">
            <TrendingUp size={16} className="text-emerald-400" /> Reporte Mensual
          </button>
          <button onClick={() => setIsImportModalOpen(true)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-[10px] font-black uppercase tracking-widest hover:border-blue-500/40">
            <Upload size={16} className="text-blue-400" /> Importar Excel
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-xl shadow-purple-500/20 text-[10px] font-black uppercase tracking-widest">
            <Plus size={16} /> Crear Evento
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" placeholder="Buscar evento de campo..." 
            className="w-full pl-12 pr-4 py-3 bg-[#1A1F2C] border border-white/5 text-white placeholder-gray-500 rounded-2xl focus:ring-1 focus:ring-purple-500 outline-none transition-all font-medium text-sm shadow-sm"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Contenedor de Filtros */}
        <div className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-[#1A1F2C] border border-white/5 p-2 rounded-2xl shadow-sm">
          <div className="flex items-center pl-3 text-purple-400">
            <Filter size={18} />
          </div>
          
          <select 
            value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            className="bg-[#0B1120] border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none appearance-none min-w-[90px] cursor-pointer"
          >
            <option value="Todos">Año</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select 
            value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="bg-[#0B1120] border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none appearance-none min-w-[110px] cursor-pointer"
          >
            <option value="Todos">Mes</option>
            {monthsNames.map((month, idx) => (
              <option key={month} value={idx.toString()}>{month}</option>
            ))}
          </select>

          <select 
            value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
            className="bg-[#0B1120] border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none appearance-none min-w-[120px] cursor-pointer"
          >
            <option value="Todos">Estatus</option>
            <option value="ACTIVE">En Curso</option>
            <option value="COMPLETED">Completado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Grid de Eventos Agrupados */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 font-mono text-xs uppercase tracking-widest">Cargando eventos...</div>
      ) : (
        <div className="space-y-12">
          {sortedGroupKeys.length === 0 ? (
            <div className="py-16 text-center bg-[#1A1F2C] border border-white/5 rounded-3xl text-gray-500 font-mono text-xs uppercase tracking-widest">
              No se encontraron eventos para los filtros aplicados.
            </div>
          ) : (
            sortedGroupKeys.map(key => (
              <div key={key} className="space-y-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-black text-white uppercase tracking-widest bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                    {key}
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                  <span className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-widest">
                    {groupedEvents[key].length} EVENTO{groupedEvents[key].length > 1 ? 'S' : ''}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedEvents[key].map((ev: any) => (
                    <div key={ev.id} className="bg-[#1A1F2C] border border-white/5 p-6 rounded-3xl hover:border-purple-500/40 transition-all hover:bg-white/[0.02] cursor-pointer flex flex-col justify-between min-h-[220px] shadow-lg" onClick={() => router.push(`/dashboard/events/${ev.id}`)}>
                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 ${
                            ev.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-400' 
                            : ev.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-red-500/10 text-red-400'
                          }`}>
                            {ev.status === 'ACTIVE' ? <Clock size={12} /> : ev.status === 'COMPLETED' ? <CheckCircle size={12} /> : <X size={12} />}
                            {ev.status === 'ACTIVE' ? 'En Curso' : ev.status === 'COMPLETED' ? 'Completado' : 'Cancelado'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono bg-[#0B1120] px-2 py-1 rounded-lg border border-white/5">
                            {new Date(ev.date).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-white leading-tight">{ev.name}</h3>
                      </div>
                      <div className="mt-8 flex justify-between items-center border-t border-white/5 pt-5">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ver Finanzas</span>
                        <span className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 transition-transform group-hover:scale-110">
                          <Eye size={14} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── MODAL CREAR EVENTO ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-[#1A1F2C] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-lg font-black text-white mb-6 uppercase tracking-wider text-center">Registrar <span className="text-purple-400">Evento</span></h2>
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Nombre del Proyecto</label>
                <input required className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="INICIO OPERATIVO SEMANA SANTA 2026"/>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Fecha de Ejecución</label>
                <input required type="date" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none block" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}/>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-[#0B1120] hover:bg-white/5 text-gray-300 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-white/5">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50">Crear y Continuar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL IMPORTAR EXCEL ── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-[#1A1F2C] border border-white/10 rounded-[2rem] overflow-hidden w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400"><FileSpreadsheet size={18} /></div>
                Importar Eventos
              </h2>
              <button onClick={handleCloseImportModal} className="bg-white/5 hover:bg-red-500/20 hover:text-red-400 p-2 rounded-xl transition-all text-gray-400"><X size={18}/></button>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">

              {/* Paso 1: Descargar Plantilla */}
              <div className="bg-[#0B1120] border border-white/5 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black text-sm shrink-0">1</div>
                  <div>
                    <p className="text-white font-bold text-sm">Descargar Plantilla</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Excel formateado con columnas e instrucciones</p>
                  </div>
                </div>
                <button 
                  onClick={handleDownloadTemplate} 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 shrink-0 active:scale-95"
                >
                  <Download size={14} /> Descargar
                </button>
              </div>

              {/* Paso 2: Subir Archivo */}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-sm shrink-0">2</div>
                  <div>
                    <p className="text-white font-bold text-sm">Subir Archivo Completado</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Arrastra o selecciona tu archivo .xlsx</p>
                  </div>
                </div>

                {/* Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 min-h-[160px] ${
                    isDragging
                      ? 'border-blue-400 bg-blue-500/10 scale-[1.01]'
                      : importFile
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-white/10 bg-[#0B1120] hover:border-white/20 hover:bg-white/[0.02]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                  
                  {importFile ? (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <FileSpreadsheet size={28} className="text-emerald-400" />
                      </div>
                      <p className="text-emerald-400 font-bold text-sm">{importFile.name}</p>
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        {(importFile.size / 1024).toFixed(1)} KB • LISTO PARA IMPORTAR
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setImportFile(null); setImportResult(null); }}
                        className="text-[9px] font-black text-gray-500 hover:text-red-400 uppercase tracking-widest transition-colors mt-1"
                      >
                        Cambiar archivo
                      </button>
                    </>
                  ) : (
                    <>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                        <Upload size={28} className={`transition-colors ${isDragging ? 'text-blue-400' : 'text-gray-500'}`} />
                      </div>
                      <p className={`font-bold text-sm transition-colors ${isDragging ? 'text-blue-400' : 'text-gray-400'}`}>
                        {isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo Excel aquí'}
                      </p>
                      <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">
                        o haz clic para seleccionar • Máximo 5 MB
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Resultado de la importación */}
              {importResult && (
                <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-300">
                  {/* Resumen */}
                  <div className={`rounded-2xl p-5 border flex items-center gap-4 ${
                    importResult.errors.length === 0
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-orange-500/5 border-orange-500/20'
                  }`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      importResult.errors.length === 0
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {importResult.errors.length === 0 ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                    </div>
                    <div>
                      <p className="text-white font-black text-sm">
                        {importResult.created} evento{importResult.created !== 1 ? 's' : ''} importado{importResult.created !== 1 ? 's' : ''} exitosamente
                      </p>
                      {importResult.errors.length > 0 && (
                        <p className="text-orange-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                          {importResult.errors.length} fila{importResult.errors.length !== 1 ? 's' : ''} con error
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lista de errores */}
                  {importResult.errors.length > 0 && (
                    <div className="bg-[#0B1120] border border-white/5 rounded-2xl overflow-hidden max-h-40 overflow-y-auto">
                      <div className="px-4 py-2.5 border-b border-white/5 bg-red-500/5">
                        <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Detalle de Errores</p>
                      </div>
                      <div className="divide-y divide-white/5">
                        {importResult.errors.map((err, idx) => (
                          <div key={idx} className="px-4 py-2.5 flex gap-3 text-xs">
                            <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-mono text-[10px] shrink-0">Fila {err.row}</span>
                            <span className="text-gray-400">{err.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-white/5 bg-white/[0.01] flex justify-end gap-3">
              <button
                onClick={handleCloseImportModal}
                className="px-6 py-3 text-gray-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-all"
              >
                {importResult ? 'Cerrar' : 'Cancelar'}
              </button>
              {!importResult && (
                <button
                  onClick={handleImport}
                  disabled={!importFile || isImporting}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:opacity-40 text-white rounded-2xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:hover:scale-100"
                >
                  {isImporting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando...</>
                  ) : (
                    <><Upload size={16} /> Importar Eventos</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
