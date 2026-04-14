'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer, Loader2, Receipt, Building2, Calendar, CreditCard, Hash, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface ExpenseItemData {
  id: string;
  description: string;
  amount: number;
  expenseCategory?: { id: string; name: string };
  department?: { id: string; name: string; code: string };
}

interface PaymentData {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  method: string;
  bankName?: string;
  reference?: string;
  notes?: string;
  amountPaid: number;
  exchangeRate: number;
  currencyCode: string;
  isDirectExpense: boolean;
  expenseItems?: ExpenseItemData[];
  details?: {
    id: string;
    amountApplied: number;
    purchaseBill?: {
      invoiceNumber: string;
      totalAmount: number;
      supplier?: { name: string; rif: string };
    };
  }[];
  company?: {
    name: string;
    rif: string;
    address: string;
    logoUrl?: string;
  };
  event?: {
    id: string;
    name: string;
    date: string;
  };
  supplier?: {
    name: string;
    rif: string;
  };
}

const METHOD_LABELS: Record<string, string> = {
  'TRANSFER_VES': 'Transferencia Bs.',
  'TRANSFER_USD': 'Transferencia USD',
  'PAGO_MOVIL': 'Pago Móvil',
  'ZELLE': 'Zelle',
  'CASH_USD': 'Efectivo USD',
  'CASH_VES': 'Efectivo Bs.',
};

export default function PrintExpensePage() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<PaymentData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayment() {
      try {
        const payment = await apiClient.get<PaymentData>(`/payments-out/${id}`);
        setData(payment);
      } catch (e: unknown) {
        const err = e as { message?: string };
        setError(err.message || 'Error al cargar documento');
      } finally {
        setLoading(false);
      }
    }
    void fetchPayment();
  }, [id]);

  // Auto-print al cargar
  useEffect(() => {
    if (!loading && data && !error) {
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [loading, data, error]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        <h3>{error || 'No se pudo cargar el documento'}</h3>
      </div>
    );
  }

  const currencySymbol = data.currencyCode === 'VES' ? 'Bs.' : data.currencyCode === 'EUR' ? '€' : '$';
  const totalAmount = Number(data.amountPaid);
  const fm = (val: number) => val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateStr = new Date(data.paymentDate).toLocaleDateString('es-VE', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans bg-white text-black min-h-screen">
      {/* Barra de Acciones - Solo en pantalla */}
      <div className="flex justify-between items-center mb-8 print:hidden border-b pb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Receipt size={24} className="text-blue-600" />
          Comprobante de Egreso
        </h1>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg active:scale-95"
        >
          <Printer size={18} />
          Imprimir / Guardar PDF
        </button>
      </div>

      {/* COMPROBANTE PARA IMPRESIÓN */}
      <div className="border-2 border-gray-300 p-8 relative">

        {/* ═══ CABECERA EMPRESA ═══ */}
        <div className="flex items-start justify-between mb-6 pb-6 border-b-2 border-gray-200">
          <div className="flex items-start gap-4">
            {data.company?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.company.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
            )}
            <div>
              <h2 className="text-xl font-black uppercase tracking-wide">{data.company?.name || 'Empresa'}</h2>
              <p className="text-sm font-bold text-gray-600 mt-0.5">RIF: {data.company?.rif || 'N/A'}</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md">{data.company?.address || ''}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="border-2 border-black px-5 py-3 bg-gray-50 inline-block">
              <span className="text-[10px] font-bold uppercase tracking-widest block text-gray-600">Comprobante N°</span>
              <span className="font-black text-lg text-red-600 font-mono tracking-wider">{data.paymentNumber}</span>
            </div>
          </div>
        </div>

        {/* ═══ TÍTULO CENTRAL ═══ */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-gray-800">
            Comprobante de Egreso
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">
            {data.isDirectExpense ? 'Gasto Directo / Operativo' : 'Pago a Proveedor'}
          </p>
        </div>

        {/* ═══ DATOS DEL MOVIMIENTO ═══ */}
        <div className="border-2 border-black mb-6">
          <div className="bg-gray-200 border-b-2 border-black px-4 py-2">
            <h3 className="text-xs font-black uppercase tracking-widest">Datos del Movimiento Bancario</h3>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-[10px] font-bold block mb-1 text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={10} /> Fecha
              </span>
              <p className="font-bold">{dateStr}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold block mb-1 text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <CreditCard size={10} /> Método de Pago
              </span>
              <p className="font-bold">{METHOD_LABELS[data.method] || data.method}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold block mb-1 text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Building2 size={10} /> Banco / Origen
              </span>
              <p className="font-bold">{data.bankName || 'N/A'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold block mb-1 text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Hash size={10} /> Referencia
              </span>
              <p className="font-bold font-mono">{data.reference || 'N/A'}</p>
            </div>
          </div>
          {data.currencyCode !== 'USD' && Number(data.exchangeRate) > 1 && (
            <div className="px-4 pb-3 flex gap-6 text-xs border-t border-gray-100 pt-2">
              <span className="text-gray-500"><strong>Moneda:</strong> {data.currencyCode}</span>
              <span className="text-gray-500"><strong>Tasa de Cambio:</strong> {Number(data.exchangeRate).toFixed(4)}</span>
            </div>
          )}
        </div>

        {/* ═══ PROVEEDOR (si no es gasto directo) ═══ */}
        {!data.isDirectExpense && data.supplier && (
          <div className="border-2 border-black mb-6">
            <div className="bg-gray-200 border-b-2 border-black px-4 py-2">
              <h3 className="text-xs font-black uppercase tracking-widest">Datos del Proveedor</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[10px] font-bold block mb-1 text-gray-500 uppercase">Razón Social</span>
                <p className="font-black uppercase">{data.supplier.name}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold block mb-1 text-gray-500 uppercase">RIF</span>
                <p className="font-bold font-mono">{data.supplier.rif}</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ EVENTO VINCULADO ═══ */}
        {data.event && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
            <FileText size={16} className="text-blue-600" />
            <div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">Vinculado al Evento / Proyecto</span>
              <p className="font-bold text-sm text-blue-900">
                {data.event.name} — {new Date(data.event.date).toLocaleDateString('es-VE')}
              </p>
            </div>
          </div>
        )}

        {/* ═══ TABLA DE DETALLE ═══ */}
        <div className="mb-6 border-2 border-black">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border-b-2 border-r border-black p-3 text-left font-black text-[10px] uppercase tracking-widest w-8">#</th>
                {data.isDirectExpense && (
                  <>
                    <th className="border-b-2 border-r border-black p-3 text-left font-black text-[10px] uppercase tracking-widest">Categoría</th>
                    <th className="border-b-2 border-r border-black p-3 text-left font-black text-[10px] uppercase tracking-widest">Centro Costo</th>
                  </>
                )}
                <th className="border-b-2 border-r border-black p-3 text-left font-black text-[10px] uppercase tracking-widest">Descripción / Concepto</th>
                <th className="border-b-2 border-black p-3 text-right font-black text-[10px] uppercase tracking-widest w-36">Monto ({currencySymbol})</th>
              </tr>
            </thead>
            <tbody>
              {data.isDirectExpense && data.expenseItems ? (
                data.expenseItems.map((item, idx) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="border-r border-gray-200 p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                    <td className="border-r border-gray-200 p-3">
                      <span className="text-xs font-bold uppercase">{item.expenseCategory?.name || 'S/C'}</span>
                    </td>
                    <td className="border-r border-gray-200 p-3">
                      <span className="text-xs">{item.department ? `${item.department.code} - ${item.department.name}` : '—'}</span>
                    </td>
                    <td className="border-r border-gray-200 p-3 font-medium">{item.description}</td>
                    <td className="p-3 text-right font-bold font-mono">{currencySymbol} {fm(Number(item.amount))}</td>
                  </tr>
                ))
              ) : (
                data.details?.map((d, idx) => (
                  <tr key={d.id} className="border-b border-gray-200">
                    <td className="border-r border-gray-200 p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                    <td className="border-r border-gray-200 p-3 font-medium">
                      Factura #{d.purchaseBill?.invoiceNumber || 'N/A'}
                      {d.purchaseBill?.supplier && (
                        <span className="text-xs text-gray-500 block">({d.purchaseBill.supplier.name})</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold font-mono">{currencySymbol} {fm(Number(d.amountApplied))}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-black">
                <td colSpan={data.isDirectExpense ? 4 : 2} className="p-3 text-right font-black text-xs uppercase tracking-widest">
                  Total Egreso
                </td>
                <td className="p-3 text-right font-black text-lg font-mono border-l border-black">
                  {currencySymbol} {fm(totalAmount)}
                </td>
              </tr>
              {data.currencyCode !== 'VES' && Number(data.exchangeRate) > 1 && (
                <tr className="bg-gray-50">
                  <td colSpan={data.isDirectExpense ? 4 : 2} className="p-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Equivalente Bs. (Tasa: {Number(data.exchangeRate).toFixed(2)})
                  </td>
                  <td className="p-2 text-right font-bold text-sm font-mono text-gray-600 border-l border-gray-200">
                    Bs. {fm(totalAmount * Number(data.exchangeRate))}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        {/* ═══ NOTAS / OBSERVACIONES ═══ */}
        {data.notes && (
          <div className="mb-8 border border-gray-300 rounded-lg p-4 bg-gray-50">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Observaciones</span>
            <p className="text-sm text-gray-700">{data.notes}</p>
          </div>
        )}

        {/* ═══ FIRMAS ═══ */}
        <div className="flex justify-between mt-16 gap-12 max-w-2xl mx-auto pt-4">
          <div className="flex-1 text-center border-t-2 border-black pt-3">
            <p className="font-black text-xs uppercase tracking-widest">Elaborado Por</p>
            <p className="text-[10px] text-gray-500 mt-1">Nombre / Firma / Fecha</p>
          </div>
          <div className="flex-1 text-center border-t-2 border-black pt-3">
            <p className="font-black text-xs uppercase tracking-widest">Autorizado Por</p>
            <p className="text-[10px] text-gray-500 mt-1">Nombre / Firma / Fecha</p>
          </div>
          <div className="flex-1 text-center border-t-2 border-black pt-3">
            <p className="font-black text-xs uppercase tracking-widest">Recibido Por</p>
            <p className="text-[10px] text-gray-500 mt-1">Nombre / Firma / Fecha</p>
          </div>
        </div>

        {/* ═══ PIE LEGAL ═══ */}
        <div className="text-center mt-8 pt-4 border-t border-gray-200">
          <p className="text-[9px] text-gray-400 uppercase tracking-widest">
            Documento generado por el sistema ERP — {data.company?.name || ''} — {new Date().toLocaleDateString('es-VE')}
          </p>
        </div>

      </div>

      {/* ═══ CSS DE IMPRESIÓN ═══ */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: portrait; margin: 12mm; }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white;
          }
          ::-webkit-scrollbar { display: none; }
        }
      `}} />
    </div>
  );
}
