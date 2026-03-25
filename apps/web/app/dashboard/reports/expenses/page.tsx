'use client';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { 
  FileText, Search, Filter, Download, DollarSign, 
  TrendingDown, Calendar, Building2, Server, RefreshCw
} from 'lucide-react';


interface ExpenseRow {
  id: string;
  type: 'INVOICE' | 'DIRECT_EXPENSE';
  date: string;
  reference: string;
  entityName: string;
  description: string;
  categoryId: string;
  categoryName: string;
  departmentId: string;
  departmentName: string;
  currencyCode: string;
  exchangeRate: number;
  originalAmount: number;
  amountUSD: number;
  amountVES: number;
}

export default function ExpensesReportPage() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  // Catalogues for filters
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    // Definimos el rango por defecto: Mes actual
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(firstDay || '');
    setEndDate(lastDay || '');

    apiClient.get('/expense-categories').then((res: any) => setCategories(Array.isArray(res) ? res : []));
    apiClient.get('/departments').then((res: any) => setDepartments(Array.isArray(res) ? res : []));
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, categoryId, departmentId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      if (categoryId) query.append('categoryId', categoryId);
      if (departmentId) query.append('departmentId', departmentId);

      const data = await apiClient.get<ExpenseRow[]>(`/reports/expenses?${query.toString()}`);
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalUSD = expenses.reduce((sum, item) => sum + Number(item.amountUSD || 0), 0);
  const totalVES = expenses.reduce((sum, item) => sum + Number(item.amountVES || 0), 0);

  const exportCSV = () => {
    const header = ['FECHA', 'ORIGEN', 'REFERENCIA', 'ENTIDAD', 'CATEGORIA', 'CENTRO DE COSTO', 'DESCRIPCION', 'MONEDA', 'MONTO ORIGINAL', 'TASA', 'MONTO USD', 'MONTO VES'].join(';');
    const rows = expenses.map(e => [
      new Date(e.date).toLocaleDateString('es-VE'),
      e.type === 'INVOICE' ? '"Factura Compra"' : '"Egreso Directo"',
      `"${e.reference}"`,
      `"${e.entityName}"`,
      `"${e.categoryName}"`,
      `"${e.departmentName}"`,
      `"${e.description?.replace(/"/g, '""') || ''}"`,
      e.currencyCode,
      e.originalAmount,
      e.exchangeRate,
      e.amountUSD,
      e.amountVES
    ].join(';'));
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Gastos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-[1600px] mx-auto pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
            <TrendingDown className="text-blue-500" size={32} /> Historial de Gastos
          </h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
             <Server size={14}/> Análisis consolidado de Compras Directas y Pagos de Factura
          </p>
        </div>
        
        <button 
          onClick={exportCSV}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-xl shadow-emerald-500/20 transition-all uppercase tracking-widest text-xs active:scale-95"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* FILTROS Y KPIS */}
      <div className="grid lg:grid-cols-4 gap-6">
        
        {/* PANEL DE FILTROS */}
        <div className="lg:col-span-3 bg-[#1A1F2C] p-6 rounded-3xl border border-white/10 shadow-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12}/> Fecha Desde</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} 
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12}/> Fecha Hasta</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} 
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><Building2 size={12}/> Centro Costo</label>
              <select value={departmentId} onChange={e => setDepartmentId(e.target.value)}
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                <option value="">TODOS</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><Filter size={12}/> Categoría</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                <option value="">TODAS</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* TARJETA KPI */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white flex rounded-full blur-3xl opacity-10"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Impacto Total Período</p>
            <h2 className="text-4xl font-black tracking-tighter text-white break-words relative z-10">
              <span className="text-xl text-white/50 mr-1">$</span>
              {totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <div className="mt-3 text-xs font-bold text-blue-200">
               Eqv. Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
        </div>

      </div>

      {/* RESULTADOS - TABLA */}
      <div className="bg-[#1A1F2C] rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative">
        {loading && (
          <div className="absolute inset-0 bg-[#0B1120]/50 backdrop-blur-sm z-10 flex items-center justify-center">
             <div className="animate-spin text-blue-500"><RefreshCw size={32} /></div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-widest text-gray-400">
                <th className="p-4 font-black">Fecha</th>
                <th className="p-4 font-black">Origen / Ref</th>
                <th className="p-4 font-black">Anotación / Doc.</th>
                <th className="p-4 font-black">Clasificación Analítica</th>
                <th className="p-4 font-black text-right">Monto Base</th>
                <th className="p-4 font-black text-right">Conv. USD ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-gray-300">
              {expenses.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 font-bold">
                    No hay gastos registrados en el período y filtros seleccionados.
                  </td>
                </tr>
              )}
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4 font-mono text-xs whitespace-nowrap">
                    {new Date(e.date).toLocaleDateString('es-VE')}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        {e.type === 'INVOICE' ? <FileText size={12} className="text-emerald-500"/> : <DollarSign size={12} className="text-blue-500"/>}
                        {e.reference}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{e.entityName}</span>
                    </div>
                  </td>
                  <td className="p-4 max-w-xs truncate text-xs" title={e.description}>
                    {e.description || 'Sin explicación'}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] bg-white/5 text-gray-300 border border-white/5 px-2 py-0.5 rounded-full inline-block w-fit">{e.categoryName}</span>
                      <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest w-fit">{e.departmentName}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono pr-6">
                    <div className="flex flex-col items-end">
                      <span className="text-gray-300 font-bold text-xs">{e.currencyCode} {e.originalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-[9px] text-gray-600 block">Tasa: {e.exchangeRate.toFixed(4)}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-black text-white text-base">
                    ${e.amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
