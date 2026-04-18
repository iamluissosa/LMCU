"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import {
  ArrowLeft,
  Printer,
  FileText,
  CheckCircle,
  XCircle,
  Send,
  ShoppingCart,
  Pencil,
} from "lucide-react";

interface QuoteDetail {
  id: string;
  quoteNumber: string;
  status: string;
  salesOrderId?: string | null;
  issueDate: string;
  expiresAt?: string;
  notes?: string;
  subtotal: string | number;
  exemptAmount: string | number;
  taxableAmount: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  currencyCode: string;
  exchangeRate: string | number;
  client: {
    name: string;
    rif?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  company: {
    name: string;
    rif: string;
    address: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
    settings?: { invoicePrefix: string };
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
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: {
    label: "Borrador",
    color: "bg-gray-500/10 text-gray-400 border border-gray-500/20",
  },
  SENT: {
    label: "Enviada",
    color: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  },
  ACCEPTED: {
    label: "Aceptada",
    color: "bg-green-500/10 text-green-400 border border-green-500/20",
  },
  REJECTED: {
    label: "Rechazada",
    color: "bg-red-500/10 text-red-400 border border-red-500/20",
  },
  EXPIRED: {
    label: "Vencida",
    color: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  },
  CANCELLED: {
    label: "Anulada",
    color: "bg-white/5 text-gray-500 border border-white/10",
  },
};

const fmt = (n: number | string, cur = "USD") =>
  new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
  }).format(Number(n));

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    clientId: "",
    expiresAt: "",
    currencyCode: "USD",
    exchangeRate: 1,
    notes: "",
    internalNote: "",
    items: [] as QuoteDetail["items"],
  });

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const data = await apiClient.get<QuoteDetail>(`/quotes/${params.id}`);
        setQuote(data);
      } catch (error) {
        console.error(error);
        alert("Error al cargar la cotización");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchQuote();
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = async (status: string) => {
    if (!quote) return;
    try {
      await apiClient.patch(`/quotes/${quote.id}/status`, { status });
      setQuote({ ...quote, status });
    } catch (err: unknown) {
      alert(
        `Error: ${err instanceof Error ? err.message : "No se pudo cambiar el estado"}`,
      );
    }
  };

  const handleConvertToOrder = async () => {
    if (!quote) return;
    if (!confirm("¿Generar Pedido de Venta a partir de esta Cotización?"))
      return;
    try {
      await apiClient.post(`/quotes/${quote.id}/convert`, {});
      alert("Pedido generado exitosamente.");
      router.push("/dashboard/sales/orders");
    } catch (err: unknown) {
      alert(
        `Error al generar pedido: ${err instanceof Error ? err.message : "Error desconocido"}`,
      );
    }
  };

  const startEdit = () => {
    if (!quote) return;
    setFormData({
      clientId: quote.client?.id || "",
      expiresAt: quote.expiresAt ? quote.expiresAt.split("T")[0] : "",
      currencyCode: quote.currencyCode || "USD",
      exchangeRate: Number(quote.exchangeRate) || 1,
      notes: quote.notes || "",
      internalNote: (quote as any).internalNote || "",
      items: quote.items,
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!quote) return;
    try {
      const data = await apiClient.patch(`/quotes/${quote.id}`, formData);
      setQuote(data);
      setIsEditing(false);
      alert("Cotización actualizada correctamente.");
    } catch (err: unknown) {
      alert(
        `Error al guardar: ${err instanceof Error ? err.message : "No se pudo guardar"}`,
      );
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-400">
        Cargando detalles de cotización...
      </div>
    );
  if (!quote)
    return (
      <div className="p-10 text-center text-red-500 font-bold bg-red-500/5 border border-red-500/20 rounded-xl m-10">
        Cotización no encontrada.
      </div>
    );

  const st = STATUS_CONFIG[quote.status] ?? {
    label: quote.status,
    color: "bg-white/5 text-gray-400",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:space-y-0 print:p-0">
      {/* ── ACCIONES (Oculto en impresión) ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white bg-white/5 p-2 text-sm rounded-lg border border-white/10 shadow-sm transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-bold text-white">
            Cotización N° {quote.quoteNumber}
          </h1>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.color}`}
          >
            {st.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {quote.status === "DRAFT" && !isEditing && (
            <button
              onClick={startEdit}
              className="bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Pencil size={16} /> Editar
            </button>
          )}
          {quote.status === "DRAFT" && (
            <button
              onClick={() => handleStatusChange("SENT")}
              className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Send size={16} /> Marcar Enviada
            </button>
          )}
          {(quote.status === "DRAFT" || quote.status === "SENT") && (
            <>
              <button
                onClick={() => handleStatusChange("ACCEPTED")}
                className="bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <CheckCircle size={16} /> Aceptar
              </button>
              <button
                onClick={() => handleStatusChange("REJECTED")}
                className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <XCircle size={16} /> Rechazar
              </button>
            </>
          )}

          {(quote.status === "ACCEPTED" || quote.status === "SENT") &&
            !quote.salesOrderId && (
              <button
                onClick={handleConvertToOrder}
                className="bg-green-600 text-white hover:bg-green-500 px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-green-600/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
              >
                <ShoppingCart size={16} /> Generar Pedido
              </button>
            )}

          <button
            onClick={handlePrint}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Printer size={16} /> Imprimir / PDF
          </button>
          {isEditing && (
            <>
              <button
                onClick={saveEdit}
                className="bg-green-600 text-white hover:bg-green-500 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <CheckCircle size={16} /> Guardar
              </button>
              <button
                onClick={cancelEdit}
                className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <XCircle size={16} /> Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── DOCUMENTO IMPRIMIBLE ── */}
      <div className="bg-[#1A1F2C] rounded-2xl shadow-xl border border-white/10 print:bg-white print:text-black print:shadow-none print:border-none print:m-0 print:p-0 overflow-hidden">
        <div className="p-8 md:p-12 print:p-0">
          {/* Encabezado: Empresa y Logo */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10 border-b border-white/10 pb-8 print:border-b-2 print:border-gray-800">
            <div className="flex gap-6 items-center">
              {quote.company?.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={quote.company.logoUrl}
                  alt="Logo"
                  className="w-24 h-24 object-contain brightness-110 filter invert print:invert-0"
                  transition-all
                />
              ) : (
                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gray-500 print:bg-gray-100">
                  <FileText size={32} />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-wide print:text-gray-800">
                  {quote.company?.name || "EMPRESA DEMO"}
                </h2>
                <div className="text-sm text-gray-400 space-y-0.5 mt-1 print:text-gray-600">
                  <p>
                    <span className="font-semibold text-gray-300 print:text-gray-700">
                      RIF:
                    </span>{" "}
                    {quote.company?.rif}
                  </p>
                  <p className="max-w-xs">{quote.company?.address}</p>
                  {quote.company?.phone && <p>Telf: {quote.company.phone}</p>}
                  {quote.company?.email && <p>Email: {quote.company.email}</p>}
                </div>
              </div>
            </div>

            <div className="text-right">
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 print:text-gray-800">
                COTIZACIÓN
              </h1>
              <p className="text-xl font-mono font-semibold text-blue-400">
                {quote.quoteNumber}
              </p>

              <div className="mt-4 text-sm text-gray-400 space-y-1 print:text-gray-600">
                <p>
                  <span className="font-semibold text-gray-300 print:text-gray-700">
                    Fecha Emisión:
                  </span>{" "}
                  {new Date(quote.issueDate).toLocaleDateString("es-VE")}
                </p>
                {quote.expiresAt && (
                  <p>
                    <span className="font-semibold text-red-400">
                      Válida hasta:
                    </span>{" "}
                    {new Date(quote.expiresAt).toLocaleDateString("es-VE")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
            <div>
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 border-b border-white/10 pb-1 print:text-gray-400 print:border-gray-300">
                Cotizado a:
              </h3>
              <p className="font-bold text-white text-lg uppercase print:text-gray-800">
                {quote.client.name}
              </p>
              <div className="text-sm text-gray-400 space-y-0.5 mt-2 print:text-gray-600">
                <p>
                  <span className="font-medium text-gray-300 print:text-gray-700">
                    Identificación (RIF/CI):
                  </span>{" "}
                  {quote.client.rif || "N/A"}
                </p>
                {quote.client.address && (
                  <p>
                    <span className="font-medium text-gray-300 print:text-gray-700">
                      Dirección:
                    </span>{" "}
                    {quote.client.address}
                  </p>
                )}
                {quote.client.phone && (
                  <p>
                    <span className="font-medium text-gray-300 print:text-gray-700">
                      Teléfono:
                    </span>{" "}
                    {quote.client.phone}
                  </p>
                )}
                {quote.client.email && (
                  <p>
                    <span className="font-medium text-gray-300 print:text-gray-700">
                      Correo:
                    </span>{" "}
                    {quote.client.email}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10 print:bg-transparent print:border-gray-300 print:rounded-none">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 border-b border-white/10 pb-1 print:text-gray-400 print:border-gray-300">
                Información Comercial:
              </h3>
              <div className="text-sm space-y-1.5 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Moneda Base:</span>
                  <span className="font-semibold text-white print:text-gray-800">
                    {quote.currencyCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Tasa de Cambio (Referencial):
                  </span>
                  <span className="font-mono text-white print:text-gray-800">
                    1 {quote.currencyCode} ={" "}
                    {Number(quote.exchangeRate).toLocaleString("es-VE")} VES
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Condición de Pago:</span>
                  <span className="text-gray-300 print:text-gray-800">
                    Contado (Sujeto a aprobación)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Ítems */}
          <div className="mb-8 border border-white/10 rounded-xl overflow-hidden print:border-none print:rounded-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/10 text-white print:bg-gray-200 print:text-black print:border-b-2 print:border-black">
                  <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider text-[10px] w-[10%]">
                    Código
                  </th>
                  <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider text-[10px] w-[40%]">
                    Descripción
                  </th>
                  <th className="py-2.5 px-4 text-center font-bold uppercase tracking-wider text-[10px] w-[10%]">
                    Cantidad
                  </th>
                  <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider text-[10px] w-[15%]">
                    Precio Unit.
                  </th>
                  <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider text-[10px] w-[15%]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-gray-300">
                {quote.items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`${idx % 2 === 0 ? "bg-white/2" : "bg-white/0"} hover:bg-white/5 transition-colors print:bg-white`}
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                      {item.product?.code || "SRV"}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-white uppercase print:text-gray-800">
                        {item.product?.name || item.serviceCategory?.name}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-300 print:text-black">
                      {Number(item.quantity).toLocaleString("es-VE")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-gray-400 print:text-gray-600">
                      {fmt(item.unitPrice, quote.currencyCode)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-white print:text-gray-800">
                      {fmt(item.totalLine, quote.currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales y Observaciones */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 pb-5">
            <div className="w-full md:w-1/2">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 border-b border-white/10 pb-1 print:text-gray-400 print:border-gray-300">
                Observaciones / Términos:
              </h3>
              <p className="text-sm text-gray-400 whitespace-pre-line italic print:text-gray-600 font-medium">
                {quote.notes ||
                  "Cotización sujeta a disponibilidad de inventario. Precios sujetos a cambio sin previo aviso. Los cheques deben ser emitidos a nombre de la empresa."}
              </p>
            </div>

            <div className="w-full md:w-[35%] bg-white/5 p-4 rounded-xl border border-white/10 print:bg-transparent print:border-none print:p-0">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-400 print:text-gray-600">
                  <span>Subtotal Exento</span>
                  <span className="font-mono">
                    {fmt(quote.exemptAmount, quote.currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400 print:text-gray-600">
                  <span>Base Imponible</span>
                  <span className="font-mono">
                    {fmt(quote.taxableAmount, quote.currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400 print:text-gray-600">
                  <span>IVA</span>
                  <span className="font-mono border-b border-white/10 pb-2 print:border-gray-300">
                    {fmt(quote.taxAmount, quote.currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between text-white font-black text-xl pt-1 print:text-black">
                  <span>TOTAL</span>
                  <span className="font-mono text-blue-400 print:text-black">
                    {fmt(quote.totalAmount, quote.currencyCode)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer PDF */}
          <div className="hidden print:block fixed bottom-0 left-0 w-full text-center text-xs text-gray-400 border-t pt-2">
            Generado por ERP LMCU Enterprise - Cotización N° {quote.quoteNumber}{" "}
            - Página 1 de 1
          </div>
        </div>
      </div>

      {/* ── ESTILOS GLOBALES PARA IMPRESIÓN (HIDE SIDEBAR) ── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          title { display: none; }
          html, body {
            background-color: white !important;
            height: 100%;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Ocultar barra lateral, header superior si los hubiera (probablemente tengan estas clases o similares) */
          aside, nav, header {
            display: none !important;
          }
          /* Ajustar container principal para que ocupe todo */
          main, #root, .flex-1, .p-4 {
             padding: 0 !important;
             margin: 0 !important;
             border: none !important;
             width: 100% !important;
             max-width: 100% !important;
          }
          @page {
            size: auto;
            margin: 0; /* Esto elimina la URL y la fecha del navegador */
          }
          body {
            padding: 10mm !important; /* Movemos el margen al contenido para no pegarlo al borde */
          }
        }
      `,
        }}
      />
    </div>
  );
}
