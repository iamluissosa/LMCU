'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Clock, CheckCircle, TrendingUp, TrendingDown, DollarSign, Plus, Link as LinkIcon, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function EventDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, grossProfit: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'INGRESOS' | 'EGRESOS'>('INGRESOS');

  // Modal Vincular
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [unlinkedExpenses, setUnlinkedExpenses] = useState<any[]>([]);
  const [loadingLink, setLoadingLink] = useState(false);

  // Use useEffect parameter caching to avoid hook dependency errors
  const eventId = params.id;

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const dbEvent = await apiClient.get<any>(`/events/${eventId}`);
      setEvent(dbEvent);
      const dbSummary = await apiClient.get<any>(`/events/${eventId}/financial-summary`);
      setSummary(dbSummary);
    } catch (e) {
      toast.error('Error al cargar perfil del evento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvent(); }, [eventId]);

  const fetchUnlinkedExpenses = async () => {
    setLoadingLink(true);
    try {
      const res = await apiClient.get<any>('/payments-out?limit=150');
      const items = res.items || [];
      const valid = items.filter((i:any) => i.isDirectExpense && !i.eventId);
      setUnlinkedExpenses(valid);
    } catch (e) {
      toast.error('Error cargando gastos sin vincular');
    } finally {
      setLoadingLink(false);
    }
  };

  const handleOpenLinkModal = () => {
    setIsLinkModalOpen(true);
    fetchUnlinkedExpenses();
  };

  const handleLinkExpense = async (paymentId: string) => {
    try {
      await apiClient.patch(`/payments-out/${paymentId}/link-event`, { eventId });
      toast.success('Gasto vinculado al evento');
      setIsLinkModalOpen(false);
      fetchEvent();
    } catch (e) {
      toast.error('Error al vincular el gasto');
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500 font-mono text-xs uppercase tracking-widest">Cargando perfil...</div>;
  if (!event) return <div className="text-center text-red-500 py-12 font-mono text-sm">No se encontró el evento.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* HEADER */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        <button 
          onClick={() => router.push('/dashboard/events')} 
          className="p-3 bg-[#1A1F2C] text-purple-400 hover:bg-purple-500/20 rounded-2xl border border-white/10 transition-all active:scale-95 shadow-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2 leading-none">
            {event.name}
          </h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2 flex gap-3">
            <span className="bg-[#1A1F2C] border border-white/5 px-2 py-0.5 rounded text-purple-400">ID: {event.id.split('-')[0]}</span>
            <span className="bg-[#1A1F2C] border border-white/5 px-2 py-0.5 rounded flex items-center gap-1.5"><Clock size={10} /> {new Date(event.date).toLocaleDateString()}</span>
          </p>
        </div>
      </div>

      {/* FINANCIAL SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-[#1A1F2C] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-center transition-all hover:bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-3">
               <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 shadow-inner"><TrendingUp size={16} /></div>
               <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Ingresos</span>
            </div>
            <p className="text-4xl font-black text-white tracking-tighter">
              <span className="text-emerald-500 text-2xl mr-1">$</span>
              {summary.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
         </div>

         <div className="bg-[#1A1F2C] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-center transition-all hover:bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-3">
               <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400 shadow-inner"><TrendingDown size={16} /></div>
               <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Egresos</span>
            </div>
            <p className="text-4xl font-black text-white tracking-tighter">
              <span className="text-rose-500 text-2xl mr-1">$</span>
              {summary.totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
         </div>

         <div className={`bg-[#1A1F2C] border rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-center transition-all ${summary.grossProfit >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-10 ${summary.grossProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <div className="flex items-center gap-3 mb-3 relative z-10">
               <div className={`p-2 rounded-xl scale-110 shadow-lg ${summary.grossProfit >= 0 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white' : 'bg-gradient-to-br from-rose-400 to-rose-600 text-white'}`}><DollarSign size={16} /></div>
               <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Rentabilidad (Profit)</span>
            </div>
            <p className={`text-4xl font-black tracking-tighter relative z-10 ${summary.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span className="text-2xl mr-1 opacity-50">$</span>
              {summary.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
         </div>
      </div>

      {/* TABS */}
      <div className="bg-[#1A1F2C] rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden mt-8">
        <div className="flex border-b border-white/5 bg-white/[0.02]">
          <button 
            onClick={() => setTab('INGRESOS')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${tab === 'INGRESOS' ? 'text-emerald-400 bg-emerald-500/5' : 'text-gray-500 hover:text-gray-300'}`}
          >
             INGRESOS VINCULADOS
             {tab === 'INGRESOS' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>}
          </button>
          <button 
            onClick={() => setTab('EGRESOS')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${tab === 'EGRESOS' ? 'text-rose-400 bg-rose-500/5' : 'text-gray-500 hover:text-gray-300'}`}
          >
             EGRESOS OPERATIVOS
             {tab === 'EGRESOS' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.5)]"></div>}
          </button>
        </div>

        <div className="p-0">
          {tab === 'INGRESOS' && (
            <div>
               <div className="flex justify-end p-5">
                 {/* TODO: Lógica para modal de ingreso libre (Opcional, el usuario indica que se maneja a nivel global). Para este MVP se oculta el botón si no está pedido. */}
               </div>
               
               <table className="w-full text-sm text-left">
                 <thead className="bg-[#0B1120] text-[9px] uppercase text-gray-500 font-black tracking-widest border-y border-white/5">
                    <tr><th className="px-6 py-4">Fecha</th><th className="px-6 py-4">Cliente / Detalle</th><th className="px-6 py-4 text-right">Monto Aplicado</th></tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                   {event.incomes.map((i: any) => (
                     <tr key={i.id} className="hover:bg-white/5 transition-colors">
                       <td className="px-6 py-4 font-mono text-gray-400 text-xs">
                         <span className="bg-[#0B1120] border border-white/5 px-2 py-1 rounded-lg">
                           {new Date(i.income?.paymentDate).toLocaleDateString()}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-gray-300 font-medium">
                         {i.income?.clientName || 'Sin Cliente'} 
                         <span className="text-[10px] font-normal text-gray-500 block mt-1">{i.income?.description}</span>
                       </td>
                       <td className="px-6 py-4 text-right font-black text-emerald-400 text-lg">
                         <span className="text-xs text-emerald-500/50 mr-1">$</span>
                         {Number(i.amountApplied).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                       </td>
                     </tr>
                   ))}
                   {event.incomes.length === 0 && <tr><td colSpan={3} className="text-center py-16 text-gray-500 font-mono text-xs uppercase tracking-widest bg-white/[0.01]">Sin ingresos registrados</td></tr>}
                 </tbody>
               </table>
            </div>
          )}

          {tab === 'EGRESOS' && (
            <div>
               <div className="flex justify-between items-center bg-white/[0.02] p-5 border-b border-white/5">
                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest max-w-md leading-relaxed">
                   Egresos de nómina, viáticos u otros pertenecientes al proyecto.
                 </p>
                 <div className="flex gap-2">
                  <button onClick={handleOpenLinkModal} className="bg-[#0B1120] hover:bg-white/5 text-purple-400 border border-purple-500/20 px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 hover:border-purple-500/50">
                    <LinkIcon size={14} /> Vincular Existente
                  </button>
                 </div>
               </div>
               
               <table className="w-full text-sm text-left">
                 <thead className="bg-[#0B1120] text-[9px] uppercase text-gray-500 font-black tracking-widest border-b border-white/5">
                    <tr><th className="px-6 py-4">Ref DB</th><th className="px-6 py-4">Fecha</th><th className="px-6 py-4 w-1/2">Desglose Técnico</th><th className="px-6 py-4 text-right">Gran Total</th></tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                   {event.expenses.map((e: any) => (
                     <tr key={e.id} className="hover:bg-white/5 transition-colors">
                       <td className="px-6 py-4"><span className="bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-blue-500 pl-3 py-1 text-xs font-mono text-blue-400 font-bold">{e.paymentNumber}</span></td>
                       <td className="px-6 py-4 font-mono text-gray-500 text-xs">{new Date(e.paymentDate).toLocaleDateString()}</td>
                       <td className="px-6 py-4 space-y-2">
                         {e.expenseItems.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center gap-4 text-xs bg-[#0B1120] p-2 rounded-lg border border-white/5">
                              <span className="text-[9px] font-black tracking-widest uppercase text-white/50 bg-white/5 px-2 py-0.5 rounded shadow-inner max-w-[100px] truncate" title={item.expenseCategory?.name}>
                                {item.expenseCategory?.name || 'S/CA'}
                              </span>
                              <span className="text-gray-400 truncate flex-1">{item.description}</span>
                              <span className="text-gray-300 font-mono font-bold">${Number(item.amount).toFixed(2)}</span>
                            </div>
                         ))}
                       </td>
                       <td className="px-6 py-4 text-right font-black text-rose-400 text-lg">
                         <span className="text-xs text-rose-500/50 mr-1">$</span>
                         {Number(e.amountPaid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                       </td>
                     </tr>
                   ))}
                   {event.expenses.length === 0 && <tr><td colSpan={4} className="text-center py-16 text-gray-500 font-mono text-xs uppercase tracking-widest bg-white/[0.01]">Sin egresos operativos</td></tr>}
                 </tbody>
               </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL VINCULAR GASTO */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-[#1A1F2C] border border-white/10 rounded-[2rem] overflow-hidden w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                <LinkIcon size={18} className="text-purple-400" />
                Vincular Gasto
              </h2>
              <button onClick={() => setIsLinkModalOpen(false)} className="bg-white/5 hover:bg-red-500/20 hover:text-red-400 p-2 rounded-xl transition-all"><X size={18}/></button>
            </div>
            
            <div className="p-8 pb-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
               {loadingLink ? (
                 <p className="text-center text-gray-500 py-12 font-mono text-xs uppercase tracking-widest animate-pulse">Cargando base de datos...</p>
               ) : (
                 <div className="space-y-4">
                   {unlinkedExpenses.map(exp => (
                     <div key={exp.id} className="bg-[#0B1120] border border-white/5 p-5 rounded-2xl flex justify-between items-center hover:border-purple-500/40 transition-colors group">
                        <div>
                          <p className="font-bold text-white text-sm flex items-center gap-3">
                            <span className="font-mono text-purple-300/50">{exp.paymentNumber}</span>
                            <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md shadow-inner text-lg">
                              ${Number(exp.amountPaid).toFixed(2)}
                            </span>
                          </p>
                          <p className="text-[11px] text-gray-500 font-medium mt-2">{new Date(exp.paymentDate).toLocaleDateString()} • {exp.notes || 'Egreso Operativo General'}</p>
                        </div>
                        <button onClick={() => handleLinkExpense(exp.id)} className="bg-white/5 text-gray-300 border border-white/10 group-hover:border-purple-500/50 group-hover:bg-purple-600 group-hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2">
                          <LinkIcon size={12} /> Vincular
                        </button>
                     </div>
                   ))}
                   {unlinkedExpenses.length === 0 && <p className="text-center text-gray-500 font-mono text-xs uppercase tracking-widest py-12 bg-white/[0.01] rounded-2xl border border-white/5 border-dashed">No hay gastos directos libres.</p>}
                 </div>
               )}
            </div>
            <div className="p-4 flex justify-center border-t border-white/5 bg-white/[0.01]">
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Mostrando {unlinkedExpenses.length} coincidencias</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
