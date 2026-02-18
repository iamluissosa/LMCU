'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { 
  CreditCard, Search, 
  Plus, FileText, CheckCircle, Calendar
} from 'lucide-react';
import Link from 'next/link';
export default function PaymentsOutPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');





  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await apiClient.get<{ items: any[]; pagination: any }>('/payments-out');
        if (response && response.items) {
          setPayments(response.items);
        }
      } catch (error: any) {
        console.error('Error fetching payments (full):', error);
        console.error('Error message:', error.message);
        console.error('Error response:', error.response);
        alert(`Error: ${error.message || JSON.stringify(error)}`);
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
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Función para abrir el modal
  const handleOpenDetail = (payment: any) => {
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
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CreditCard className="text-blue-600" /> Historial de Pagos (Egresos)
          </h1>
          <p className="text-gray-500 text-sm">Registro de salidas de dinero y transferencias</p>
        </div>
        <Link 
          href="/dashboard/accounting/payments/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} /> Registrar Nuevo Pago
        </Link>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-4 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por N° Egreso, Referencia o Nota..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABLA DE HISTORIAL */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 uppercase text-xs font-semibold text-gray-700">
            <tr>
              <th className="px-6 py-4">Egreso / Fecha</th>
              <th className="px-6 py-4">Método / Banco</th>
              <th className="px-6 py-4">Detalle del Pago</th>
              <th className="px-6 py-4 text-right">Monto Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center">Cargando historial...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">No se encontraron pagos registrados.</td></tr>
            ) : (
              filtered.map((pay) => (
                <tr 
                    key={pay.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleOpenDetail(pay)}
                >
                  
                  {/* COL 1: ID y Fecha */}
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      <FileText size={16} className="text-blue-500"/> {pay.paymentNumber}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Calendar size={12}/> {new Date(pay.paymentDate).toLocaleDateString()}
                    </div>
                  </td>

                  {/* COL 2: Método */}
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-800">
                      {pay.method.replace('_', ' ')}
                    </div>
                    {pay.bankName && (
                      <div className="text-xs text-gray-500 mt-1">
                        {pay.bankName} • Ref: <span className="font-mono text-gray-700">{pay.reference || 'N/A'}</span>
                      </div>
                    )}
                  </td>

                  {/* COL 3: Qué facturas pagó */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {pay.details.map((d: any) => (
                        <div key={d.id} className="flex items-center gap-2 text-xs">
                          <CheckCircle size={12} className="text-green-500"/>
                          <span className="text-gray-700">Fac. {d.purchaseBill.invoiceNumber}</span>
                          <span className="text-gray-400">({d.purchaseBill.supplier.name})</span>
                        </div>
                      ))}
                      {pay.notes && (
                        <p className="text-xs text-gray-400 italic mt-1 max-w-xs truncate">"{pay.notes}"</p>
                      )}
                    </div>
                  </td>

                  {/* COL 4: Monto */}
                  <td className="px-6 py-4 text-right">
                    <div className="text-lg font-bold text-gray-900">
                      ${Number(pay.amountPaid).toFixed(2)}
                    </div>
                    {Number(pay.exchangeRate) > 1 && (
                      <div className="text-xs text-gray-400 mt-1">
                        Tasa: {Number(pay.exchangeRate).toFixed(2)}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">
                        Detalle del Pago {selectedPayment.paymentNumber}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                        ✕
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="block text-gray-500">Fecha</span>
                            <span className="font-medium">{new Date(selectedPayment.paymentDate).toLocaleDateString()}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500">Referencia</span>
                            <span className="font-medium">{selectedPayment.reference || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500">Banco</span>
                            <span className="font-medium">{selectedPayment.bankName || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500">Monto Pagado</span>
                            <span className="font-bold text-green-600">${Number(selectedPayment.amountPaid).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="font-semibold text-gray-700 mb-2">Facturas Pagadas</h4>
                        <div className="space-y-2">
                        {selectedPayment.details.map((d: any) => (
                            <div key={d.id} className="bg-gray-50 p-3 rounded-lg text-sm flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-gray-800">Fac. {d.purchaseBill.invoiceNumber}</p>
                                    <p className="text-gray-500">{d.purchaseBill.supplier.name}</p>
                                    <p className="text-xs text-gray-400">RIF: {d.purchaseBill.supplier.rif}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-gray-900">${Number(d.amountApplied).toFixed(2)}</p>
                                    {Number(d.purchaseBill.retentionIVA) > 0 && (
                                        <p className="text-xs text-red-500">Ret. IVA: Bs. {Number(d.purchaseBill.retentionIVA).toLocaleString('es-VE', {minimumFractionDigits: 2})}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cerrar</button>
                    <button 
                        onClick={() => {
                            console.log('--- PRINT DEBUG ---');
                            console.log('Selected Payment:', selectedPayment);
                            console.log('Company:', selectedPayment?.company);
                            handlePrint();
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 shadow-sm"
                    >
                        <FileText size={18} /> Imprimir Comprobante
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* COMPROBANTE DE RETENCIÓN (SOLO IMPRESIÓN) */}
      <div className="hidden print:block p-8 font-serif text-black bg-white h-screen w-full absolute top-0 left-0 z-[9999]">
         {selectedPayment && selectedPayment.details.map((d: any, index: number) => (
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
                            const retBs = Number(d.purchaseBill.retentionIVA); // Ya se guardan en Bs o USD? Ojo con esto. Asumimos que retentionIVA en DB es la moneda base? No, schema dice Decimal.
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