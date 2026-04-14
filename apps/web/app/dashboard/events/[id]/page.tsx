'use client';

import { useEffect, useState, use } from 'react';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Clock, CheckCircle, TrendingUp, TrendingDown, DollarSign, Plus, Link as LinkIcon, X, Trash2, Pencil, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Desempaquetar params usando React.use() (requerido en Next.js 15+)
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, grossProfit: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'INGRESOS' | 'EGRESOS'>('INGRESOS');

  // Modal Vincular Gasto
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [unlinkedExpenses, setUnlinkedExpenses] = useState<any[]>([]);
  const [loadingLink, setLoadingLink] = useState(false);

  // Ingreso seleccionado (para editar/eliminar)
  const [selectedIncomeId, setSelectedIncomeId] = useState<string | null>(null);
  const [deletingIncome, setDeletingIncome] = useState(false);

  // Modal Registrar / Editar Ingreso
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [savingIncome, setSavingIncome] = useState(false);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    amount: '',
    clientName: '',
    description: '',
    paymentDate: new Date().toISOString().split('T')[0],
    currencyCode: 'USD',
  });
  const [eventDistributions, setEventDistributions] = useState<{ eventId: string; amountApplied: string }[]>([
    { eventId: '', amountApplied: '' }
  ]);

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

  // ── INGRESO MODAL ───────────────────────────────
  const fetchAllEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await apiClient.get<any[]>('/events');
      setAllEvents(res || []);
    } catch {
      toast.error('Error cargando lista de eventos');
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleOpenIncomeModal = () => {
    setEditingIncomeId(null);
    setIncomeForm({
      amount: '',
      clientName: '',
      description: '',
      paymentDate: new Date().toISOString().split('T')[0],
      currencyCode: 'USD',
    });
    setEventDistributions([{ eventId: eventId, amountApplied: '' }]);
    setIsIncomeModalOpen(true);
    fetchAllEvents();
  };

  const handleEditIncome = (incomeDetail: any) => {
    const inc = incomeDetail.income;
    setEditingIncomeId(inc.id);
    setIncomeForm({
      amount: String(Number(inc.amount)),
      clientName: inc.clientName || '',
      description: inc.description || '',
      paymentDate: new Date(inc.paymentDate).toISOString().split('T')[0],
      currencyCode: inc.currencyCode || 'USD',
    });
    // Usar los event details del income completo, o el actual si no hay datos
    const details = inc.eventDetails && inc.eventDetails.length > 0
      ? inc.eventDetails.map((d: any) => ({ eventId: d.eventId, amountApplied: String(Number(d.amountApplied)) }))
      : [{ eventId: eventId, amountApplied: String(Number(incomeDetail.amountApplied)) }];
    setEventDistributions(details);
    setIsIncomeModalOpen(true);
    fetchAllEvents();
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este ingreso? Esta acción no se puede deshacer.')) return;
    setDeletingIncome(true);
    try {
      await apiClient.delete(`/incomes/${incomeId}`);
      toast.success('Ingreso eliminado exitosamente');
      setSelectedIncomeId(null);
      fetchEvent();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar el ingreso');
    } finally {
      setDeletingIncome(false);
    }
  };

  const addDistributionRow = () => {
    setEventDistributions(prev => [...prev, { eventId: '', amountApplied: '' }]);
  };

  const removeDistributionRow = (index: number) => {
    setEventDistributions(prev => prev.filter((_, i) => i !== index));
  };

  const updateDistribution = (index: number, field: 'eventId' | 'amountApplied', value: string) => {
    setEventDistributions(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const totalDistributed = eventDistributions.reduce((sum, d) => sum + (Number(d.amountApplied) || 0), 0);

  const handleCreateIncome = async () => {
    const amount = Number(incomeForm.amount);
    if (!amount || amount <= 0) {
      toast.error('Ingrese un monto total válido');
      return;
    }

    const validDetails = eventDistributions.filter(d => d.eventId && Number(d.amountApplied) > 0);
    if (validDetails.length === 0) {
      toast.error('Agregue al menos un evento con monto asignado');
      return;
    }

    const totalDist = validDetails.reduce((s, d) => s + Number(d.amountApplied), 0);
    if (Math.abs(totalDist - amount) > 0.01) {
      toast.error(`El monto distribuido ($${totalDist.toFixed(2)}) no coincide con el total ($${amount.toFixed(2)})`);
      return;
    }

    setSavingIncome(true);
    try {
      const payload = {
        amount,
        currencyCode: incomeForm.currencyCode,
        paymentDate: incomeForm.paymentDate,
        clientName: incomeForm.clientName || null,
        description: incomeForm.description || null,
        eventDetails: validDetails.map(d => ({
          eventId: d.eventId,
          amountApplied: Number(d.amountApplied),
        })),
      };

      if (editingIncomeId) {
        await apiClient.patch(`/incomes/${editingIncomeId}`, payload);
        toast.success('Ingreso actualizado exitosamente');
      } else {
        await apiClient.post('/incomes', payload);
        toast.success('Ingreso registrado exitosamente');
      }
      setIsIncomeModalOpen(false);
      setEditingIncomeId(null);
      setSelectedIncomeId(null);
      fetchEvent();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar ingreso');
    } finally {
      setSavingIncome(false);
    }
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
               <div className="flex justify-between items-center bg-white/[0.02] p-5 border-b border-white/5">
                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest max-w-md leading-relaxed">
                   Cobros y pagos recibidos vinculados a este evento.{selectedIncomeId && <span className="text-emerald-400 ml-2">• 1 seleccionado</span>}
                 </p>
                 <div className="flex gap-2 items-center">
                   {selectedIncomeId && (
                     <>
                       <button
                         onClick={() => {
                           const detail = event.incomes.find((i: any) => i.id === selectedIncomeId);
                           if (detail) handleEditIncome(detail);
                         }}
                         className="bg-[#0B1120] hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/50 px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95"
                       >
                         <Pencil size={13} /> Modificar
                       </button>
                       <button
                         onClick={() => {
                           const detail = event.incomes.find((i: any) => i.id === selectedIncomeId);
                           if (detail) handleDeleteIncome(detail.income?.id || detail.incomeId);
                         }}
                         disabled={deletingIncome}
                         className="bg-[#0B1120] hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/50 px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50"
                       >
                         <Trash2 size={13} /> {deletingIncome ? 'Eliminando...' : 'Eliminar'}
                       </button>
                       <div className="w-px h-6 bg-white/10 mx-1" />
                     </>
                   )}
                   <button
                     onClick={handleOpenIncomeModal}
                     className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 hover:shadow-emerald-500/30"
                   >
                     <Plus size={14} /> Registrar Ingreso
                   </button>
                 </div>
               </div>
               
               <table className="w-full text-sm text-left">
                 <thead className="bg-[#0B1120] text-[9px] uppercase text-gray-500 font-black tracking-widest border-y border-white/5">
                    <tr><th className="px-6 py-4">Fecha</th><th className="px-6 py-4">Cliente / Detalle</th><th className="px-6 py-4 text-right">Monto Aplicado</th></tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                   {event.incomes.map((i: any) => (
                     <tr 
                       key={i.id} 
                       onClick={() => setSelectedIncomeId(selectedIncomeId === i.id ? null : i.id)}
                       className={`transition-all cursor-pointer ${
                         selectedIncomeId === i.id 
                           ? 'bg-emerald-500/10 border-l-2 border-l-emerald-400 ring-1 ring-emerald-500/20' 
                           : 'hover:bg-white/5 border-l-2 border-l-transparent'
                       }`}
                     >
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
                    <tr><th className="px-6 py-4">Ref DB</th><th className="px-6 py-4">Fecha</th><th className="px-6 py-4 w-1/2">Desglose Técnico</th><th className="px-6 py-4 text-right">Gran Total</th><th className="px-4 py-4 text-center w-16"></th></tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                   {event.expenses.map((e: any) => (
                     <tr key={e.id} className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => window.open(`/print/expense/${e.id}`, '_blank')}>
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
                       <td className="px-4 py-4 text-center">
                         <span className="p-2 rounded-xl text-gray-600 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-all inline-flex" title="Imprimir Comprobante">
                           <Printer size={16} />
                         </span>
                       </td>
                     </tr>
                   ))}
                   {event.expenses.length === 0 && <tr><td colSpan={5} className="text-center py-16 text-gray-500 font-mono text-xs uppercase tracking-widest bg-white/[0.01]">Sin egresos operativos</td></tr>}
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

      {/* MODAL REGISTRAR INGRESO */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-[#1A1F2C] border border-white/10 rounded-[2rem] overflow-hidden w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400"><TrendingUp size={18} /></div>
                {editingIncomeId ? 'Modificar Ingreso' : 'Registrar Ingreso'}
              </h2>
              <button onClick={() => { setIsIncomeModalOpen(false); setEditingIncomeId(null); }} className="bg-white/5 hover:bg-red-500/20 hover:text-red-400 p-2 rounded-xl transition-all"><X size={18}/></button>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6 max-h-[65vh] overflow-y-auto custom-scrollbar">

              {/* Monto Total + Moneda */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Monto Total del Ingreso *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-lg">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={incomeForm.amount}
                      onChange={e => setIncomeForm(p => ({ ...p, amount: e.target.value }))}
                      className="w-full bg-[#0B1120] border border-white/5 focus:border-emerald-500/50 pl-10 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-white text-lg font-black tracking-tighter transition-all placeholder:text-gray-600"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Moneda</label>
                  <select
                    value={incomeForm.currencyCode}
                    onChange={e => setIncomeForm(p => ({ ...p, currencyCode: e.target.value }))}
                    className="w-full bg-[#0B1120] border border-white/5 focus:border-emerald-500/50 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-white text-sm font-bold transition-all appearance-none cursor-pointer"
                  >
                    <option value="USD">USD</option>
                    <option value="VES">VES (Bs)</option>
                  </select>
                </div>
              </div>

              {/* Fecha + Cliente */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Fecha de Pago</label>
                  <input
                    type="date"
                    value={incomeForm.paymentDate}
                    onChange={e => setIncomeForm(p => ({ ...p, paymentDate: e.target.value }))}
                    className="w-full bg-[#0B1120] border border-white/5 focus:border-emerald-500/50 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-white text-sm font-bold transition-all [&::-webkit-calendar-picker-indicator]:invert-[0.6] [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Nombre del Cliente</label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez / Empresa XYZ"
                    value={incomeForm.clientName}
                    onChange={e => setIncomeForm(p => ({ ...p, clientName: e.target.value }))}
                    className="w-full bg-[#0B1120] border border-white/5 focus:border-emerald-500/50 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-white text-sm transition-all placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Descripción / Detalle</label>
                <textarea
                  placeholder="Ej: Pago por servicio de sonido para evento..."
                  rows={2}
                  value={incomeForm.description}
                  onChange={e => setIncomeForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-[#0B1120] border border-white/5 focus:border-emerald-500/50 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-white text-sm transition-all placeholder:text-gray-600 resize-none"
                />
              </div>

              {/* ── DISTRIBUCIÓN POR EVENTO ── */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Distribución por Evento *</label>
                  <button
                    onClick={addDistributionRow}
                    className="text-[9px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> Agregar Evento
                  </button>
                </div>

                <div className="space-y-3">
                  {eventDistributions.map((dist, idx) => (
                    <div key={idx} className="bg-[#0B1120] border border-white/5 rounded-2xl p-4 flex items-center gap-3 group hover:border-emerald-500/20 transition-colors">
                      {/* Selector de Evento */}
                      <div className="flex-1">
                        <select
                          value={dist.eventId}
                          onChange={e => updateDistribution(idx, 'eventId', e.target.value)}
                          className="w-full bg-transparent border-none outline-none text-white text-sm font-bold appearance-none cursor-pointer focus:ring-0 p-0"
                        >
                          <option value="" className="bg-[#0B1120]">Seleccionar evento...</option>
                          {loadingEvents ? (
                            <option disabled className="bg-[#0B1120]">Cargando...</option>
                          ) : (
                            allEvents.map(ev => (
                              <option key={ev.id} value={ev.id} className="bg-[#0B1120]">
                                {ev.name} — {new Date(ev.date).toLocaleDateString()}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Monto aplicado */}
                      <div className="w-40 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/50 text-xs font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={dist.amountApplied}
                          onChange={e => updateDistribution(idx, 'amountApplied', e.target.value)}
                          className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/40 pl-7 pr-3 py-2 rounded-xl outline-none text-emerald-400 text-sm font-black tracking-tighter transition-all placeholder:text-gray-600"
                        />
                      </div>

                      {/* Botón eliminar */}
                      {eventDistributions.length > 1 && (
                        <button
                          onClick={() => removeDistributionRow(idx)}
                          className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Resumen de distribución */}
                {Number(incomeForm.amount) > 0 && (
                  <div className={`flex justify-between items-center px-4 py-3 rounded-xl border text-xs font-bold ${
                    Math.abs(totalDistributed - Number(incomeForm.amount)) < 0.01
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                      : 'bg-orange-500/5 border-orange-500/20 text-orange-400'
                  }`}>
                    <span className="uppercase tracking-widest text-[9px]">Distribuido: ${totalDistributed.toFixed(2)} / ${Number(incomeForm.amount).toFixed(2)}</span>
                    {Math.abs(totalDistributed - Number(incomeForm.amount)) < 0.01 
                      ? <CheckCircle size={14} />
                      : <span className="text-[9px] uppercase tracking-widest">Pendiente: ${(Number(incomeForm.amount) - totalDistributed).toFixed(2)}</span>
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-white/5 bg-white/[0.01] flex justify-end gap-3">
              <button
                onClick={() => { setIsIncomeModalOpen(false); setEditingIncomeId(null); }}
                className="px-6 py-3 text-gray-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateIncome}
                disabled={savingIncome}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-50 text-white rounded-2xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:hover:scale-100"
              >
                {savingIncome ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                ) : (
                  <><DollarSign size={16} /> {editingIncomeId ? 'Actualizar Ingreso' : 'Guardar Ingreso'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
