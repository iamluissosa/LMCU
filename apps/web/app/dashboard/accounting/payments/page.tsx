'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { 
  CreditCard, Search, 
  Plus, FileText, CheckCircle, Calendar
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface CompanyBase { name: string; rif: string; address: string; }
interface SupplierBase { name: string; rif: string; address?: string; }
interface PurchaseBillBase { invoiceNumber: string; purchaseOrderId?: string | null; supplier: SupplierBase; retentionIVA: string | number; receiptRetIVA?: string; exchangeRate: string | number; totalAmount: string | number; taxableAmount: string | number; taxAmount: string | number; issueDate: string; controlNumber?: string; taxRate: string | number; }
interface PaymentDetail { id: string; amountApplied: string | number; purchaseBill: PurchaseBillBase; }
interface PaymentOut { id: string; paymentNumber: string; paymentDate: string; method: string; bankName?: string; reference?: string; notes?: string; amountPaid: string | number; exchangeRate: string | number; details: PaymentDetail[]; company?: CompanyBase; }

export default function PaymentsOutPage() {
  const [payments, setPayments] = useState<PaymentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');





  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await apiClient.get<{ items: PaymentOut[]; pagination: Record<string, unknown> }>('/payments-out');
        if (response && response.items) {
          setPayments(response.items);
        }
      } catch (error: unknown) {
        console.error('Error fetching payments (full):', error);
        toast.error(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  // Filtrado simple
  const filtered = payments.filter(p => 
    p.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estados para Modal y Detalle
  const [selectedPayment, setSelectedPayment] = useState<PaymentOut | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Función para abrir el modal
  const handleOpenDetail = (payment: PaymentOut) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  // Función para imprimir
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <CreditCard className="text-blue-500" /> Historial de Pagos
          </h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-tight font-medium">Egresos · Salidas de Caja y Banco</p>
        </div>
        <Link 
          href="/dashboard/accounting/payments/new" 
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Registrar Nuevo Pago
        </Link>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-[#1A1F2C] p-4 rounded-xl shadow-2xl border border-white/10 flex gap-4 print:hidden">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-3 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por N° Egreso, Referencia o Nota..." 
            className="w-full bg-[#0B1120] border border-white/5 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 text-white text-sm transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABLA DE HISTORIAL */}
      <div className="bg-[#1A1F2C] rounded-2xl shadow-2xl border border-white/10 overflow-hidden print:hidden">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-white/5 uppercase text-[10px] font-black text-gray-500 tracking-widest">
            <tr>
              <th className="px-6 py-4">Egreso / Fecha</th>
              <th className="px-6 py-4">Método / Banco</th>
              <th className="px-6 py-4">Detalle del Pago</th>
              <th className="px-6 py-4 text-right">Monto Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={4} className="p-12 text-center text-gray-500 italic">Cargando historial de pagos...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-20 text-center">
                  <CreditCard size={48} className="mx-auto text-gray-800 mb-4" />
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">No se encontraron pagos registrados</p>
                </td>
              </tr>
            ) : (
              filtered.map((pay) => (
                <tr 
                    key={pay.id} 
                    className="hover:bg-white/5 transition-all cursor-pointer group"
                    onClick={() => handleOpenDetail(pay)}
                >
                  
                  {/* COL 1: ID y Fecha */}
                  <td className="px-6 py-5">
                    <div className="font-black text-white text-base tracking-tight flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                      <FileText size={18} className="text-blue-500"/> {pay.paymentNumber}
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1.5 grayscale group-hover:grayscale-0 transition-all">
                      <Calendar size={12}/> {new Date(pay.paymentDate).toLocaleDateString()}
                    </div>
                  </td>

                  {/* COL 2: Método */}
                  <td className="px-6 py-5">
                    <div className="font-bold text-gray-200 uppercase tracking-tight text-xs">
                      {pay.method.replace('_', ' ')}
                    </div>
                    {pay.bankName && (
                      <div className="text-[10px] text-gray-500 font-medium mt-1 truncate max-w-[200px]">
                        {pay.bankName} • <span className="font-mono text-gray-300">REF: {pay.reference || 'N/A'}</span>
                      </div>
                    )}
                  </td>

                  {/* COL 3: Qué facturas pagó */}
                  <td className="px-6 py-5">
                    <div className="space-y-1.5">
                      {pay.details.map((d: PaymentDetail) => (
                        <div key={d.id} className="flex items-center gap-2 text-[11px] font-medium">
                          <CheckCircle size={12} className="text-green-500/80"/>
                          <span className="text-gray-300">Fac. <span className="text-white font-mono">{d.purchaseBill.invoiceNumber}</span></span>
                          {!d.purchaseBill.purchaseOrderId && (
                            <span className="bg-orange-500/10 text-orange-400 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-orange-500/20">
                              Gasto
                            </span>
                          )}
                          <span className="text-gray-500 text-[10px] truncate max-w-[120px] uppercase">({d.purchaseBill.supplier.name})</span>
                        </div>
                      ))}
                      {pay.notes && (
                        <p className="text-[10px] text-gray-600 italic mt-2 line-clamp-1 max-w-xs">&quot;{pay.notes}&quot;</p>
                      )}
                    </div>
                  </td>

                  {/* COL 4: Monto */}
                  <td className="px-6 py-5 text-right">
                    <div className="text-xl font-black text-white tracking-tighter">
                      ${Number(pay.amountPaid).toFixed(2)}
                    </div>
                    {Number(pay.exchangeRate) > 1 && (
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                        TASA: <span className="text-blue-400/80">{Number(pay.exchangeRate).toFixed(2)}</span>
                      </div>
                    )}
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE DETALLE */}
      {isModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md print:hidden">
            <div className="bg-[#1A1F2C] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/10 animate-in fade-in zoom-in duration-300">
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight uppercase">
                          Detalle de Pago <span className="text-blue-400 font-mono">#{selectedPayment.paymentNumber}</span>
                      </h3>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Información de Egreso Bancario</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 p-2 rounded-xl transition-all">
                        <Plus className="rotate-45" size={20} />
                    </button>
                </div>
                
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Fecha Pago</span>
                            <span className="font-bold text-white text-sm">{new Date(selectedPayment.paymentDate).toLocaleDateString()}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Referencia</span>
                            <span className="font-mono font-bold text-blue-400 text-sm">{selectedPayment.reference || 'N/A'}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Banco / Origen</span>
                            <span className="font-bold text-white text-sm truncate block">{selectedPayment.bankName || 'N/A'}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Monto Egreso</span>
                            <span className="font-black text-green-400 text-lg tracking-tighter">${Number(selectedPayment.amountPaid).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">Comprobantes Conciliados</h4>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {selectedPayment.details.map((d: PaymentDetail) => (
                            <div key={d.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-white/10 transition-all">
                                <div>
                                    <p className="font-black text-white text-sm flex items-center gap-2">
                                        FACTURA #{d.purchaseBill.invoiceNumber}
                                        {!d.purchaseBill.purchaseOrderId && (
                                            <span className="bg-orange-500/10 text-orange-400 text-[9px] px-2 py-0.5 rounded-full font-black uppercase border border-orange-500/20">
                                                GASTO
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-400 font-bold uppercase mt-1">{d.purchaseBill.supplier.name}</p>
                                    <p className="text-[10px] text-gray-600 font-mono mt-0.5">RIF: {d.purchaseBill.supplier.rif}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-white text-lg tracking-tighter">${Number(d.amountApplied).toFixed(2)}</p>
                                    {Number(d.purchaseBill.retentionIVA) > 0 && (
                                        <div className="flex flex-col items-end mt-1">
                                          <p className="text-[10px] text-red-400/80 font-bold uppercase tracking-tighter">RET. IVA APLICADA</p>
                                          <p className="text-xs text-red-400 font-mono font-bold">Bs. {Number(d.purchaseBill.retentionIVA).toLocaleString('es-VE', {minimumFractionDigits: 2})}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 px-8 py-6 flex justify-end gap-4 border-t border-white/5">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-all">Cancelar</button>
                    <button 
                        onClick={() => {
                            console.log('--- PRINT DEBUG ---');
                            console.log('Selected Payment:', selectedPayment);
                            console.log('Company:', selectedPayment?.company);
                            handlePrint();
                        }}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]"
                    >
                        <FileText size={18} /> Imprimir Voucher
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* COMPROBANTE DE RETENCIÓN (SOLO IMPRESIÓN) */}
      <div className="hidden print:block p-8 font-serif text-black bg-white h-screen w-full absolute top-0 left-0 z-[9999]">
         {selectedPayment && selectedPayment.details.map((d: PaymentDetail, index: number) => (
             <div key={index} className="mb-8 break-after-page">
                 {/* ENCABEZADO */}
                 <div className="text-center mb-6">
                     <h1 className="text-xl font-bold uppercase">Comprobante de Retención de Impuesto al Valor Agregado</h1>
                     <div className="flex justify-between items-center px-20 mt-2">
                        <p className="text-lg font-bold">Nº: {d.purchaseBill.receiptRetIVA || 'PENDIENTE'}</p>
                        <p className="text-sm font-bold">FECHA: {new Date(selectedPayment.paymentDate).toLocaleDateString()}</p>
                     </div>
                     <p className="text-sm mt-2">Conforme al Artículo 11 de la Ley de IVA</p>
                 </div>

                 {/* DATOS DEL AGENTE (NOSOTROS) */}
                 <div className="border border-black p-4 mb-4 text-xs">
                     <h3 className="font-bold border-b border-black mb-2 pb-1">DATOS DEL AGENTE DE RETENCIÓN</h3>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <span className="block font-bold">NOMBRE O RAZÓN SOCIAL:</span>
                             <span>{selectedPayment.company?.name || 'NOMBRE NO REGISTRADO'}</span> 
                         </div>
                         <div>
                             <span className="block font-bold">RIF:</span>
                             <span>{selectedPayment.company?.rif || 'N/A'}</span>
                         </div>
                         <div className="col-span-2">
                             <span className="block font-bold">DIRECCIÓN FISCAL:</span>
                             <span>{selectedPayment.company?.address || 'Dirección no registrada'}</span>
                         </div>
                     </div>
                 </div>

                 {/* DATOS DEL SUJETO RETENIDO (PROVEEDOR) */}
                 <div className="border border-black p-4 mb-6 text-xs">
                     <h3 className="font-bold border-b border-black mb-2 pb-1">DATOS DEL SUJETO RETENIDO</h3>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <span className="block font-bold">NOMBRE O RAZÓN SOCIAL:</span>
                             <span>{d.purchaseBill.supplier.name}</span>
                         </div>
                         <div>
                             <span className="block font-bold">RIF:</span>
                             <span>{d.purchaseBill.supplier.rif}</span>
                         </div>
                         <div className="col-span-2">
                             <span className="block font-bold">DIRECCIÓN FISCAL:</span>
                             <span>{d.purchaseBill.supplier.address || 'No registrada'}</span>
                         </div>
                     </div>
                 </div>

                 {/* TABLA DE CÁLCULOS */}
                 <table className="w-full text-xs border-collapse border border-black mb-6">
                     <thead>
                         <tr className="bg-gray-200">
                             <th className="border border-black p-2">Fecha Factura</th>
                             <th className="border border-black p-2">N° Factura</th>
                             <th className="border border-black p-2">N° Control</th>
                             <th className="border border-black p-2 text-right">Total Factura (Bs.)</th>
                             <th className="border border-black p-2 text-right">Base Imponible (Bs.)</th>
                             <th className="border border-black p-2 text-center">% Alic.</th>
                             <th className="border border-black p-2 text-right">Impuesto IVA (Bs.)</th>
                             <th className="border border-black p-2 text-right">IVA Retenido (Bs.)</th>
                         </tr>
                     </thead>
                     <tbody>
                         {/* Convertimos a Bs usando la tasa de la factura */}
                         {(() => {
                            const tasa = Number(d.purchaseBill.exchangeRate) || 1;
                            const totalBs = Number(d.purchaseBill.totalAmount) * tasa;
                            const baseBs = Number(d.purchaseBill.taxableAmount) * tasa;
                            const ivaBs = Number(d.purchaseBill.taxAmount) * tasa;
                            // REVISIÓN: En schema.prisma, retentionIVA es Decimal. En payments-out logic, calculamos en base a la moneda.
                            // Si la factura es en USD, los montos base son USD. Hay que convertir a BS para el comprobante FISCAL en Venezuela.
                            // Asumiremos que retentionIVA guardado en DB está en la moneda de la factura (USD normalmente en este sistema).
                            const retBsFinal = Number(d.purchaseBill.retentionIVA) * tasa;

                            return (
                                <tr>
                                    <td className="border border-black p-2 text-center">{new Date(d.purchaseBill.issueDate).toLocaleDateString()}</td>
                                    <td className="border border-black p-2 text-center">{d.purchaseBill.invoiceNumber}</td>
                                    <td className="border border-black p-2 text-center">{d.purchaseBill.controlNumber || 'N/A'}</td>
                                    <td className="border border-black p-2 text-right">{totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                                    <td className="border border-black p-2 text-right">{baseBs.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                                    <td className="border border-black p-2 text-center">{Number(d.purchaseBill.taxRate)}%</td>
                                    <td className="border border-black p-2 text-right">{ivaBs.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                                    <td className="border border-black p-2 text-right font-bold">{retBsFinal.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                                </tr>
                            );
                         })()}
                     </tbody>
                 </table>

                 {/* TOTALES Y FIRMAS */}
                 <div className="flex justify-between mt-12 text-xs">
                     <div className="text-center border-t border-black w-1/3 pt-2">
                         <p className="font-bold">Firma y Sello Agente de Retención</p>
                     </div>
                     <div className="text-center border-t border-black w-1/3 pt-2">
                         <p className="font-bold">Firma y Sello Sujeto Retenido</p>
                         <p>Fecha de Recepción: ____/____/_______</p>
                     </div>
                 </div>
             </div>
         ))}
      </div>
    </div>
  );
}