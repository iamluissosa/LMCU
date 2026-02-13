'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  CreditCard, DollarSign, Save, Search, Calculator, ArrowLeft, FileText, Calendar, Trash2 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function NewPaymentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false); // To prevent multiple clicks
  
  // Datos
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedBill, setSelectedBill] = useState<any>(null);

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Cargar Proveedores
      const res = await fetch('http://localhost:3001/suppliers', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) setSuppliers(await res.json());

      // Cargar Tasa BCV
      try {
        const resRate = await fetch('http://localhost:3001/exchange-rates/latest');
        if (resRate.ok) {
            const text = await resRate.text();
            if (text) {
                const data = JSON.parse(text);
                if (data && data.rate) {
                    const r = Number(data.rate);
                    setFetchedRate(r);
                    setPaymentData(prev => ({ ...prev, exchangeRate: r }));
                }
            }
        }
      } catch (e) { console.error("Error fetching rate", e); }

      // Verificar Permiso de Eliminar
      // Usamos el endpoint /users/me que ya trae los permisos calculados por el backend
      try {
        const resMe = await fetch('http://localhost:3001/users/me', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (resMe.ok) {
           const userData = await resMe.json();
           if (userData.permissions && Array.isArray(userData.permissions)) {
              if (userData.permissions.includes('bills.delete')) {
                 setCanDelete(true);
              }
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
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('http://localhost:3001/bills', {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    if (res.ok) {
      const allBills = await res.json();
      const filtered = allBills.filter((b: any) => 
        b.supplierId === supplierId && b.status !== 'PAID'
      );
      setPendingBills(filtered);
      setStep(2);
    }
    setLoading(false);
  };

  // 3. Generador de Comprobante (YYYYMM + Random/Secuencia)
  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    // En un sistema real, esto vendría del "nextPaymentOutNumber" de CompanySettings
    // Aquí simulamos el formato del PDF: 202511 + 8 dígitos
    const sequence = Math.floor(Math.random() * 100000000).toString().padStart(8, '0'); 
    return `${year}${month}${sequence}`;
  }

  // 4. Seleccionar Factura
  const handleSelectBill = (bill: any) => {
    setSelectedBill(bill);
    const generatedReceipt = generateReceiptNumber();
    
    setPaymentData({
      ...paymentData,
      // Priorizamos la tasa del día (fetchedRate) sobre la de la factura
      exchangeRate: fetchedRate > 0 ? fetchedRate : Number(bill.exchangeRate),
      receiptRetIVA: generatedReceipt, // Pre-llenamos formato oficial
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
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(`http://localhost:3001/bills/${billId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });

      if (res.ok) {
        alert('Factura eliminada correctamente');
        // Actualizar lista local
        setPendingBills(prev => prev.filter(b => b.id !== billId));
        // Si la factura seleccionada era esta, limpiar selección
        if (selectedBill?.id === billId) {
            setSelectedBill(null);
            setStep(2);
        }
      } else {
        const err = await res.json();
        alert(`Error al eliminar: ${err.message || 'Desconocido'}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión al eliminar');
    } finally {
      setActionLoading(false);
    }
  };



  // 5. CÁLCULO MATEMÁTICO (Efecto)
  useEffect(() => {
    if (!selectedBill) return;

    // Calcular Periodo Fiscal (YYYY-MM)
    const pDate = new Date(paymentData.paymentDate);
    const periodo = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;

    // A. Retención IVA
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
    if (!confirm(`¿Confirmar pago por $${totals.netPayable.toFixed(2)}?`)) return;
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    try {
      const payload = {
        companyId: selectedBill.companyId,
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

      const res = await fetch('http://localhost:3001/payments-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("✅ Egreso y Retenciones registradas correctamente.");
        router.push('/dashboard/accounting/bills');
      } else {
        alert("❌ Error al procesar pago");
      }
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        {step > 1 && <button onClick={() => setStep(step - 1)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft /></button>}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CreditCard className="text-blue-600" /> Registro de Egreso
          </h1>
          <p className="text-gray-500 text-sm">Tesorería • Retenciones • IGTF</p>
        </div>
      </div>

      {/* PASO 1: PROVEEDOR */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Search size={18}/> Seleccionar Proveedor</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suppliers.map(sup => (
              <div key={sup.id} onClick={() => { setSelectedSupplier(sup); fetchBills(sup.id); }}
                className="p-4 border rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all">
                <div className="font-bold text-gray-800">{sup.name}</div>
                <div className="text-xs text-gray-500 font-mono mt-1">{sup.rif}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PASO 2: FACTURA */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-4">Facturas Pendientes: {selectedSupplier?.name}</h3>
          <div className="space-y-3">
            {pendingBills.map(bill => (
              <div key={bill.id} onClick={() => handleSelectBill(bill)}
                className="flex justify-between items-center p-4 border rounded-lg hover:bg-blue-50 cursor-pointer border-l-4 border-l-blue-500">
                <div>
                  <div className="font-bold text-gray-800">Factura #{bill.invoiceNumber}</div>
                  <div className="text-sm text-gray-500">Emisión: {new Date(bill.issueDate).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">${Number(bill.totalAmount).toFixed(2)}</div>
                  <div className="text-xs text-gray-400">Control: {bill.controlNumber}</div>
                  {canDelete && (
                    <button 
                        onClick={(e) => handleDeleteBill(e, bill.id, bill.invoiceNumber)}
                        disabled={actionLoading}
                        className="mt-2 text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                        title="Eliminar Factura Pendiente"
                    >
                        <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PASO 3: LA CALCULADORA VENEZOLANA */}
      {step === 3 && selectedBill && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LADO IZQUIERDO: DETALLES (8 Columnas) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* A. Resumen Factura (Estilo PDF Tubrica) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between">
                <div>
                  <h3 className="font-bold text-gray-800">Factura N° {selectedBill.invoiceNumber}</h3>
                  <p className="text-xs text-gray-500">Control: {selectedBill.controlNumber}</p>
                </div>
                <div className="text-right">
                   <div className="text-xs text-gray-500">Total Factura</div>
                   <div className="font-bold text-lg">${Number(selectedBill.totalAmount).toFixed(2)}</div>
                </div>
              </div>
              <div className="p-4 grid grid-cols-3 gap-4 text-sm text-center">
                 <div className="bg-blue-50 p-2 rounded">
                    <span className="block text-xs text-blue-600 font-bold uppercase">Base Imponible</span>
                    <span className="font-medium">${Number(selectedBill.taxableAmount).toFixed(2)}</span>
                 </div>
                 <div className="bg-blue-50 p-2 rounded">
                    <span className="block text-xs text-blue-600 font-bold uppercase">% Alíc. (General)</span>
                    <span className="font-medium">{Number(selectedBill.taxRate)}%</span>
                 </div>
                 <div className="bg-blue-50 p-2 rounded">
                    <span className="block text-xs text-blue-600 font-bold uppercase">Impuesto I.V.A</span>
                    <span className="font-medium">${Number(selectedBill.taxAmount).toFixed(2)}</span>
                 </div>
              </div>

              {/* Item Breakdown Table */}
              <div className="px-4 pb-4">
                 <div className="mt-2 border-t pt-2">
                    <button onClick={() => {}} className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                       VER DETALLE DE ITEMS
                    </button>
                    <table className="w-full text-xs text-left">
                       <thead>
                          <tr className="text-gray-500 border-b">
                             <th className="py-1">Producto</th>
                             <th className="py-1 text-right">Base</th>
                             <th className="py-1 text-center">% IVA</th>
                             <th className="py-1 text-right">Monto IVA</th>
                             <th className="py-1 text-center">% ISLR</th>
                             <th className="py-1 text-right">Ret. ISLR</th>
                             <th className="py-1 text-right">Total</th>
                          </tr>
                       </thead>
                       <tbody>
                          {selectedBill.items?.map((item:any) => {
                             const base = Number(item.totalLine);
                             const taxRate = Number(item.taxRate || 0);
                             const islrRate = Number(item.islrRate || 0);
                             
                             const tax = base * (taxRate / 100);
                             const islr = base * (islrRate / 100);
                             
                             return (
                                <tr key={item.id} className="border-b last:border-0 border-gray-100">
                                   <td className="py-2 max-w-[150px] truncate" title={item.product?.name}>{item.product?.name || 'Item'}</td>
                                   <td className="py-2 text-right">${base.toFixed(2)}</td>
                                   <td className="py-2 text-center">{taxRate}%</td>
                                   <td className="py-2 text-right">${tax.toFixed(2)}</td>
                                   <td className="py-2 text-center text-red-500">{islrRate > 0 ? `${islrRate}%` : '-'}</td>
                                   <td className="py-2 text-right text-red-500">{islr > 0 ? `-$${islr.toFixed(2)}` : '-'}</td>
                                   <td className="py-2 text-right">${(base + tax).toFixed(2)}</td>
                                </tr>
                             );
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>

            {/* B. Configuración de Retención */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
               <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                 <FileText size={18} className="text-blue-500"/> Comprobante de Retención
               </h4>
               
               <div className="grid grid-cols-2 gap-6">
                  {/* Nro Comprobante y Fecha */}
                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">N° Comprobante (YYYYMM...)</label>
                        <input type="text" className="w-full border-2 border-blue-100 rounded-lg p-2 font-mono text-blue-700 font-bold tracking-wide"
                          value={paymentData.receiptRetIVA}
                          onChange={e => setPaymentData({...paymentData, receiptRetIVA: e.target.value})}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Sugerido automáticamenete</p>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Fecha de Emisión</label>
                        <input type="date" className="w-full border rounded-lg p-2"
                          value={paymentData.paymentDate}
                          onChange={e => setPaymentData({...paymentData, paymentDate: e.target.value})}
                        />
                     </div>
                  </div>

                  {/* Porcentajes */}
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-700">% Retención IVA</label>
                        <select className="border rounded px-2 py-1 text-sm bg-white"
                          value={paymentData.retentionIVAPercent}
                          onChange={e => setPaymentData({...paymentData, retentionIVAPercent: Number(e.target.value)})}
                        >
                          <option value={75}>75% (General)</option>
                          <option value={100}>100% (Especial)</option>
                          <option value={0}>0%</option>
                        </select>
                      </div>
                      <div className="flex justify-between items-center text-red-600 font-bold">
                         <span>Monto Retenido:</span>
                         <span>- ${totals.retentionIVA.toFixed(2)}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 text-right">
                         Periodo Fiscal: {totals.periodoFiscal}
                      </div>
                  </div>
               </div>
            </div>

            {/* C. Datos del Pago */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
               <h4 className="font-bold text-gray-700 mb-4">Forma de Pago</h4>
               <div className="grid grid-cols-3 gap-4">
                 <select className="col-span-1 border rounded p-2"
                    value={paymentData.method} onChange={e => setPaymentData({...paymentData, method: e.target.value})}>
                    <option value="TRANSFER_VES">Transferencia Bs</option>
                    <option value="PAGO_MOVIL">Pago Móvil</option>
                    <option value="CASH_USD">Efectivo USD</option>
                    <option value="ZELLE">Zelle</option>
                 </select>
                 <input className="col-span-1 border rounded p-2" placeholder="Banco Origen"
                    value={paymentData.bankName} onChange={e => setPaymentData({...paymentData, bankName: e.target.value})} />
                 <input className="col-span-1 border rounded p-2" placeholder="Referencia / # Zelle"
                    value={paymentData.reference} onChange={e => setPaymentData({...paymentData, reference: e.target.value})} />
               </div>
               
               {/* Check IGTF */}
               <div className="mt-4 flex items-center gap-2">
                 <input type="checkbox" id="igtf" className="w-4 h-4"
                   checked={paymentData.applyIGTF}
                   onChange={e => setPaymentData({...paymentData, applyIGTF: e.target.checked})} />
                 <label htmlFor="igtf" className="text-sm text-gray-700">Aplica IGTF (3%) - <span className="text-gray-400">Solo pagos en divisa efectivo</span></label>
               </div>
            </div>
          </div>

          {/* LADO DERECHO: TOTALES (4 Columnas) */}
          <div className="lg:col-span-4">
            <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg sticky top-6">
              <h2 className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-4">Resumen de Pago</h2>
              
              <div className="space-y-3 mb-6 border-b border-gray-700 pb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Factura</span>
                  <span>${Number(selectedBill.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-red-400">
                  <span>Retención IVA ({paymentData.retentionIVAPercent}%)</span>
                  <span>- ${totals.retentionIVA.toFixed(2)}</span>
                </div>
                {paymentData.retentionISLRAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-400">
                    <span>Retención ISLR</span>
                    <span>- ${paymentData.retentionISLRAmount}</span>
                  </div>
                )}
                {totals.igtf > 0 && (
                  <div className="flex justify-between text-sm text-yellow-400">
                    <span>IGTF (3%)</span>
                    <span>+ ${totals.igtf.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="mb-2">
                <span className="block text-xs text-gray-500 uppercase">Neto a Pagar</span>
                <span className="text-4xl font-bold tracking-tight">Bs. {totals.netPayable.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Conversión Bs */}
              {/* Conversión Bs -> USD (Solicitado por Usuario) */}
              <div className="bg-gray-800 rounded-lg p-3 mb-6">
                 <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Dolares a pagar (BCV)</label>
                 <div className="flex items-center gap-2">
                    <DollarSign size={18} className="text-green-500"/>
                    {/* Cálculo: Neto / Tasa */}
                    <span className="text-2xl font-mono font-bold text-white">
                        {(totals.netPayable / (paymentData.exchangeRate || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                 </div>
                 <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-700">
                    <span className="text-xs text-gray-400">Tasa de Cambio:</span>
                    <input type="number" className="bg-transparent text-yellow-400 font-mono font-bold text-right outline-none w-24 border-b border-gray-600 focus:border-yellow-400"
                      value={paymentData.exchangeRate}
                      placeholder="0.00"
                      onChange={e => setPaymentData({...paymentData, exchangeRate: Number(e.target.value)})}
                    />
                 </div>
              </div>

              <button onClick={handleSubmit} disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50 transition-all">
                {loading ? 'Procesando...' : <><Save size={18} /> Registrar Egreso</>}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}