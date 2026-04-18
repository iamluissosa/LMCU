"use client";
import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import {
  FileText,
  Plus,
  RefreshCw,
  XCircle,
  Send,
  Eye,
  ArrowRight,
  Copy,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QuoteFormModal from "@/components/quotes/QuoteFormModal";

// ── TIPOS ────────────────────────────────────────────────
interface Client {
  id: string;
  name: string;
  rif?: string;
}
interface Product {
  id: string;
  name: string;
  code: string;
  isService: boolean;
  priceBase: number;
}
interface ServiceCategory {
  id: string;
  name: string;
}
interface QuoteItem {
  type: "product" | "service";
  productId?: string;
  serviceCategoryId?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}
interface Quote {
  id: string;
  quoteNumber: string;
  status: string;
  issueDate: string;
  expiresAt?: string;
  totalAmount: number;
  currencyCode: string;
  client: { name: string; rif?: string };
  _count?: { items: number };
}

// ── HELPERS ──────────────────────────────────────────────
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

const fmt = (n: number, cur = "USD") =>
  new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
  }).format(n);

// ── COMPONENTE PRINCIPAL ─────────────────────────────────
export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal crear
  const [showModal, setShowModal] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  // ── CARGA ──────────────────────────────────────────────
  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filterStatus) params.set("status", filterStatus);
      const data = await apiClient.get<{ items: Quote[]; pages: number }>(
        `/quotes?${params}`,
      );
      setQuotes(data.items ?? []);
      setTotalPages(data.pages ?? 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // ── MANEJAR GUARDADO DEL MODAL ─────────────────────────
  const handleSaveNew = useCallback(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // ── CONVERTIR A PEDIDO ─────────────────────────────────
  const handleConvert = async (quoteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        "¿Convertir esta cotización en Pedido de Venta? Se validará y comprometerá el stock.",
      )
    )
      return;
    try {
      const order = await apiClient.post<{ id: string }>(
        `/quotes/${quoteId}/convert`,
        {},
      );
      alert("✅ Pedido generado correctamente.");
      router.push(`/dashboard/sales/orders/${order.id}`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Error: ${e.message ?? "No se pudo convertir"}`);
    }
  };

  // ── CAMBIAR ESTADO ─────────────────────────────────────
  const handleStatusChange = async (quoteId: string, status: string) => {
    try {
      await apiClient.patch(`/quotes/${quoteId}/status`, { status });
      fetchQuotes();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Error: ${e.message}`);
    }
  };

  // ── DUPLICAR ───────────────────────────────────────────
  const handleDuplicate = async (quoteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCopyingId(quoteId);
    try {
      const newQuote = await apiClient.post<{ id: string }>(
        `/quotes/${quoteId}/duplicate`,
        {},
      );
      router.push(`/dashboard/sales/quotes/${newQuote.id}`);
    } catch (err: unknown) {
      const error = err as { message?: string };
      alert(`Error al duplicar: ${error.message ?? "Error desconocido"}`);
      setCopyingId(null);
    }
  };

  // ── RENDER ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="text-blue-400" /> Cotizaciones
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestión del pipeline de ventas · Flujo: Cotización → Pedido →
            Factura
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus size={18} /> Nueva Cotización
        </button>
      </div>

      {/* FILTROS */}
      <div className="flex gap-2 flex-wrap">
        {["", "DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilterStatus(s);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
            }`}
          >
            {s === "" ? "Todas" : (STATUS_CONFIG[s]?.label ?? s)}
          </button>
        ))}
        <button
          onClick={fetchQuotes}
          className="ml-auto p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-[#1A1F2C] rounded-xl shadow-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-white/5 text-xs uppercase text-gray-400 font-semibold border-b border-white/10">
            <tr>
              <th className="px-5 py-3">N° Cotización</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Vence</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-center">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : quotes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500">
                  <FileText size={32} className="mx-auto mb-2 text-gray-600" />
                  <p>No hay cotizaciones. ¡Crea la primera!</p>
                </td>
              </tr>
            ) : (
              quotes.map((q) => {
                const st = STATUS_CONFIG[q.status] ?? {
                  label: q.status,
                  color: "bg-white/5 text-gray-400",
                };
                return (
                  <tr
                    key={q.id}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={() =>
                      router.push(`/dashboard/sales/quotes/${q.id}`)
                    }
                  >
                    <td className="px-5 py-3 font-mono font-semibold text-blue-400">
                      {q.quoteNumber}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-white">{q.client.name}</p>
                      <p className="text-xs text-gray-500">
                        {q.client.rif ?? "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {new Date(q.issueDate).toLocaleDateString("es-VE")}
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {q.expiresAt
                        ? new Date(q.expiresAt).toLocaleDateString("es-VE")
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-white">
                      {fmt(Number(q.totalAmount), q.currencyCode)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.color}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td
                      className="px-5 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Marcar como Enviada */}
                        {q.status === "DRAFT" && (
                          <button
                            onClick={() => handleStatusChange(q.id, "SENT")}
                            title="Marcar como Enviada"
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                          >
                            <Send size={15} />
                          </button>
                        )}
                        {/* Convertir a Pedido */}
                        {(q.status === "DRAFT" || q.status === "SENT") && (
                          <button
                            onClick={(e) => handleConvert(q.id, e)}
                            title="Convertir a Pedido de Venta"
                            className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                          >
                            <ArrowRight size={15} />
                          </button>
                        )}
                        {/* Rechazar */}
                        {(q.status === "DRAFT" || q.status === "SENT") && (
                          <button
                            onClick={() => handleStatusChange(q.id, "REJECTED")}
                            title="Rechazar"
                            className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDuplicate(q.id, e)}
                          disabled={copyingId === q.id}
                          title="Duplicar cotización"
                          className="p-1.5 text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {copyingId === q.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Copy size={15} />
                          )}
                        </button>
                        <Link
                          href={`/dashboard/sales/quotes/${q.id}`}
                          title="Ver detalle"
                          className="p-1.5 text-gray-400 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Eye size={15} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

       {/* PAGINACIÓN */}
       {totalPages > 1 && (
         <div className="flex justify-center gap-2">
           {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
             <button
               key={p}
               onClick={() => setPage(p)}
               className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === p ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"}`}
             >
               {p}
             </button>
           ))}
         </div>
       )}

       {/* ── MODAL CREAR COTIZACIÓN ─────────────────────────── */}
       <QuoteFormModal
         open={showModal}
         onClose={() => setShowModal(false)}
         onSaved={handleSaveNew}
       />
     </div>
   );
 }
