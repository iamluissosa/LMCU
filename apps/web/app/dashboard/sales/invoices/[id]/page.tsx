'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Printer, FileText, CheckCircle, Clock, DollarSign, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  controlNumber?: string;
  status: string;
  salesOrderId?: string | null;
  issueDate: string;
  dueDate?: string;
  notes?: string;
  subtotal: string | number;
  exemptAmount: string | number;
  taxableAmount: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  paidAmount: string | number;
  retentionIVA: string | number;
  retentionISLR: string | number;
  currencyCode: string;
  exchangeRate: string | number;
  client: { name: string; rif?: string; address?: string; phone?: string; email?: string; };
  company: {
    name: string; rif: string; address: string; phone?: string; email?: string; logoUrl?: string;
  };
  items: {
    id: string;
    quantity: string | number;
    unitPrice: string | number;
    taxRate: string | number;
    discount: string | number;
    totalLine: string | number;
    description?: string;
    product?: { name: string; code: string; isService: boolean };
    serviceCategory?: { name: string };
  }[];
  payments: {
    amountApplied: string | number;
    paymentIn: {
      id: string;
      paymentNumber: string;
      paymentDate: string;
      method: string;
    };
  }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT:   { label: 'Borrador',  color: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',    icon: <Clock size={14} /> },
  ISSUED:  { label: 'Emitida',   color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',    icon: <FileText size={14} /> },
  PARTIAL: { label: 'Parcial',   color: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20', icon: <DollarSign size={14} /> },
  PAID:    { label: 'Cobrada',   color: 'bg-green-500/10 text-green-400 border border-green-500/20',  icon: <CheckCircle size={14} /> },
  VOID:    { label: 'Anulada',   color: 'bg-white/5 text-gray-500 border border-white/10',      icon: <XCircle size={14} /> },
  OVERDUE: { label: 'Vencida',   color: 'bg-orange-500/10 text-orange-400 border border-orange-500/20', icon: <AlertTriangle size={14} /> },
};

const fmt = (n: number | string, cur = 'USD') =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(Number(n));

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const data = await apiClient.get<InvoiceDetail>(`/sales-invoices/${params.id}`);
        setInvoice(data);
      } catch (error) {
        console.error('Error cargando factura:', error);
        toast.error('Error al cargar la factura');
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchInvoice();
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Cargando detalles de factura...</div>;
  if (!invoice) return <div className="p-10 text-center text-red-400">Factura no encontrada.</div>;

  const st = STATUS_CONFIG[invoice.status] ?? { label: invoice.status, color: 'bg-white/5 text-gray-400', icon: <FileText size={14} /> };
  
  const pendingAmount = Number(invoice.totalAmount) - Number(invoice.paidAmount) - Number(invoice.retentionIVA) - Number(invoice.retentionISLR);

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:space-y-0 print:p-0">
      
      {/* ── ACCIONES (Oculto en impresión) ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white bg-white/5 p-2 text-sm rounded-lg border border-white/10 shadow-sm transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-bold text-white">Factura N° {invoice.invoiceNumber}</h1>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${st.color}`}>
            {st.icon} {st.label}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {invoice.status === 'ISSUED' || invoice.status === 'PARTIAL' ? (
             <button 
               onClick={() => router.push('/dashboard/sales/invoices')}
               className="bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-green-500/10">
               <DollarSign size={16} /> Registrar Cobro
             </button>
          ) : null}

          <button 
            onClick={handlePrint}
            className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-wider shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all">
            <Printer size={16} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* ── DOCUMENTO IMPRIMIBLE ── */}
      <div className="bg-[#1A1F2C] rounded-2xl shadow-2xl border border-white/10 print:bg-white print:shadow-none print:border-none print:m-0 print:p-0 transition-colors">
        <div className="p-8 md:p-12 print:p-0">
          
          {/* Encabezado: Empresa y Logo */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10 border-b border-white/10 pb-8 print:border-b-2 print:border-gray-800">
            <div className="flex gap-6 items-center">
              {invoice.company?.logoUrl ? (
                <img src={invoice.company.logoUrl} alt="Logo" className="w-24 h-24 object-contain" />
              ) : (
                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gray-600 print:bg-gray-100 print:text-gray-400">
                  <FileText size={32} />
                </div>
              )}
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider print:text-gray-800">{invoice.company?.name || 'EMPRESA DEMO'}</h2>
                <div className="text-sm text-gray-400 space-y-0.5 mt-1 print:text-gray-600">
                  <p><span className="font-bold text-gray-300 print:text-gray-800">RIF:</span> {invoice.company?.rif}</p>
                  <p className="max-w-xs">{invoice.company?.address}</p>
                  {invoice.company?.phone && <p>Telf: {invoice.company.phone}</p>}
                  {invoice.company?.email && <p>Email: {invoice.company.email}</p>}
                </div>
              </div>
            </div>

            <div className="text-right">
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 print:text-gray-800">FACTURA</h1>
              <p className="text-xl font-mono font-bold text-teal-400 print:text-teal-700">{invoice.invoiceNumber}</p>
              {invoice.controlNumber && <p className="text-xs text-gray-500 font-mono mt-1">Control: {invoice.controlNumber}</p>}
              
              <div className="mt-4 text-sm text-gray-400 space-y-1 print:text-gray-600">
                <p><span className="font-bold text-gray-300 print:text-gray-800">Emisión:</span> {new Date(invoice.issueDate).toLocaleDateString('es-VE')}</p>
                {invoice.dueDate && (
                   <p><span className="font-bold text-gray-300 print:text-gray-800">Vencimiento:</span> {new Date(invoice.dueDate).toLocaleDateString('es-VE')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 border-b border-white/10 pb-1 print:border-gray-800 print:text-gray-400">Facturado a:</h3>
              <p className="font-black text-white text-lg uppercase print:text-gray-800">{invoice.client.name}</p>
              <div className="text-sm text-gray-400 space-y-0.5 mt-2 print:text-gray-600">
                <p><span className="font-bold text-gray-300 print:text-gray-800">Identificación (RIF/CI):</span> {invoice.client.rif || 'N/A'}</p>
                {invoice.client.address && <p><span className="font-bold text-gray-300 print:text-gray-800">Dirección:</span> {invoice.client.address}</p>}
                {invoice.client.phone && <p><span className="font-bold text-gray-300 print:text-gray-800">Teléfono:</span> {invoice.client.phone}</p>}
                {invoice.client.email && <p><span className="font-bold text-gray-300 print:text-gray-800">Correo:</span> {invoice.client.email}</p>}
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10 print:bg-transparent print:border-gray-300 print:rounded-none transition-colors">
               <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 border-b border-white/10 pb-1 print:border-gray-800 print:text-gray-400">Información Comercial:</h3>
               <div className="text-sm space-y-1.5 mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Moneda Base:</span>
                    <span className="font-bold text-white print:text-gray-800">{invoice.currencyCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tasa de Cambio BCE:</span>
                    <span className="font-mono text-gray-400 print:text-gray-800">1 {invoice.currencyCode} = {Number(invoice.exchangeRate).toLocaleString('es-VE')} VES</span>
                  </div>
                  <div className="flex justify-between font-bold mt-2 pt-2 border-t border-white/10 print:border-gray-200">
                     <span className="text-gray-400 print:text-gray-700">Estado de Pago:</span>
                     <span className={pendingAmount > 0.01 ? 'text-orange-400' : 'text-green-400'}>
                       {pendingAmount > 0.01 ? 'Pendiente' : 'Pagado'}
                     </span>
                  </div>
               </div>
            </div>
          </div>

          {/* Tabla de Ítems */}
          <div className="mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-gray-400 print:bg-gray-200 print:text-black print:border-b-2 print:border-black">
                  <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider text-[10px] rounded-tl-lg print:rounded-none w-[10%]">Código</th>
                  <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider text-[10px] w-[40%]">Descripción</th>
                  <th className="py-2.5 px-4 text-center font-bold uppercase tracking-wider text-[10px] w-[5%]">Cant.</th>
                  <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider text-[10px] w-[15%]">Precio Unit.</th>
                  <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider text-[10px] w-[10%]">IVA%</th>
                  <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider text-[10px] rounded-tr-lg print:rounded-none w-[15%]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-gray-300 border-b border-white/5 print:border-black">
                {invoice.items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white/5 print:bg-white' : 'bg-transparent print:bg-white'}>
                    <td className="py-3 px-4 font-mono text-xs text-gray-500">{item.product?.code || 'SRV'}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-white uppercase print:text-gray-800">{item.product?.name || item.serviceCategory?.name}</p>
                      {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-300 print:text-gray-800">{Number(item.quantity).toLocaleString('es-VE')}</td>
                    <td className="py-3 px-4 text-right font-mono text-gray-400 print:text-gray-600">{fmt(item.unitPrice, invoice.currencyCode)}</td>
                    <td className="py-3 px-4 text-right font-mono text-gray-400 print:text-gray-600">{Number(item.taxRate)}%</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white print:text-gray-800">{fmt(item.totalLine, invoice.currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales y Observaciones */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 pb-5">
             <div className="w-full md:w-[45%]">
                {invoice.payments && invoice.payments.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 border-b border-white/10 pb-1 print:border-gray-800 print:text-gray-400">Pagos Recibidos:</h3>
                    <ul className="text-sm space-y-1">
                      {invoice.payments.map((p, idx) => (
                        <li key={idx} className="flex justify-between text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/5 print:bg-transparent print:text-gray-700 print:border-none">
                          <span className="font-medium uppercase tracking-tight">{p.paymentIn.method} ({new Date(p.paymentIn.paymentDate).toLocaleDateString('es-VE')})</span>
                          <span className="font-mono font-bold text-green-400 print:text-green-700">{fmt(p.amountApplied, invoice.currencyCode)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 border-b border-white/10 pb-1 print:border-gray-800 print:text-gray-400">Observaciones:</h3>
                <p className="text-sm text-gray-500 whitespace-pre-line italic print:text-gray-600">
                  {invoice.notes || 'Factura generada sin notas adicionales.'}
                </p>
             </div>

             <div className="w-full md:w-[45%] bg-white/5 p-5 rounded-2xl border border-white/10 print:bg-transparent print:border-none print:p-0 transition-colors">
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span className="uppercase tracking-tight font-medium">Subtotal Exento</span>
                    <span className="font-mono font-bold text-gray-300 print:text-gray-800">{fmt(invoice.exemptAmount, invoice.currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span className="uppercase tracking-tight font-medium">Base Imponible</span>
                    <span className="font-mono font-bold text-gray-300 print:text-gray-800">{fmt(invoice.taxableAmount, invoice.currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span className="uppercase tracking-tight font-medium">IVA</span>
                    <span className="font-mono font-bold text-gray-300 border-b border-white/10 pb-2 print:border-gray-800 print:text-gray-800">{fmt(invoice.taxAmount, invoice.currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-white font-black text-xl pt-1 print:text-gray-800">
                    <span className="tracking-tighter">TOTAL FACTURA</span>
                    <span className="font-mono text-teal-400 print:text-black">{fmt(invoice.totalAmount, invoice.currencyCode)}</span>
                  </div>
                  
                  {/* RETENCIONES Y NETO */}
                  {(Number(invoice.retentionIVA) > 0 || Number(invoice.retentionISLR) > 0) && (
                    <div className="pt-2 mt-2 border-t border-dashed border-white/10 print:border-gray-300">
                      {Number(invoice.retentionIVA) > 0 && (
                        <div className="flex justify-between text-orange-400 text-[10px] font-bold uppercase tracking-wider">
                          <span>Retención IVA</span>
                          <span className="font-mono">-{fmt(invoice.retentionIVA, invoice.currencyCode)}</span>
                        </div>
                      )}
                      {Number(invoice.retentionISLR) > 0 && (
                        <div className="flex justify-between text-orange-400 text-[10px] font-bold uppercase tracking-wider">
                          <span>Retención ISLR</span>
                          <span className="font-mono">-{fmt(invoice.retentionISLR, invoice.currencyCode)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between text-white font-bold text-md pt-2 mt-2 border-t border-white/10 print:border-gray-800 print:text-gray-800">
                    <span className="tracking-tight">COBRADO</span>
                    <span className="font-mono text-green-400 print:text-black">{fmt(invoice.paidAmount, invoice.currencyCode)}</span>
                  </div>
                  
                  {pendingAmount > 0.01 && (
                    <div className="flex justify-between text-red-400 font-black text-xl pt-1 print:text-black">
                      <span className="tracking-tighter uppercase">SALDO DEUDOR</span>
                      <span className="font-mono">{fmt(pendingAmount, invoice.currencyCode)}</span>
                    </div>
                  )}

                </div>
             </div>
          </div>
          
          {/* Footer PDF */}
          <div className="hidden print:block fixed bottom-0 left-0 w-full text-center text-xs text-gray-400 border-t pt-2">
            Generado por ERP LMCU Enterprise - Factura N° {invoice.invoiceNumber} - Página 1 de 1
          </div>

        </div>
      </div>
      
      {/* ── ESTILOS GLOBALES PARA IMPRESIÓN (HIDE SIDEBAR) ── */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          title { display: none; }
          html, body {
            background-color: white !important;
            height: 100%;
            margin: 0 !important;
            padding: 0 !important;
          }
          aside, nav, header {
            display: none !important;
          }
          main, #root, .flex-1, .p-4 {
             padding: 0 !important;
             margin: 0 !important;
             border: none !important;
             width: 100% !important;
             max-width: 100% !important;
          }
          @page {
            size: auto;
            margin: 0;
          }
          body {
            padding: 10mm !important;
          }
        }
      `}} />
    </div>
  );
}
