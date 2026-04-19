'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Users, DollarSign, Wallet, RefreshCw, HandCoins, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Salesperson {
  id: string;
  name: string;
  email: string;
}

interface CommissionSummary {
  earned: number;
  clawback: number;
  payment: number;
  netTotal: number;
}

interface SalespersonWithSummary extends Salesperson {
  summary?: CommissionSummary;
  loading?: boolean;
}

const fmt = (n: number, cur = 'USD') =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: cur }).format(n);

export default function CommissionsBoardPage() {
  const [salespersons, setSalespersons] = useState<SalespersonWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalData, setPaymentModalData] = useState<SalespersonWithSummary | null>(null);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const sps = await apiClient.get<Salesperson[]>('/users/salespersons');
      
      const enriched = await Promise.all(sps.map(async (sp) => {
        try {
          const summary = await apiClient.get<CommissionSummary>(`/commissions/summary/${sp.id}`);
          return { ...sp, summary };
        } catch {
          return { ...sp, summary: { earned: 0, clawback: 0, payment: 0, netTotal: 0 } };
        }
      }));
      setSalespersons(enriched);
    } catch (e: unknown) {
      toast.error('Error cargando la lista de vendedores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <HandCoins className="text-yellow-400" /> Tablero de Comisiones
          </h1>
          <p className="text-sm text-gray-400 mt-1 uppercase tracking-tight font-medium">Estado de cuenta de comisiones de vendedores</p>
        </div>
        <button onClick={fetchBoard} className="p-2.5 text-gray-500 hover:bg-white/5 hover:text-white rounded-xl transition-colors border border-transparent hover:border-white/10">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           <div className="col-span-3 text-center text-gray-400 py-10">Cargando métricas...</div>
        ) : salespersons.length === 0 ? (
           <div className="col-span-3 text-center text-gray-400 py-10">No hay usuarios marcados como vendedores.</div>
        ) : salespersons.map(sp => (
          <div key={sp.id} className="bg-[#1A1F2C] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
               <DollarSign size={80} />
            </div>
            
            <h3 className="font-bold text-lg text-white">{sp.name}</h3>
            <p className="text-xs text-gray-500 mb-6">{sp.email}</p>

            <div className="space-y-3 mb-6">
               <div className="flex justify-between items-center bg-green-500/5 p-2 rounded-lg border border-green-500/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-green-400 flex items-center gap-1"><Users size={12}/> Generado (Gross)</span>
                  <span className="font-mono text-green-400">{fmt(sp.summary?.earned || 0)}</span>
               </div>
               <div className="flex justify-between items-center bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1"><AlertCircle size={12}/> Reversos (Clawback)</span>
                  <span className="font-mono text-red-400">{fmt(sp.summary?.clawback || 0)}</span>
               </div>
               <div className="flex justify-between items-center bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1"><Wallet size={12}/> Pagado (Egresos)</span>
                  <span className="font-mono text-blue-400">{fmt(sp.summary?.payment || 0)}</span>
               </div>
            </div>

            <div className="border-t border-white/10 pt-4 flex justify-between items-center">
               <div>
                 <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Monto a Liquidar</p>
                 <p className="text-2xl font-black text-white">{fmt(sp.summary?.netTotal || 0)}</p>
               </div>
               {(sp.summary?.netTotal ?? 0) > 0 && (
                 <button 
                  onClick={() => setPaymentModalData(sp)}
                  className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-yellow-500/5">
                   Liquidar
                 </button>
               )}
            </div>
          </div>
        ))}
      </div>

      {paymentModalData && (
        <PaymentModal 
          user={paymentModalData} 
          onClose={() => setPaymentModalData(null)} 
          onSuccess={() => { setPaymentModalData(null); fetchBoard(); }} 
        />
      )}
    </div>
  );
}

function PaymentModal({ user, onClose, onSuccess }: { user: SalespersonWithSummary, onClose: () => void, onSuccess: () => void }) {
  const [form, setForm] = useState({
    amount: user.summary?.netTotal || 0,
    method: 'TRANSFER_USD',
    currencyCode: 'USD',
    exchangeRate: 1,
    bankName: '',
    reference: '',
    notes: `Liquidación de comisiones - ${user.name}`
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/commissions/pay', { ...form, salespersonId: user.id });
      toast.success('Pago de comisiones registrado exitosamente.');
      onSuccess();
    } catch (e: unknown) {
      toast.error('Error al registrar pago de comisiones.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
       <form onSubmit={handleSubmit} className="bg-[#1A1F2C] rounded-2xl shadow-2xl w-full max-w-md border border-white/10 p-6 space-y-6">
         <div className="flex justify-between items-center border-b border-white/10 pb-4">
           <h2 className="text-lg font-bold text-white">Liquidar Comisión</h2>
           <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
         </div>

         <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">A pagar a: {user.name}</p>
            <p className="text-3xl font-black text-yellow-400 mt-1">{fmt(form.amount, form.currencyCode)}</p>
         </div>

         <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Monto a Pagar</label>
              <input type="number" step="0.01" max={user.summary?.netTotal} required className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" 
               value={form.amount} onChange={e => setForm({...form, amount: Number(e.target.value)})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Método</label>
                <select className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                  value={form.method} onChange={e => setForm({...form, method: e.target.value})}>
                  <option value="CASH_USD">Efectivo USD</option>
                  <option value="CASH_VES">Efectivo VES</option>
                  <option value="TRANSFER_USD">Transferencia USD</option>
                  <option value="TRANSFER_VES">Transferencia VES</option>
                  <option value="ZELLE">Zelle</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Banco (Opcional)</label>
                <input className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" 
                 value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} />
              </div>
            </div>
            <div>
               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Referencia</label>
               <input className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" 
                value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} />
            </div>
            <div>
               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nota</label>
               <input className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" 
                value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
         </div>

         <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
           <button type="button" onClick={onClose} className="px-5 py-2 text-gray-400 hover:text-white transition-colors">Cancelar</button>
           <button type="submit" disabled={saving || form.amount <= 0} className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all">
             {saving ? 'Registrando...' : 'Confirmar Pago'}
           </button>
         </div>
       </form>
    </div>
  );
}
