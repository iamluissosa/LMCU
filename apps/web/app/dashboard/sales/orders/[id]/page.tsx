"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import {
  ArrowLeft,
  Printer,
  FileText,
  CheckCircle,
  XCircle,
  Package,
  Truck,
  Receipt
} from "lucide-react";

interface SalesOrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  orderDate: string;
  expectedDate?: string;
  notes?: string;
  internalNote?: string;
  subtotal: string | number;
  exemptAmount: string | number;
  taxableAmount: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  currencyCode: string;
  exchangeRate: string | number;
  client: {
    id: string;
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
    productId?: string;
    serviceCategoryId?: string;
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
  CONFIRMED: {
    label: "Confirmado",
    color: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  },
  PROCESSING: {
    label: "En Preparación",
    color: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  },
  SHIPPED: {
    label: "Despachado",
    color: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  },
  DELIVERED: {
    label: "Entregado",
    color: "bg-green-500/10 text-green-400 border border-green-500/20",
  },
  INVOICED: {
    label: "Facturado",
    color: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  },
  CANCELLED: {
    label: "Anulado",
    color: "bg-red-500/10 text-red-400 border border-red-500/20",
  },
};

const fmt = (n: number | string, cur = "USD") =>
  new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
  }).format(Number(n));

export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const [order, setOrder] = useState<SalesOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiClient.get<SalesOrderDetail>(`/sales-orders/${id}`);
      setOrder(data);
    } catch (error: unknown) {
      console.error("[SalesOrderDetailPage] Error al cargar:", error);
      const e = error as { message?: string };
      setErrorMsg(e.message ?? "Error desconocido al cargar el pedido.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = async (status: string) => {
    if (!order) return;
    try {
      await apiClient.patch(`/sales-orders/${order.id}/status`, { status });
      setOrder({ ...order, status });
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Error: ${e.message ?? "No se pudo cambiar el estado"}`);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-400">
        Cargando detalles del pedido...
      </div>
    );
  if (errorMsg || !order)
    return (
      <div className="p-10 text-center text-red-500 font-bold bg-red-500/5 border border-red-500/20 rounded-xl m-10 space-y-2">
        <p>Pedido no encontrado.</p>
        {errorMsg && (
          <p className="text-sm text-red-400/70 font-normal">
            Detalle: {errorMsg}
          </p>
        )}
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 font-medium transition-colors"
        >
          ← Volver
        </button>
      </div>
    );

  const st = STATUS_CONFIG[order.status] ?? {
    label: order.status,
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
            Pedido N° {order.orderNumber}
          </h1>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.color}`}
          >
            {st.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {order.status === "CONFIRMED" && (
            <button
              onClick={() => handleStatusChange("PROCESSING")}
               className="bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Package size={16} /> Preparar
            </button>
          )}

          {order.status === "PROCESSING" && (
            <button
               onClick={() => handleStatusChange("SHIPPED")}
               className="bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
               <Truck size={16} /> Despachar
            </button>
          )}

          {order.status === "SHIPPED" && (
            <button
              onClick={() => handleStatusChange("DELIVERED")}
              className="bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <CheckCircle size={16} /> Entregar
            </button>
          )}

          {order.status !== "CANCELLED" && order.status !== "INVOICED" && (
             <button
               onClick={() => handleStatusChange("CANCELLED")}
               className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
             >
               <XCircle size={16} /> Anular
             </button>
          )}

          <button
            onClick={handlePrint}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      {/* ── DOCUMENTO IMPRIMIBLE ── */}
      <div className="bg-[#1A1F2C] rounded-2xl shadow-xl border border-white/10 print:bg-white print:text-black print:shadow-none print:border-none print:m-0 print:p-0 overflow-hidden">
        <div className="p-8 md:p-12 print:p-0">
          {/* Encabezado: Empresa y Logo */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10 border-b border-white/10 pb-8 print:border-b-2 print:border-gray-800">
            <div className="flex gap-6 items-center">
              {order.company?.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={order.company.logoUrl}
                  alt="Logo"
                  className="w-24 h-24 object-contain brightness-110 filter invert print:invert-0"
                  style={{ transition: "all" }}
                />
              ) : (
                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gray-500 print:bg-gray-100">
                  <FileText size={32} />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-wide print:text-gray-800">
                  {order.company?.name || "EMPRESA DEMO"}
                </h2>
                <div className="text-sm text-gray-400 space-y-0.5 mt-1 print:text-gray-600">
                  <p>
                    <span className="font-semibold text-gray-300 print:text-gray-700">
                      RIF:
                    </span>{" "}
                    {order.company?.rif}
                  </p>
                  <p className="max-w-xs">{order.company?.address}</p>
                  {order.company?.phone && <p>Telf: {order.company.phone}</p>}
                  {order.company?.email && <p>Email: {order.company.email}</p>}
                </div>
              </div>
            </div>

            <div className="text-right">
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 print:text-gray-800">
                PEDIDO
              </h1>
              <p className="text-xl font-mono font-semibold text-blue-400">
                {order.orderNumber}
              </p>

              <div className="mt-4 text-sm text-gray-400 space-y-1 print:text-gray-600">
                <p>
                  <span className="font-semibold text-gray-300 print:text-gray-700">
                    Fecha Pedido:
                  </span>{" "}
                  {new Date(order.orderDate).toLocaleDateString("es-VE")}
                </p>
                {order.expectedDate && (
                  <p>
                    <span className="font-semibold text-gray-300 print:text-gray-700">
                      Fecha Estimada Entrega:
                    </span>{" "}
                    {new Date(order.expectedDate).toLocaleDateString("es-VE")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
            <div>
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 border-b border-white/10 pb-1 print:text-gray-400 print:border-gray-300">
                Cliente:
              </h3>
              <p className="font-bold text-white text-lg uppercase print:text-gray-800">
                {order.client.name}
              </p>
              <div className="text-sm text-gray-400 space-y-0.5 mt-2 print:text-gray-600">
                <p>
                  <span className="font-medium text-gray-300 print:text-gray-700">
                    Identificación (RIF/CI):
                  </span>{" "}
                  {order.client.rif || "N/A"}
                </p>
                {order.client.address && (
                  <p>
                    <span className="font-medium text-gray-300 print:text-gray-700">
                      Dirección:
                    </span>{" "}
                    {order.client.address}
                  </p>
                )}
                {order.client.phone && (
                  <p>
                    <span className="font-medium text-gray-300 print:text-gray-700">
                      Teléfono:
                    </span>{" "}
                    {order.client.phone}
                  </p>
                )}
                {order.client.email && (
                  <p>
                    <span className="font-medium text-gray-300 print:text-gray-700">
                      Correo:
                    </span>{" "}
                    {order.client.email}
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
                    {order.currencyCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Tasa de Cambio (Referencial):
                  </span>
                  <span className="font-mono text-white print:text-gray-800">
                    1 {order.currencyCode} ={" "}
                    {Number(order.exchangeRate).toLocaleString("es-VE")} VES
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
                {order.items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`${idx % 2 === 0 ? "bg-white/2" : "bg-white/0"} hover:bg-white/5 transition-colors print:bg-white`}
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                      {item.product?.code || "SRV"}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-white uppercase print:text-gray-800">
                         {item.product?.name || item.serviceCategory?.name || item.description}
                      </p>
                      {item.description && item.description !== item.product?.name && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-300 print:text-black">
                      {Number(item.quantity).toLocaleString("es-VE")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-gray-400 print:text-gray-600">
                      {fmt(item.unitPrice, order.currencyCode)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-white print:text-gray-800">
                      {fmt(item.totalLine, order.currencyCode)}
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
                Observaciones / Notas:
              </h3>
              <p className="text-sm text-gray-400 whitespace-pre-line italic print:text-gray-600 font-medium">
                {order.notes || "Sin observaciones."}
              </p>
            </div>

            <div className="w-full md:w-[35%] bg-white/5 p-4 rounded-xl border border-white/10 print:bg-transparent print:border-none print:p-0">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-400 print:text-gray-600">
                  <span>Subtotal Exento</span>
                  <span className="font-mono">
                    {fmt(order.exemptAmount, order.currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400 print:text-gray-600">
                  <span>Base Imponible</span>
                  <span className="font-mono">
                    {fmt(order.taxableAmount, order.currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400 print:text-gray-600">
                  <span>IVA</span>
                  <span className="font-mono border-b border-white/10 pb-2 print:border-gray-300">
                    {fmt(order.taxAmount, order.currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between text-white font-black text-xl pt-1 print:text-black">
                  <span>TOTAL</span>
                  <span className="font-mono text-blue-400 print:text-black">
                    {fmt(order.totalAmount, order.currencyCode)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer PDF */}
          <div className="hidden print:block fixed bottom-0 left-0 w-full text-center text-xs text-gray-400 border-t pt-2">
            Generado por ERP LMCU Enterprise - Pedido N° {order.orderNumber} - Página 1 de 1
          </div>
        </div>
      </div>

      {/* ── ESTILOS GLOBALES PARA IMPRESIÓN ── */}
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
      `,
        }}
      />
    </div>
  );
}
