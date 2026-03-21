'use client';
import { useEffect, useState } from 'react';
import { 
  CreditCard, Save, Search, ArrowLeft, FileText, Trash2 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Supplier, PurchaseBill, PurchaseBillItem } from '@erp/types'; // Importar tipos compartidos
import { apiClient } from '@/lib/api-client';

export default function NewPaymentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false); // To prevent multiple clicks
  
  // Datos
  const [suppliers, setSuppliers] = useState<Supplier[]>([]); // Tipado estricto
  
  const [pendingBills, setPendingBills] = useState<PurchaseBill[]>([]); // Tipado estricto
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null); // Tipado estricto
  const [selectedBill, setSelectedBill] = useState<PurchaseBill | null>(null); // Tipado estricto

  // Formulario
  const [paymentData, setPaymentData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'TRANSFER_VES',
    reference: '',
    bankName: '',
    exchangeRate: 0, 
    notes: '',
    
    // RETENCIONES (Basado en el PDF de TUBRICA)
    retentionIVAPercent: 75, // Default 75%
    retentionISLRAmount: 0,
    receiptRetIVA: '',  // Formato YYYYMM00000000
    receiptRetISLR: '',
    
    // IGTF
    applyIGTF: false,
    
    // Resultado
    amountPaid: 0 
  });

  const [totals, setTotals] = useState({
    retentionIVA: 0,
    igtf: 0,
    netPayable: 0,
    periodoFiscal: '' // Nuevo campo
  });

  const [fetchedRate, setFetchedRate] = useState<number>(0);
  const [canDelete, setCanDelete] = useState(false);

  // 1. Cargar Proveedores, Permisos y Tasa BCV
  useEffect(() => {
    const fetchData = async () => {
      // Cargar Proveedores
      try {
        const response = await apiClient.get<{ items: Supplier[]; pagination: Record<string, unknown> }>('/suppliers');
        setSuppliers(response.items || []);
      } catch (error) { console.error('Error loading suppliers', error); }

      // Cargar Tasa BCV
      try {
        const rateData = await apiClient.get<{ rate: number }>('/exchange-rates/latest');
        if (rateData && rateData.rate) {
           const r = Number(rateData.rate);
           setFetchedRate(r);
           setPaymentData(prev => ({ ...prev, exchangeRate: r }));
        }
      } catch (e) { console.error("Error fetching rate", e); }

      // Verificar Permiso de Eliminar
      try {
        const userData = await apiClient.get<{ permissions?: string[] }>('/users/me');
        if (userData.permissions && Array.isArray(userData.permissions)) {
           if (userData.permissions.includes('bills.delete')) {
              setCanDelete(true);
           }
        }
      } catch (err) {
         console.error(err);
      }
    };
    fetchData();
  }, []);

  // 2. Buscar Facturas Pendientes
  const fetchBills = async (supplierId: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ items: PurchaseBill[]; pagination: Record<string, unknown> }>('/bills');
      const pending = response.items.filter((b) => 
        b.supplierId === supplierId && b.status !== 'PAID'
      );
      setPendingBills(pending);
      setStep(2);
    } catch (error) {
      console.error(error);
      alert('Error cargando facturas');
    } finally {
      setLoading(false);
    }
  };

  // 3. Seleccionar Factura
  // ✅ Q-01: Eliminamos generación de comprobantes, ahora lo hace el backend
  const handleSelectBill = (bill: PurchaseBill) => {
    setSelectedBill(bill);
    
    setPaymentData({
      ...paymentData,
      // Priorizamos la tasa del día (fetchedRate) sobre la de la factura
      exchangeRate: fetchedRate > 0 ? fetchedRate : Number(bill.exchangeRate),
      // ❌ NO generamos receiptRetIVA/ISLR aquí, el backend lo hará automáticamente
      retentionIVAPercent: 75,
      amountPaid: 0 
    });
    setStep(3);
  };

  // 4.1 Eliminar Factura Logic
  const handleDeleteBill = async (e: React.MouseEvent, billId: string, invoiceNumber: string) => {
    e.stopPropagation(); // Evitar seleccionar la factura
    if (!confirm(`¿Estás seguro de eliminar la factura #${invoiceNumber}? Esta acción no se puede deshacer.`)) return;

    setActionLoading(true);
    try {
      await apiClient.delete(`/bills/${billId}`);
      alert('Factura eliminada correctamente');
      // Actualizar lista local
      setPendingBills(prev => prev.filter(b => b.id !== billId));
      // Si la factura seleccionada era esta, limpiar selección
      if (selectedBill?.id === billId) {
          setSelectedBill(null);
          setStep(2);
      }
    } catch (error: unknown) {
      console.error('Error al eliminar:', error);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al eliminar: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. CÁLCULO MATEMÁTICO (Efecto)
  useEffect(() => {
    if (!selectedBill) return;

    // Calcular Periodo Fiscal (YYYY-MM)
    const pDate = new Date(String(paymentData.paymentDate));
    const periodo = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;

    // A. Retención IVA
    // Asegurar que los campos numéricos sean tratados como números
    const taxAmount = Number(selectedBill.taxAmount);
    const retIVA = taxAmount * (paymentData.retentionIVAPercent / 100);

    // B. Neto Preliminar
    let net = Number(selectedBill.totalAmount) - retIVA - Number(paymentData.retentionISLRAmount);

    // C. IGTF (3%)
    let igtf = 0;
    if (paymentData.applyIGTF) {
      igtf = net * 0.03;
      net = net + igtf;
    }

    setTotals({
      retentionIVA: retIVA,
      igtf: igtf,
      netPayable: net,
      periodoFiscal: periodo
    });

    setPaymentData(prev => ({ ...prev, amountPaid: net }));

  }, [selectedBill, paymentData.retentionIVAPercent, paymentData.retentionISLRAmount, paymentData.applyIGTF, paymentData.paymentDate]);

  // 6. Enviar Pago
  const handleSubmit = async () => {
    if (!selectedBill) return;
    if (!confirm(`¿Confirmar pago por $${totals.netPayable.toFixed(2)}?`)) return;
    setLoading(true);

    try {
      const payload = {
        paymentDate: paymentData.paymentDate,
        method: paymentData.method,
        reference: paymentData.reference,
        bankName: paymentData.bankName,
        currencyCode: "USD",
        exchangeRate: paymentData.exchangeRate,
        amountPaid: totals.netPayable,
        notes: paymentData.notes,
        bills: [{
          purchaseBillId: selectedBill.id,
          amountApplied: totals.netPayable,
          retentionData: {
            retentionIVA: totals.retentionIVA,
            rateRetIVA: paymentData.retentionIVAPercent,
            receiptRetIVA: paymentData.receiptRetIVA, // Se guarda el YYYYMM...
            retentionISLR: paymentData.retentionISLRAmount,
            receiptRetISLR: paymentData.receiptRetISLR,
            igtfAmount: totals.igtf
          }
        }]
      };

      await apiClient.post('/payments-out', payload);

      alert("✅ Egreso y Retenciones registradas correctamente.");
      router.push('/dashboard/accounting/bills');

    } catch (error: unknown) { 
      console.error('Error al procesar pago:', JSON.stringify(error));
      const msg = (error && typeof error === 'object' && 'message' in error)
        ? String((error as Record<string, unknown>).message)
        : (error instanceof Error ? error.message : 'Error desconocido');
      alert(`❌ Error al procesar pago: ${msg}`);
    } 
    finally { setLoading(false); }
  };

  // ── Símbolo de moneda según la factura seleccionada ───────────────────────
  const billSymbol = selectedBill?.currencyCode === 'VES' ? 'Bs.'
                   : selectedBill?.currencyCode === 'EUR' ? '€'
                   : '$';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        {step > 1 && (
          <button 
            onClick={() => setStep(step - 1)} 
            className="p-3 bg-[#1A1F2C] text-blue-400 hover:bg-blue-500/20 rounded-2xl border border-white/10 transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <CreditCard className="text-blue-500" /> Registro de Egreso
          </h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Tesorería · Retenciones · IGTF</p>
        </div>
      </div>

      {/* PASO 1: PROVEEDOR */}
      {step === 1 && (
        <div className="bg-[#1A1F2C] p-8 rounded-3xl shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Search size={14} className="text-blue-500"/> Paso 1: Seleccionar Proveedor
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {suppliers.map(sup => (
              <div key={sup.id} onClick={() => { setSelectedSupplier(sup); fetchBills(sup.id); }}
                className="p-6 bg-[#0B1120] border border-white/5 rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/5 cursor-pointer transition-all group active:scale-[0.98]">
                <div className="font-bold text-white group-hover:text-blue-400 transition-colors">{sup.name}</div>
                <div className="text-[10px] text-gray-500 font-mono mt-1 opacity-60">RIF: {sup.rif}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PASO 2: FACTURA */}
      {step === 2 && (
        <div className="bg-[#1A1F2C] p-8 rounded-3xl shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              Paso 2: Facturas Pendientes de <span className="text-blue-400 font-black">{selectedSupplier?.name}</span>
            </h3>
          </div>
          <div className="space-y-4">
            {pendingBills.length === 0 ? (
              <div className="p-12 text-center bg-[#0B1120] rounded-2xl border border-white/5">
                <FileText size={48} className="mx-auto text-gray-800 mb-4" />
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">No hay facturas pendientes para este proveedor</p>
              </div>
            ) : (
              pendingBills.map(bill => (
                <div key={bill.id} onClick={() => handleSelectBill(bill)}
                  className="flex justify-between items-center p-6 bg-[#0B1120] border border-white/5 border-l-4 border-l-blue-500 rounded-2xl hover:bg-blue-500/5 cursor-pointer transition-all active:scale-[0.99] group">
                  <div>
                    <div className="font-black text-white text-lg flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                      Factura #{bill.invoiceNumber}
                      {!bill.purchaseOrderId && (
                        <span className="bg-orange-500/10 text-orange-400 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-orange-500/20">
                          Gasto
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                      Emisión: {new Date(bill.issueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-6">
                    <div>
                       <div className="text-2xl font-black text-white tracking-tighter">{billSymbol}{Number(bill.totalAmount).toFixed(2)}</div>
                      <div className="text-[10px] text-gray-500 font-mono tracking-tight">CONTROL: {bill.controlNumber}</div>
                    </div>
                    {canDelete && (
                      <button 
                          onClick={(e) => handleDeleteBill(e, bill.id, bill.invoiceNumber)}
                          disabled={actionLoading}
                          className="p-3 text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all active:scale-90"
                          title="Eliminar Factura Pendiente"
                      >
                          <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PASO 3: LA CALCULADORA VENEZOLANA */}
      {step === 3 && selectedBill && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LADO IZQUIERDO: DETALLES (8 Columnas) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* A. Resumen Factura (Estilo PDF Tubrica) */}
            <div className="bg-[#1A1F2C] rounded-3xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="bg-white/5 p-6 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2 tracking-tight uppercase">
                    Factura <span className="text-blue-400 font-mono">#{selectedBill.invoiceNumber}</span>
                    {!selectedBill.purchaseOrderId && (
                      <span className="bg-orange-500/10 text-orange-400 text-[9px] px-2 py-0.5 rounded-full font-black uppercase border border-orange-500/20">
                        Gasto
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Control Fiscal: {selectedBill.controlNumber}</p>
                </div>
                <div className="text-right">
                   <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Factura</div>
                   <div className="font-black text-2xl text-white tracking-tighter">{billSymbol}{Number(selectedBill.totalAmount).toFixed(2)}</div>
                </div>
              </div>
              <div className="p-6 grid grid-cols-3 gap-5">
                 <div className="bg-[#0B1120] p-4 rounded-2xl border border-white/5 text-center">
                    <span className="block text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Base Imponible</span>
                     <span className="font-black text-white text-lg tracking-tight">{billSymbol}{Number(selectedBill.taxableAmount).toFixed(2)}</span>
                 </div>
                 <div className="bg-[#0B1120] p-4 rounded-2xl border border-white/5 text-center">
                    <span className="block text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">% Alíc. IVA</span>
                    <span className="font-black text-blue-400 text-lg tracking-tight">{selectedBill.taxableAmount > 0 ? ((selectedBill.taxAmount / selectedBill.taxableAmount) * 100).toFixed(0) : 0}%</span>
                 </div>
                 <div className="bg-[#0B1120] p-4 rounded-2xl border border-white/5 text-center">
                    <span className="block text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Carga IVA</span>
                     <span className="font-black text-white text-lg tracking-tight">{billSymbol}{Number(selectedBill.taxAmount).toFixed(2)}</span>
                 </div>
              </div>

              {/* Item Breakdown Table */}
              <div className="px-6 pb-6 mt-2">
                  <div className="bg-[#0B1120] rounded-2xl border border-white/5 overflow-hidden">
                    <div className="bg-white/5 px-4 py-2 flex items-center justify-between">
                       <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Desglose de Renglones</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] text-left text-gray-400">
                         <thead>
                            <tr className="text-gray-500 bg-white/5 uppercase font-bold border-b border-white/5">
                               <th className="px-4 py-3">Descripción</th>
                               <th className="px-4 py-3 text-right">Base</th>
                               <th className="px-4 py-3 text-center">% IVA</th>
                               <th className="px-4 py-3 text-right">IVA</th>
                               <th className="px-4 py-3 text-center text-red-400">% ISLR</th>
                               <th className="px-4 py-3 text-right text-red-400">ISLR</th>
                               <th className="px-4 py-3 text-right text-blue-400">Total</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-white/5">
                            {selectedBill.items?.map((item: PurchaseBillItem) => {
                               const base = Number(item.totalLine);
                               const taxRate = Number(item.taxRate || 0);
                               const islrRate = Number(item.islrRate || 0);
                               
                               const tax = base * (taxRate / 100);
                               const islr = base * (islrRate / 100);
                               
                               return (
                                  <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                     <td className="px-4 py-3 text-white font-medium max-w-[150px] truncate" title={item.product?.name}>{item.product?.name || 'Item'}</td>
                                      <td className="px-4 py-3 text-right font-mono">{billSymbol}{base.toFixed(2)}</td>
                                     <td className="px-4 py-3 text-center text-gray-500 font-bold">{taxRate}%</td>
                                      <td className="px-4 py-3 text-right font-mono">{billSymbol}{tax.toFixed(2)}</td>
                                     <td className="px-4 py-3 text-center text-red-400/80 font-bold">{islrRate > 0 ? `${islrRate}%` : '-'}</td>
                                      <td className="px-4 py-3 text-right text-red-400 font-mono">{islr > 0 ? `-${billSymbol}${islr.toFixed(2)}` : '-'}</td>
                                      <td className="px-4 py-3 text-right text-blue-400 font-black tracking-tighter text-sm">{billSymbol}{(base + tax).toFixed(2)}</td>
                                  </tr>
                               );
                            })}
                         </tbody>
                      </table>
                    </div>
                  </div>
              </div>
            </div>

            {/* B. Configuración de Retención */}
            <div className="bg-[#1A1F2C] p-8 rounded-3xl shadow-2xl border border-white/10 animate-in fade-in slide-in-from-left-4 duration-500 delay-150">
               <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <FileText size={14} className="text-blue-500"/> Paso 3: Comprobante de Retención
               </h4>
               
               <div className="grid grid-cols-2 gap-8">
                  {/* Nro Comprobante y Fecha */}
                  <div className="space-y-6">
                     <div className="group">
                        <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Nº Comprobante Fiscal</label>
                        <div className="bg-[#0B1120] border-2 border-white/5 rounded-2xl p-3.5 font-mono text-[11px] text-gray-600 flex items-center justify-between">
                          <span>SIN ASIGNAR · AUTO-GENERAR</span>
                          <span className="bg-blue-500/10 text-blue-400 text-[8px] px-2 py-0.5 rounded-full font-black">BACKEND</span>
                        </div>
                        <p className="text-[10px] text-blue-400/60 mt-1.5 font-medium italic">El sistema asignará el correlativo oficial al guardar</p>
                     </div>
                     <div className="group">
                        <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Fecha de Cobro/Pago</label>
                        <input type="date" className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-3.5 text-white text-sm outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                          value={paymentData.paymentDate}
                          onChange={e => setPaymentData({...paymentData, paymentDate: e.target.value})}
                        />
                     </div>
                  </div>

                  {/* Porcentajes */}
                  <div className="space-y-6 bg-[#0B1120] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CreditCard size={64} className="text-blue-500" />
                      </div>
                      <div className="relative z-10 flex justify-between items-center">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alícuota Retención IVA</label>
                        <select className="bg-[#1A1F2C] border border-white/10 rounded-xl px-4 py-2 text-xs text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50"
                          value={paymentData.retentionIVAPercent}
                          onChange={e => setPaymentData({...paymentData, retentionIVAPercent: Number(e.target.value)})}
                        >
                          <option value={75}>75% (General)</option>
                          <option value={100}>100% (Especial)</option>
                          <option value={0}>0%</option>
                        </select>
                      </div>
                      <div className="relative z-10 flex justify-between items-end">
                         <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total Descontado</p>
                             <p className="text-2xl font-black text-red-400 tracking-tighter">-{billSymbol}{totals.retentionIVA.toFixed(2)}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Periodo</p>
                            <p className="text-xs font-mono font-bold text-gray-400 tracking-widest">{totals.periodoFiscal}</p>
                         </div>
                      </div>
                  </div>
               </div>
            </div>

            {/* C. Datos del Pago */}
            <div className="bg-[#1A1F2C] p-8 rounded-3xl shadow-2xl border border-white/10 animate-in fade-in slide-in-from-left-4 duration-500 delay-300">
               <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Forma de Pago del Egreso</h4>
               <div className="grid grid-cols-3 gap-5">
                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Método</label>
                    <select className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-3.5 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-bold"
                        value={paymentData.method} onChange={e => setPaymentData({...paymentData, method: e.target.value})}>
                        <option value="TRANSFER_VES">Transferencia Bs</option>
                        <option value="PAGO_MOVIL">Pago Móvil</option>
                        <option value="CASH_USD">Efectivo USD</option>
                        <option value="ZELLE">Zelle</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Banco</label>
                    <input className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-3.5 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-bold" placeholder="Ej. Banesco / Citi"
                        value={paymentData.bankName} onChange={e => setPaymentData({...paymentData, bankName: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Referencia</label>
                    <input className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-3.5 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-mono font-bold" placeholder="# Operación"
                        value={paymentData.reference} onChange={e => setPaymentData({...paymentData, reference: e.target.value})} />
                 </div>
               </div>
               
               {/* Check IGTF */}
               <div className="mt-8 flex items-center gap-3 bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 group">
                 <div className="relative flex items-center">
                    <input type="checkbox" id="igtf" className="w-5 h-5 appearance-none bg-[#0B1120] border-2 border-white/10 rounded-lg checked:bg-blue-500 transition-all cursor-pointer"
                      checked={paymentData.applyIGTF}
                      onChange={e => setPaymentData({...paymentData, applyIGTF: e.target.checked})} />
                    <CreditCard size={14} className="absolute left-1 text-white pointer-events-none opacity-0 group-has-[:checked]:opacity-100 transition-opacity" />
                 </div>
                 <label htmlFor="igtf" className="text-xs font-bold text-gray-300 cursor-pointer select-none">
                    Aplicar IGTF (3%) <span className="text-gray-500 font-medium ml-2 uppercase tracking-tight text-[10px]">― Solo pagos en divisa efectivo</span>
                 </label>
               </div>
            </div>
          </div>

          {/* LADO DERECHO: TOTALES (4 Columnas) */}
          <div className="lg:col-span-4 translate-y-0 sticky top-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-[#1A1F2C] text-white p-8 rounded-[2rem] shadow-2xl border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
              
              <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Resumen del Egreso</h2>
              
              <div className="space-y-4 mb-8 border-b border-white/5 pb-8 font-bold">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Sub-Total Factura</span>
                   <span className="text-white">{billSymbol}{Number(selectedBill.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-red-400/80 uppercase tracking-tighter text-[10px]">(-) Retención I.V.A ({paymentData.retentionIVAPercent}%)</span>
                   <span className="text-red-400 font-black">-{billSymbol}{totals.retentionIVA.toFixed(2)}</span>
                </div>
                {paymentData.retentionISLRAmount > 0 && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-red-400/80 uppercase tracking-tighter text-[10px]">(-) Retención I.S.L.R</span>
                     <span className="text-red-400 font-black">-{billSymbol}{paymentData.retentionISLRAmount}</span>
                  </div>
                )}
                {totals.igtf > 0 && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-emerald-400/80 uppercase tracking-tighter text-[10px]">(+) Cargo IGTF (3%)</span>
                     <span className="text-emerald-400 font-black">+{billSymbol}{totals.igtf.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="mb-8">
                <span className="block text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Pagable Neto Final</span>
                <span className="text-5xl font-black tracking-tighter text-white block">
                  <span className="text-blue-500 text-3xl mr-1">{selectedBill?.currencyCode === 'USD' ? '$' : 'Bs.'}</span>
                  {totals.netPayable.toLocaleString(selectedBill?.currencyCode === 'USD' ? 'en-US' : 'es-VE', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Conversión Dinámica */}
              <div className="bg-[#0B1120] rounded-2xl p-5 border border-white/5 space-y-4 shadow-inner mb-8">
                 <div className="space-y-1">
                   <label className="text-[9px] text-blue-400 font-black uppercase tracking-widest block text-center">
                      Equivalente {selectedBill?.currencyCode === 'USD' ? 'Bolívares Digitales' : 'Dólares Americanos'}
                   </label>
                   <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-black text-white/50">{selectedBill?.currencyCode === 'USD' ? 'Bs.' : '$'}</span>
                      <span className="text-3xl font-black text-white tracking-tighter">
                          {
                            selectedBill?.currencyCode === 'USD' 
                              ? (totals.netPayable * (paymentData.exchangeRate || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : (totals.netPayable / (paymentData.exchangeRate || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          }
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

              <button onClick={handleSubmit} disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/20 transition-all uppercase tracking-widest text-xs active:scale-95">
                {loading ? 'Procesando...' : <><Save size={20} /> Registrar Egreso</>}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}