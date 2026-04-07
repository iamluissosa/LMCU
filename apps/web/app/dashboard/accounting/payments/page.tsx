'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { 
  CreditCard, Search, 
  Plus, FileText, CheckCircle, Calendar, Printer,
  Trash2, Edit
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface DocumentFormat {
  documentType: string;
  headerText: string;
  footerText: string;
  legalText: string;
  agentSignatureLabel: string;
  subjectSignatureLabel: string;
  stampUrl: string | null;
}

const DOC_DEFAULTS: DocumentFormat = {
  documentType: 'RET_IVA',
  headerText: '',
  footerText: 'Este comprobante se emite en función a lo establecido en el artículo 16 de la Providencia Administrativa Nº SNAT/2025/0054',
  legalText: 'Ley de IVA Art. 11. "La administración Tributaria..."',
  agentSignatureLabel: 'Firma del agente de retención',
  subjectSignatureLabel: 'Firma del Beneficiario del Pago Fecha de entrega',
  stampUrl: null,
};

interface CompanyBase { name: string; rif: string; address: string; logoUrl?: string; }
interface SupplierBase { name: string; rif: string; address?: string; }
interface PurchaseBillBase { invoiceNumber: string; purchaseOrderId?: string | null; supplier: SupplierBase; retentionIVA: string | number; receiptRetIVA?: string; retentionISLR?: string | number; receiptRetISLR?: string; exchangeRate: string | number; totalAmount: string | number; taxableAmount: string | number; taxAmount: string | number; issueDate: string; controlNumber?: string; taxRate: string | number; }
interface PaymentDetail { id: string; amountApplied: string | number; purchaseBill: PurchaseBillBase; }
interface ExpenseItem { id: string; description: string; amount: number; expenseCategory?: { name: string; code: string; }; department?: { name: string; code: string; }; }
interface PaymentOut { id: string; paymentNumber: string; paymentDate: string; method: string; bankName?: string; reference?: string; notes?: string; amountPaid: string | number; exchangeRate: string | number; currencyCode?: string; isDirectExpense?: boolean; details: PaymentDetail[]; expenseItems?: ExpenseItem[]; company?: CompanyBase; }

export default function PaymentsOutPage() {
  const [payments, setPayments] = useState<PaymentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [docFormats, setDocFormats] = useState<DocumentFormat>(DOC_DEFAULTS);
  const [userRole, setUserRole] = useState('');
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Cargar perfil de usuario actual
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const myUser = await apiClient.get<any>('/users/me');
        setUserRole(myUser.roleName || myUser.role || '');
        setUserPermissions(myUser.permissions || []);
      } catch (e) {
        console.error('Error cargando perfil:', e);
      }
    };
    fetchUser();
  }, []);

  const can = (permission: string) => {
    if (userRole === 'ADMIN') return true;
    return userPermissions.includes(permission);
  };

  // Cargar configuración de formatos al montar
  const fetchDocFormats = useCallback(async () => {
    try {
      const data = await apiClient.get<DocumentFormat>('/document-formats/RET_IVA');
      setDocFormats(data);
    } catch {
      // Fallback silencioso a valores por defecto
    }
  }, []);

  useEffect(() => { fetchDocFormats(); }, [fetchDocFormats]);

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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro que deseas eliminar este Egreso? Esta acción es irreversible pero quedará registrada en el sistema.')) return;
    try {
       await apiClient.delete(`/payments-out/${id}`);
       toast.success('Egreso eliminado exitosamente');
       setIsModalOpen(false);
       setPayments(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
       console.error('Error eliminando egreso', err);
       toast.error(`Error al eliminar: ${err.message || 'Error desconocido'}`);
    }
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
            <CreditCard className="text-blue-500" /> Historial de Egresos
          </h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-tight font-medium">Egresos · Pagos a Proveedores · Gastos Directos</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/accounting/payments/direct" 
            className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2"
          >
            <FileText size={18} /> Gasto Sin Factura
          </Link>
          <Link 
            href="/dashboard/accounting/payments/new" 
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Pago a Proveedor
          </Link>
        </div>
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

                  {/* COL 3: Qué facturas pagó o Gastos Directos */}
                  <td className="px-6 py-5">
                    <div className="space-y-1.5">
                      {pay.isDirectExpense && pay.expenseItems ? (
                        pay.expenseItems.slice(0, 2).map((item) => (
                           <div key={item.id} className="flex items-center gap-2 text-[11px] font-medium">
                             <CheckCircle size={12} className="text-orange-500/80"/>
                             <span className="bg-orange-500/10 text-orange-400 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-orange-500/20">
                                Gasto Directo
                             </span>
                             <span className="text-gray-300 truncate max-w-[200px]">{item.description}</span>
                           </div>
                        ))
                      ) : (
                        pay.details.map((d: PaymentDetail) => (
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
                        ))
                      )}
                      {pay.isDirectExpense && pay.expenseItems && pay.expenseItems.length > 2 && (
                          <div className="text-[10px] text-gray-500 italic ml-5">+ {pay.expenseItems.length - 2} líneas más</div>
                      )}
                      {pay.notes && (
                        <p className="text-[10px] text-gray-600 italic mt-2 line-clamp-1 max-w-xs">&quot;{pay.notes}&quot;</p>
                      )}
                    </div>
                  </td>

                  {/* COL 4: Monto */}
                  <td className="px-6 py-5 text-right">
                    <div className="text-xl font-black text-white tracking-tighter">
                      {pay.currencyCode === 'VES' ? 'Bs.' : pay.currencyCode === 'EUR' ? '€' : '$'}{Number(pay.amountPaid).toFixed(2)}
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
                            <span className="font-black text-green-400 text-lg tracking-tighter">{selectedPayment.currencyCode === 'VES' ? 'Bs.' : selectedPayment.currencyCode === 'EUR' ? '€' : '$'}{Number(selectedPayment.amountPaid).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">
                           {selectedPayment.isDirectExpense ? "Líneas de Egreso / Distribución Contable" : "Comprobantes Conciliados"}
                        </h4>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {selectedPayment.isDirectExpense && selectedPayment.expenseItems ? (
                           selectedPayment.expenseItems.map((item) => (
                             <div key={item.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-white/10 transition-all">
                               <div>
                                   <p className="font-black text-white text-sm flex items-center gap-2">
                                       {item.description}
                                   </p>
                                   <p className="text-xs text-orange-400 font-bold uppercase mt-1">
                                       Cat: {item.expenseCategory?.name || 'N/A'}
                                   </p>
                                   {item.department && (
                                     <p className="text-[10px] text-gray-500 uppercase mt-0.5 tracking-widest">
                                        C.C: {item.department.code} - {item.department.name}
                                     </p>
                                   )}
                               </div>
                               <div className="text-right">
                                   <p className="font-black text-white text-lg tracking-tighter">${Number(item.amount).toFixed(2)}</p>
                               </div>
                             </div>
                           ))
                        ) : (
                          selectedPayment.details.map((d: PaymentDetail) => (
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
                                      <p className="font-black text-white text-lg tracking-tighter">{selectedPayment.currencyCode === 'VES' ? 'Bs.' : selectedPayment.currencyCode === 'EUR' ? '€' : '$'}{Number(d.amountApplied).toFixed(2)}</p>
                                      <div className="flex flex-col items-end gap-2 mt-1">
                                        {Number(d.purchaseBill.retentionIVA) > 0 && (
                                            <div className="flex flex-col items-end">
                                              <p className="text-[10px] text-red-400/80 font-bold uppercase tracking-tighter">RET. IVA APLICADA</p>
                                              <p className="text-xs text-red-400 font-mono font-bold">Bs. {Number(d.purchaseBill.retentionIVA).toLocaleString('es-VE', {minimumFractionDigits: 2})}</p>
                                            </div>
                                        )}
                                        
                                        {Number(d.purchaseBill.retentionISLR) > 0 && d.purchaseBill.receiptRetISLR && (
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col items-end">
                                                  <p className="text-[10px] text-blue-400/80 font-bold uppercase tracking-tighter">RET. ISLR APLICADA</p>
                                                  <p className="text-xs text-blue-400 font-mono font-bold">Bs. {Number(d.purchaseBill.retentionISLR).toLocaleString('es-VE', {minimumFractionDigits: 2})}</p>
                                                </div>
                                                <button 
                                                  onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                      const res = await apiClient.get<{ id: string }>(`/islr/by-receipt/${d.purchaseBill.receiptRetISLR}`);
                                                      if (res?.id) window.open(`/print/islr/${res.id}`, '_blank');
                                                    } catch (err) {
                                                      console.error('No se encontró comprobante ISLR:', err);
                                                      toast.error('No se encontró el comprobante ISLR vinculado');
                                                    }
                                                  }}
                                                  className="bg-blue-600/20 hover:bg-blue-500 text-blue-400 hover:text-white p-2 rounded-xl transition-all shadow-lg"
                                                  title="Imprimir Comprobante ISLR"
                                                >
                                                  <Printer size={14} />
                                                </button>
                                            </div>
                                        )}
                                      </div>
                                  </div>
                              </div>
                          ))
                        )}
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 px-8 py-6 flex justify-end gap-4 border-t border-white/5">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-all">Cancelar</button>
                    
                    {/* Botones adicionales solo para Gastos Directos */}
                    {selectedPayment.isDirectExpense && can('payments.delete') && (
                        <button 
                          onClick={(e) => handleDelete(selectedPayment.id, e)}
                          className="px-6 py-3 bg-red-600/20 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg transition-all hover:scale-[1.02]"
                        >
                          <Trash2 size={18} /> Eliminar (Soft)
                        </button>
                    )}
                    {selectedPayment.isDirectExpense && can('payments.edit') && (
                        <Link 
                          href={`/dashboard/accounting/payments/direct/${selectedPayment.id}`}
                          className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-600/20 transition-all hover:scale-[1.02]"
                        >
                          <Edit size={18} /> Editar Gasto
                        </Link>
                    )}

                    {!selectedPayment.isDirectExpense && (
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
                    )}
                </div>
            </div>
        </div>
      )}

      {/* ESTILOS PARA IMPRESIÓN */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            background: white; 
          }
          /* Ocultar scrollbars o avisos genéricos */
          ::-webkit-scrollbar { display: none; }
        }
      `}} />

      {/* COMPROBANTE DE RETENCIÓN (SOLO IMPRESIÓN) */}
      <div className="hidden print:block font-sans text-black bg-white w-full absolute top-0 left-0 z-[9999] px-4 py-2">
         {selectedPayment && !selectedPayment.isDirectExpense && (() => {
           // Calcular periodo (AAAA-MM) y fecha
           const paymentDateObj = new Date(selectedPayment.paymentDate);
           const periodStr = `${paymentDateObj.getFullYear()}-${String(paymentDateObj.getMonth() + 1).padStart(2, '0')}`;
           const dateStr = paymentDateObj.toLocaleDateString('es-VE');

           // Sacar recibo de retención si existe, o usar Payment Number como ref
           let retentionNumber = '';
           if (selectedPayment.details && selectedPayment.details.length > 0) {
             retentionNumber = selectedPayment.details[0]?.purchaseBill?.receiptRetIVA || selectedPayment.paymentNumber;
           }

           // Proveedor (Sujeto retenido) asumiendo que un pago es a un solo proveedor
           const firstDetail = selectedPayment.details && selectedPayment.details.length > 0 ? selectedPayment.details[0] : null;
           const supplierName = firstDetail?.purchaseBill?.supplier?.name || 'N/A';
           const supplierRif = firstDetail?.purchaseBill?.supplier?.rif || 'N/A';
           const supplierAddress = firstDetail?.purchaseBill?.supplier?.address || 'NO REGISTRADA';

           // Formateador de moneda
           const fm = (val: number) => val.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});

           // Totales globales para pie de tabla
           let sumMontoTotal = 0;
           let sumExento = 0;
           let sumBase = 0;
           let sumIvaCausado = 0;
           let sumIvaRetenido = 0;
           let sumTotalPagar = 0;

           selectedPayment.details.forEach(d => {
              const tasa = Number(d.purchaseBill.exchangeRate) || 1;
              const totalBs = Number(d.purchaseBill.totalAmount) * tasa;
              const baseBs = Number(d.purchaseBill.taxableAmount) * tasa;
              const ivaBs = Number(d.purchaseBill.taxAmount) * tasa;
              const retBsFinal = Number(d.purchaseBill.retentionIVA) * tasa;
              const exentoBs = Math.max(0, totalBs - baseBs - ivaBs);
              const pagarBs = totalBs - retBsFinal;

              sumMontoTotal += totalBs;
              sumExento += exentoBs;
              sumBase += baseBs;
              sumIvaCausado += ivaBs;
              sumIvaRetenido += retBsFinal;
              sumTotalPagar += pagarBs;
           });

           return (
             <div className="w-full">
               
               {/* ENCABEZADO: Logo + Texto + Títulos */}
               <div className="flex flex-col mb-4 relative">
                  <div className="w-full flex justify-between items-start">
                     {/* Logo izq */}
                     <div className="w-48 flex-shrink-0">
                        {selectedPayment.company?.logoUrl && (
                           // eslint-disable-next-line @next/next/no-img-element
                           <img src={selectedPayment.company.logoUrl} alt="Logo empresa" className="h-16 object-contain" />
                        )}
                     </div>

                     {/* Texto Legal Centro */}
                     <div className="flex-1 text-center px-4 pt-1">
                        <p className="text-[10px] sm:text-[11px] font-medium leading-[1.2] text-gray-800 tracking-tight">
                          {docFormats.legalText}
                        </p>
                     </div>

                     {/* Espacio vacío a derecha para balancear logo */}
                     <div className="w-48 flex-shrink-0"></div>
                  </div>

                  {/* Títulos Centrales */}
                  <div className="text-center mt-2 space-y-0.5">
                     <h1 className="text-lg font-black tracking-widest text-[#1a1a1a]">COMPROBANTE DE RETENCION DE I.V.A.</h1>
                     <p className="text-[11px] font-medium text-gray-800">{docFormats.headerText || 'Providencia Administrativa Nº SNAT/2025/0054 del 01/08/2025'}</p>
                  </div>

                  {/* Número de comprobante y Fecha/Periodo */}
                  <div className="mt-4 flex w-full relative h-[40px]">
                      {/* Centro (Absoluto) N° Comprobante */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-2/5 border border-black h-8 flex items-center justify-center bg-[#fafafa]">
                          <span className="font-bold text-xs uppercase tracking-tight">N° DE COMPROBANTE </span>
                          <span className="font-black text-sm ml-2 tracking-tighter">{retentionNumber}</span>
                      </div>

                      {/* Derecha (Absoluto) Fecha y Periodo */}
                      <div className="absolute right-0 top-0 w-48 space-y-2">
                          <div className="border border-black text-center text-[10px]">
                              <div className="border-b border-black font-semibold uppercase tracking-wider bg-gray-50 py-0.5">FECHA</div>
                              <div className="font-bold py-1 text-xs">{dateStr}</div>
                          </div>
                      </div>
                  </div>
               </div>

               {/* RECUADROS AGENTE */}
               <div className="mt-8">
                   <div className="flex gap-2 w-[calc(100%-12.5rem)]">
                       <div className="border border-black flex-1 text-center flex flex-col justify-center py-1">
                          <span className="text-[8px] font-bold uppercase tracking-tight text-gray-700">NOMBRE O RAZON SOCIAL DEL AGENTE DE RETENCION:</span>
                          <span className="text-xs font-bold leading-tight">{selectedPayment.company?.name || 'N/A'}</span>
                       </div>
                       <div className="border border-black flex-1 text-center flex flex-col justify-center py-1">
                          <span className="text-[8px] font-bold uppercase tracking-tight text-gray-700">REGISTRO DE INFORMACION FISCAL (RIF) DEL AGENTE DE RETENCION:</span>
                          <span className="text-xs font-bold leading-tight w-full truncate px-1">{selectedPayment.company?.rif || 'N/A'}</span>
                       </div>
                   </div>

                   <div className="flex gap-2 w-full mt-2">
                       <div className="w-[calc(100%-12.5rem)] border border-black text-center flex flex-col justify-center py-1">
                          <span className="text-[8px] font-bold uppercase tracking-tight text-gray-700">DIRECCION DEL AGENTE DE RETENCION:</span>
                          <span className="text-[10px] font-medium leading-tight truncate px-2">{selectedPayment.company?.address || 'N/A'}</span>
                       </div>
                       <div className="w-48 flex-none border border-black text-center text-[10px] -mt-10 self-start">
                          <div className="border-b border-black font-semibold uppercase tracking-wider bg-gray-50 py-0.5">PERIODO FISCAL</div>
                          <div className="font-bold py-1 text-xs">{periodStr}</div>
                       </div>
                   </div>
               </div>

               {/* RECUADROS SUJETO */}
               <div className="flex gap-2 w-full mt-2">
                       <div className="border border-black flex-[1.5] text-center flex flex-col justify-center py-1 overflow-hidden">
                          <span className="text-[8px] font-bold uppercase tracking-tight text-gray-700 truncate w-full px-1">NOMBRE O RAZON SOCIAL DEL SUJETO A RETENCION:</span>
                          <span className="text-[11px] uppercase font-bold leading-tight truncate px-1">{supplierName}</span>
                       </div>
                       <div className="border border-black flex-1 text-center flex flex-col justify-center py-1">
                          <span className="text-[8px] font-bold uppercase tracking-tight text-gray-700 truncate w-full px-1">REGISTRO DE INFORMACION FISCAL (RIF) DEL SUJETO:</span>
                          <span className="text-[11px] uppercase font-bold leading-tight truncate px-1">{supplierRif}</span>
                       </div>
                       <div className="border border-black flex-[2] text-center flex flex-col justify-center py-1">
                          <span className="text-[8px] font-bold uppercase tracking-tight text-gray-700">DIRECCION DEL SUJETO A RETENCION:</span>
                          <span className="text-[9px] uppercase font-medium leading-tight truncate px-2">{supplierAddress}</span>
                       </div>
               </div>

               {/* TABLA PRINCIPAL */}
               <div className="mt-4">
                  <table className="w-full text-black border-collapse align-middle" style={{fontSize: '9px', lineHeight: '1.1'}}>
                     <thead className="text-center font-bold tracking-tighter">
                        <tr>
                           <th className="border border-black py-1 px-0.5 w-6">N° de Oper.</th>
                           <th className="border border-black py-1 px-1 w-16">Fecha del Documento</th>
                           <th className="border border-black py-1 px-1 w-20">N° Factura</th>
                           <th className="border border-black py-1 px-1 w-20">N° Control</th>
                           <th className="border border-black py-1 px-1 w-16">N° de Nota de Debito</th>
                           <th className="border border-black py-1 px-1 w-16">N° de Nota de Credito</th>
                           <th className="border border-black py-1 px-1 w-16">Clase de Operación</th>
                           <th className="border border-black py-1 px-1 w-14">N° factura Afectada</th>
                           <th className="border border-black py-1 px-1 w-20">Monto Total del documento</th>
                           <th className="border border-black py-1 px-1 w-16 leading-none">Monto exento, exonerado o no sujeto</th>
                           <th className="border border-black py-1 px-1 w-20 leading-none">Monto gravado Base Imponible</th>
                           <th className="border border-black py-1 px-0.5 w-10">% Alicuota</th>
                           <th className="border border-black py-1 px-1 w-20">IVA Causado</th>
                           <th className="border border-black py-1 px-1 w-20">IVA Retenido</th>
                           <th className="border border-black py-1 px-0.5 w-8">% Ret.</th>
                           <th className="border border-black py-1 px-1 w-20">Total a Pagar</th>
                        </tr>
                     </thead>
                     <tbody className="text-right">
                        {selectedPayment.details.map((d: PaymentDetail, index: number) => {
                            const tasa = Number(d.purchaseBill.exchangeRate) || 1;
                            const totalBs = Number(d.purchaseBill.totalAmount) * tasa;
                            const baseBs = Number(d.purchaseBill.taxableAmount) * tasa;
                            const ivaBs = Number(d.purchaseBill.taxAmount) * tasa;
                            const retBsFinal = Number(d.purchaseBill.retentionIVA) * tasa;
                            const exentoBs = Math.max(0, totalBs - baseBs - ivaBs);
                            const pagarBs = totalBs - retBsFinal;
                            const porcRet = ivaBs > 0 ? Math.round((retBsFinal / ivaBs) * 100) : 0;
                            const dateInvoice = new Date(d.purchaseBill.issueDate).toLocaleDateString('es-VE');

                            return (
                                <tr key={d.id} className="h-6">
                                    <td className="border border-black py-1 px-1 text-center">{index + 1}</td>
                                    <td className="border border-black py-1 px-1 text-center">{dateInvoice}</td>
                                    <td className="border border-black py-1 px-1 text-center">{d.purchaseBill.invoiceNumber}</td>
                                    <td className="border border-black py-1 px-1 text-center">{d.purchaseBill.controlNumber || '-'}</td>
                                    <td className="border border-black py-1 px-1 text-center">-</td>
                                    <td className="border border-black py-1 px-1 text-center">-</td>
                                    <td className="border border-black py-1 px-1 text-center">01 Registro</td>
                                    <td className="border border-black py-1 px-1 text-center">-</td>
                                    <td className="border border-black py-1 px-1.5">{fm(totalBs)}</td>
                                    <td className="border border-black py-1 px-1.5">{fm(exentoBs)}</td>
                                    <td className="border border-black py-1 px-1.5">{fm(baseBs)}</td>
                                    <td className="border border-black py-1 px-1 text-center">{Number(d.purchaseBill.taxRate)}</td>
                                    <td className="border border-black py-1 px-1.5">{fm(ivaBs)}</td>
                                    <td className="border border-black py-1 px-1.5">{fm(retBsFinal)}</td>
                                    <td className="border border-black py-1 px-1 text-center">{porcRet}</td>
                                    <td className="border border-black py-1 px-1.5">{fm(pagarBs)}</td>
                                </tr>
                            );
                        })}

                        {/* Fila de Totales */}
                        <tr className="bg-gray-100 font-bold">
                            <td className="border border-black py-1 px-1" colSpan={8}></td>
                            <td className="border border-black py-1 px-1.5">{fm(sumMontoTotal)}</td>
                            <td className="border border-black py-1 px-1.5">{fm(sumExento)}</td>
                            <td className="border border-black py-1 px-1.5">{fm(sumBase)}</td>
                            <td className="border border-black py-1 px-1"></td>
                            <td className="border border-black py-1 px-1.5">{fm(sumIvaCausado)}</td>
                            <td className="border border-black py-1 px-1.5 bg-gray-200">{fm(sumIvaRetenido)}</td>
                            <td className="border border-black py-1 px-1"></td>
                            <td className="border border-black py-1 px-1.5">{fm(sumTotalPagar)}</td>
                        </tr>
                     </tbody>
                  </table>
               </div>

               {/* FOOTER (Texto providencia al pie de la tabla) */}
               <div className="text-center mt-2">
                   <p className="text-center font-bold text-[10px] sm:text-[11px] uppercase tracking-widest text-[#1a1a1a]">
                  {docFormats.footerText}
               </p>
               </div>

               {/* BLOQUES DE FIRMAS FINALES */}
               <div className="mt-8 flex justify-center gap-12 sm:gap-24 px-12">
                   {/* Firma Izquierda (Vacia / Con Sello del Agente si hay en config) */}
                   <div className="w-[45%] border border-black relative h-28 flex flex-col items-center justify-end pb-1">
                  <p className="text-[10px] font-black mt-2 tracking-widest uppercase">{docFormats.agentSignatureLabel}</p>
                  <p className="text-[10px] font-bold text-gray-600 truncate">{selectedPayment.company?.name}</p>
                  {docFormats.stampUrl && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70 -z-10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={docFormats.stampUrl} alt="Sello" className="h-16 object-contain pointer-events-none grayscale" />
                     </div>
                  )}
               </div>
               
               <div className="w-[45%] text-center border-t border-black pt-2 flex flex-col items-center">
                  <p className="text-[10px] font-black mt-2 tracking-widest uppercase break-words w-full px-2">{docFormats.subjectSignatureLabel}</p>
                       {/* Un recuadro grande en blanco vacío. Le daremos altura explícita. */}
                       <div className="h-28 flex flex-col items-center justify-end pb-1 opacity-0 pointer-events-none text-[8px] border-t border-black px-4 mx-4 hidden">
                          {/* El recuadro real (Veneventos imagen) solo muestra lineas o cajas en blanco. */}
                       </div>
                   </div>

                   {/* Firma Derecha (Vacía total) */}
                   <div className="w-[300px] border border-black h-28"></div>
               </div>
               
             </div>
           );
         })()}
      </div>
    </div>
  );
}