'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ArrowLeft, Receipt, Landmark } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface ExpenseCategory {
  id: string;
  name: string;
}

interface Department {
  id: string;
  code: string;
  name: string;
}

interface ExpenseItem {
  expenseCategoryId: string;
  departmentId: string;
  description: string;
  amount: number;
}

export default function DirectPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [usdRate, setUsdRate] = useState<number>(1);
  const [eurRate, setEurRate] = useState<number>(1);

  const [paymentData, setPaymentData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'TRANSFER_VES',
    bankName: '',
    reference: '',
    exchangeRate: 1,
    currencyCode: 'USD', // Base currency for amounts
    notes: ''
  });

  const [items, setItems] = useState<ExpenseItem[]>([
    { expenseCategoryId: '', departmentId: '', description: '', amount: 0 }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, dptRes, rateData] = await Promise.all([
          apiClient.get<ExpenseCategory[]>('/expense-categories'),
          apiClient.get<Department[]>('/departments'),
          apiClient.get<{ usd?: { rate: number }; eur?: { rate: number } }>('/exchange-rates/latest-all').catch(() => null)
        ]);

        setCategories(Array.isArray(catRes) ? catRes : []);
        setDepartments(Array.isArray(dptRes) ? dptRes : []);

        if (rateData) {
          const uRate = rateData.usd?.rate ? Number(rateData.usd.rate) : 1;
          const eRate = rateData.eur?.rate ? Number(rateData.eur.rate) : 1;
          setUsdRate(uRate);
          setEurRate(eRate);
          setPaymentData(prev => ({ ...prev, exchangeRate: prev.currencyCode === 'EUR' ? eRate : prev.currencyCode === 'VES' ? 1 : uRate }));
        }
      } catch (err) {
        console.error('Error cargando catálogos', err);
      }
    };
    fetchData();
  }, []);

  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const updateLine = (index: number, field: keyof ExpenseItem, value: string | number) => {
    const newItems = [...items];
    const item = newItems[index];
    if (item) {
      if (field === 'amount') {
        item.amount = Number(value);
      } else {
        item[field] = String(value);
      }
      setItems(newItems);
    }
  };

  const addLine = () => {
    setItems([...items, { expenseCategoryId: '', departmentId: '', description: '', amount: 0 }]);
  };

  const removeLine = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!paymentData.method) return alert('Seleccione un método de pago');
    if (!paymentData.bankName) return alert('Ingrese el banco');
    if (totalAmount <= 0) return alert('El monto total debe ser mayor a 0');
    
    // Validar líneas
    for (let i = 0; i < items.length; i++) {
       const item = items[i];
       if (!item) continue;
       if (!item.expenseCategoryId) return alert(`Seleccione la categoría presupuestaria en la línea ${i + 1}`);
       if (!item.description) return alert(`Ingrese una descripción en la línea ${i + 1}`);
       if (item.amount <= 0) return alert(`El monto debe ser mayor a 0 en la línea ${i + 1}`);
    }

    if (!confirm(`¿Confirmar registro de gasto por $${totalAmount.toFixed(2)}?`)) return;

    setLoading(true);
    try {
      const payload = {
        paymentDate: paymentData.paymentDate,
        method: paymentData.method,
        reference: paymentData.reference,
        bankName: paymentData.bankName,
        currencyCode: paymentData.currencyCode,
        exchangeRate: paymentData.exchangeRate,
        amountPaid: totalAmount, // Se calcula internamente, pero lo mandamos
        notes: paymentData.notes,
        
        isDirectExpense: true,
        expenseItems: items.filter(i => i !== undefined).map(i => ({
          expenseCategoryId: i!.expenseCategoryId,
          departmentId: i!.departmentId || undefined,
          description: i!.description,
          amount: Number(i!.amount),
        }))
      };

      await apiClient.post('/payments-out', payload);
      alert('✅ Gasto Simplificado / Egreso registrado exitosamente.');
      router.push('/dashboard/accounting/payments'); // Redirigir al historial
    } catch (error: Error | any) {
      console.error(error);
      const msg = error.message || 'Error desconocido';
      alert(`❌ Error al registrar gasto: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/dashboard/accounting/payments')} 
          className="p-3 bg-[#1A1F2C] text-blue-400 hover:bg-blue-500/20 rounded-2xl border border-white/10 transition-all active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Receipt className="text-blue-500" /> Registrar Gasto Simplificado (Sin Factura)
          </h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
            Operaciones directas desde Banco · Comisiones · Adelantos · Caja Chica
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LADO IZQUIERDO: DETALLES DEL PAGO Y LÍNEAS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* A. Datos del Movimiento Bancario */}
          <div className="bg-[#1A1F2C] p-8 rounded-3xl shadow-2xl border border-white/10">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Landmark size={14} className="text-blue-500"/> Paso 1: Datos de Emisión del Pago
            </h3>
            
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Fecha Pago</label>
                <input type="date" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                  value={paymentData.paymentDate} onChange={e => setPaymentData({...paymentData, paymentDate: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Moneda</label>
                <select className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                    value={paymentData.currencyCode} onChange={e => {
                      const newCurrency = e.target.value;
                      const newRate = newCurrency === 'EUR' ? eurRate : newCurrency === 'VES' ? 1 : usdRate;
                      setPaymentData({...paymentData, currencyCode: newCurrency, exchangeRate: newRate});
                    }}>
                    <option value="USD">Dólares (USD)</option>
                    <option value="EUR">Euros (EUR)</option>
                    <option value="VES">Bolívares (VES)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Método</label>
                <select className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                    value={paymentData.method} onChange={e => setPaymentData({...paymentData, method: e.target.value})}>
                    <option value="TRANSFER_VES">Transferencia Bs</option>
                    <option value="PAGO_MOVIL">Pago Móvil</option>
                    <option value="CASH_USD">Efectivo USD</option>
                    <option value="ZELLE">Zelle</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Banco / Origen</label>
                <input type="text" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                  placeholder="Banesco / Caja"
                  value={paymentData.bankName} onChange={e => setPaymentData({...paymentData, bankName: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Referencia</label>
                <input type="text" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                  placeholder="# Op"
                  value={paymentData.reference} onChange={e => setPaymentData({...paymentData, reference: e.target.value})} />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Concepto General / Observaciones (Opcional)</label>
              <textarea 
                rows={2}
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                placeholder="Motivo del pago a registrar en el historial..."
                value={paymentData.notes} onChange={e => setPaymentData({...paymentData, notes: e.target.value})}
              ></textarea>
            </div>
          </div>

          {/* B. Líneas de Gasto */}
          <div className="bg-[#1A1F2C] rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
             <div className="bg-white/5 border-b border-white/5 p-6 flex justify-between items-center">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Receipt size={14} className="text-blue-500"/> Paso 2: Distribución de Cuentas (Líneas de Egreso)
                </h3>
             </div>
             
             <div className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[800px]">
                  <thead className="bg-[#0B1120] text-[10px] uppercase text-gray-500 font-black tracking-widest border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 w-[20%]">Presupuesto (Cat)</th>
                      <th className="px-4 py-3 w-[20%]">Centro de Costo</th>
                      <th className="px-4 py-3 w-[35%]">Explicación del Gasto</th>
                      <th className="px-4 py-3 w-[15%] text-right">Monto {paymentData.currencyCode}</th>
                      <th className="px-4 py-3 w-[10%] text-center">X</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <select className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white" value={item.expenseCategoryId} onChange={e => updateLine(idx, 'expenseCategoryId', e.target.value)}>
                            <option value="">-- Seleccionar --</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white" value={item.departmentId} onChange={e => updateLine(idx, 'departmentId', e.target.value)}>
                            <option value="">-- C.C. Opcional --</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input type="text" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-600"
                            placeholder="Ej. Comisión Banesco"
                            value={item.description} onChange={e => updateLine(idx, 'description', e.target.value)} />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" step="0.01" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-blue-400 text-right font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="0.00"
                            value={item.amount || ''} onChange={e => updateLine(idx, 'amount', e.target.value)} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => removeLine(idx)} disabled={items.length === 1} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg disabled:opacity-20 transition-all">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             
             <div className="p-4 border-t border-white/5 bg-white/5 flex justify-end">
                <button onClick={addLine} className="text-xs font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 flex items-center gap-2 group transition-colors">
                  <span className="bg-blue-500/10 group-hover:bg-blue-500/20 p-1.5 rounded-lg transition-colors"><Plus size={14} /></span> Añadir Línea Contable
                </button>
             </div>
          </div>
        </div>

        {/* LADO DERECHO: TOTALES Y ACCIONES */}
        <div className="lg:col-span-4 sticky top-6">
          <div className="bg-[#1A1F2C] text-white p-8 rounded-[2rem] shadow-2xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Totalización del Egreso</h2>
            
            <div className="space-y-4 mb-8">
               <span className="block text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Impacto Banco ({paymentData.currencyCode})</span>
               <span className="text-4xl font-black tracking-tighter text-white block">
                 <span className="text-blue-500 text-2xl mr-1">{paymentData.currencyCode === 'USD' ? '$' : paymentData.currencyCode === 'EUR' ? '€' : 'Bs.'}</span>
                 {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </span>
            </div>

            {/* Conversión Dinámica */}
            {paymentData.currencyCode !== 'VES' ? (
              <div className="bg-[#0B1120] rounded-2xl p-5 border border-white/5 space-y-4 shadow-inner mb-8">
                 <div className="space-y-1">
                   <label className="text-[9px] text-blue-400 font-black uppercase tracking-widest block text-center">
                      Equivalente Referencial Bs.
                   </label>
                   <div className="flex items-center justify-center gap-2">
                      <span className="text-xl font-black text-white/50">Bs.</span>
                      <span className="text-2xl font-black text-white tracking-tighter">
                          {(totalAmount * (paymentData.exchangeRate || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                   </div>
                 </div>
                 
                 <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Tasa Referencia</span>
                    <div className="flex items-center gap-2">
                       <input type="number" step="0.01" className="bg-[#1A1F2C] text-emerald-400 font-black font-mono text-center outline-none w-24 py-1.5 rounded-lg border border-white/5 focus:border-emerald-500/50 transition-all"
                        value={paymentData.exchangeRate}
                        placeholder="0.00"
                        onChange={e => setPaymentData({...paymentData, exchangeRate: Number(e.target.value)})}
                      />
                    </div>
                 </div>
              </div>
            ) : (
              <div className="bg-[#0B1120] rounded-2xl p-5 border border-white/5 space-y-4 shadow-inner mb-8">
                 <div className="space-y-1">
                   <label className="text-[9px] text-emerald-400 font-black uppercase tracking-widest block text-center">
                      Equivalente Referencial USD.
                   </label>
                   <div className="flex items-center justify-center gap-2">
                      <span className="text-xl font-black text-white/50">$</span>
                      <span className="text-2xl font-black text-white tracking-tighter">
                          {(totalAmount / (paymentData.exchangeRate || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                   </div>
                 </div>
                 
                 <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Tasa Referencia</span>
                    <div className="flex items-center gap-2">
                       <input type="number" step="0.01" className="bg-[#1A1F2C] text-emerald-400 font-black font-mono text-center outline-none w-24 py-1.5 rounded-lg border border-white/5 focus:border-emerald-500/50 transition-all"
                        value={paymentData.exchangeRate}
                        placeholder="0.00"
                        onChange={e => setPaymentData({...paymentData, exchangeRate: Number(e.target.value)})}
                      />
                    </div>
                 </div>
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading || totalAmount <= 0}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/20 transition-all uppercase tracking-widest text-xs active:scale-95 disabled:hover:bg-blue-600 disabled:cursor-not-allowed">
              {loading ? 'Procesando...' : <><Save size={20} /> Guardar Egreso</>}
            </button>
            <p className="text-center text-[9px] font-bold text-blue-400/50 mt-4 uppercase tracking-widest">
              No generará cálculo de retenciones
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
