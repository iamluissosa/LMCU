'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Download, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function EventsReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any[]>('/events/report/monthly');
      setReport(data || []);
    } catch (e) {
      toast.error('Error cargando el reporte mensual');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const totalIngreso = report.reduce((sum, item) => sum + item.ingreso, 0);
  const totalNomina = report.reduce((sum, item) => sum + item.nomina, 0);
  const totalViaticos = report.reduce((sum, item) => sum + item.viaticos, 0);
  const totalOtros = report.reduce((sum, item) => sum + item.otrosGastos, 0);
  const totalProfit = report.reduce((sum, item) => sum + item.profit, 0);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard/events')} 
            className="p-3 bg-[#1A1F2C] text-emerald-400 hover:bg-emerald-500/20 rounded-2xl border border-white/10 transition-all active:scale-95 shadow-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
               <TrendingUp className="text-emerald-500" /> Rendimiento de Proyectos
            </h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
               Reporte consolidado de Ingresos, Nómina y Gastos
            </p>
          </div>
        </div>
        
        <button className="bg-[#1A1F2C] border border-white/10 hover:bg-white/10 text-white px-5 py-3 rounded-2xl flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95">
          <Download size={16} className="text-emerald-400" /> Exportar CSV
        </button>
      </div>

      {loading ? (
         <div className="text-center py-20 text-gray-500 font-mono text-xs uppercase tracking-widest bg-[#1A1F2C] rounded-[2rem] border border-white/5 animate-pulse">Calculando Rentabilidad Consolidada...</div>
      ) : (
        <div className="bg-[#1A1F2C] rounded-[2rem] border border-white/5 shadow-2xl overflow-x-auto">
           <table className="w-full text-sm text-left">
             <thead className="bg-[#0B1120] text-[9px] uppercase font-black tracking-widest border-b border-white/5">
                <tr>
                  <th className="px-6 py-5 text-gray-400">Fecha</th>
                  <th className="px-6 py-5 text-gray-400">Nombre del Evento</th>
                  <th className="px-6 py-5 text-emerald-400/80 text-right">Ingreso Bruto</th>
                  <th className="px-6 py-5 text-rose-400/80 text-right">Nómina P.A.</th>
                  <th className="px-6 py-5 text-rose-400/80 text-right">Viáticos</th>
                  <th className="px-6 py-5 text-rose-400/80 text-right">Otros Gastos</th>
                  <th className="px-6 py-5 text-rose-400 text-right">Total Egreso</th>
                  <th className="px-6 py-5 text-blue-400 text-right bg-blue-500/5">Rentabilidad</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {report.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => router.push(`/dashboard/events/${item.id}`)}>
                    <td className="px-6 py-4 font-mono text-gray-500 text-xs">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-black text-gray-300 group-hover:text-emerald-400 transition-colors uppercase tracking-wide">{item.name}</td>
                    <td className="px-6 py-4 text-right font-black text-emerald-400">${item.ingreso.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right text-gray-400 font-mono">${item.nomina.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right text-gray-400 font-mono">${item.viaticos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right text-gray-400 font-mono">${item.otrosGastos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right font-black text-rose-400">${item.totalEgresos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className={`px-6 py-4 text-right font-black text-lg bg-blue-500/5 flex items-center justify-end gap-1.5 ${item.profit >= 0 ? 'text-blue-400' : 'text-rose-500'}`}>
                       ${item.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}

                {/* TOTALES */}
                {report.length > 0 && (
                   <tr className="bg-[#0B1120] border-t-4 border-white/10 text-xs shadow-inner">
                     <td colSpan={2} className="px-6 py-6 text-right font-black uppercase tracking-widest text-white/50">Consolidado Total</td>
                     <td className="px-6 py-6 text-right font-black text-emerald-400 text-xl border-l border-white/5 shadow-inner bg-emerald-500/5">
                         <span className="text-emerald-500/50 text-xs mr-1">$</span>
                         {totalIngreso.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                     </td>
                     <td className="px-6 py-6 text-right font-black text-rose-400 border-l border-white/5 bg-[#0B1120]">${totalNomina.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                     <td className="px-6 py-6 text-right font-black text-rose-400">${totalViaticos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                     <td className="px-6 py-6 text-right font-black text-rose-400">${totalOtros.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                     <td className="px-6 py-6 text-right font-black text-rose-500 text-xl border-l border-white/5 bg-rose-500/5">
                         <span className="text-rose-500/50 text-xs mr-1">$</span>
                         {(totalNomina + totalViaticos + totalOtros).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                     </td>
                     <td className={`px-6 py-6 text-right font-black text-2xl shadow-inner border-l border-white/5 ${totalProfit >= 0 ? 'text-blue-400 bg-blue-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                       <span className={`${totalProfit >= 0 ? 'text-blue-500/50' : 'text-rose-500/50'} text-sm mr-1`}>$</span>
                       {totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                     </td>
                   </tr>
                )}
                {report.length === 0 && <tr><td colSpan={8} className="text-center py-20 text-gray-500 font-mono text-xs uppercase tracking-widest bg-white/[0.01]">No hay información para consolidar</td></tr>}
             </tbody>
           </table>
        </div>
      )}
    </div>
  );
}
