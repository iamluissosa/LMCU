'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  ShoppingCart, Plus, RefreshCw, XCircle, Eye,
  Truck, CheckCircle, Package, FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SalesOrder {
  id: string; orderNumber: string; status: string;
  orderDate: string; totalAmount: number; currencyCode: string;
  client: { name: string };
  _count?: { items: number };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CONFIRMED:  { label: 'Confirmado',  color: 'bg-blue-100 text-blue-700',   icon: <CheckCircle size={12} /> },
  PROCESSING: { label: 'En Proceso',  color: 'bg-yellow-100 text-yellow-700', icon: <Package size={12} /> },
  SHIPPED:    { label: 'Despachado', color: 'bg-purple-100 text-purple-700', icon: <Truck size={12} /> },
  DELIVERED:  { label: 'Entregado',  color: 'bg-green-100 text-green-700',  icon: <CheckCircle size={12} /> },
  INVOICED:   { label: 'Facturado',  color: 'bg-teal-100 text-teal-700',    icon: <FileText size={12} /> },
  CANCELLED:  { label: 'Cancelado',  color: 'bg-red-100 text-red-600',      icon: <XCircle size={12} /> },
};

const FLOW = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
const fmt = (n: number, cur = 'USD') =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(n);

export default function SalesOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pipeline, setPipeline] = useState<{ status: string; count: number; total: string }[]>([]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filterStatus) params.set('status', filterStatus);
      const [data, pipe] = await Promise.all([
        apiClient.get<{ items: SalesOrder[]; pages: number }>(`/sales-orders?${params}`),
        apiClient.get<{ status: string; count: number; total: string }[]>('/sales-orders/pipeline'),
      ]);
      setOrders(data.items ?? []);
      setTotalPages(data.pages ?? 1);
      setPipeline(Array.isArray(pipe) ? pipe : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const advanceStatus = async (orderId: string, currentStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = FLOW.indexOf(currentStatus);
    if (idx < 0 || idx >= FLOW.length - 1) return;
    const next = FLOW[idx + 1]!;
    if (!confirm(`¿Avanzar el pedido a estado "${STATUS_CONFIG[next]?.label ?? next}"?`)) return;
    try {
      await apiClient.patch(`/sales-orders/${orderId}/status`, { status: next });
      fetchOrders();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Error: ${e.message}`);
    }
  };

  const cancelOrder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('⚠️ ¿Cancelar este pedido? Se repondrá el stock comprometido.')) return;
    try {
      await apiClient.patch(`/sales-orders/${orderId}/status`, { status: 'CANCELLED' });
      fetchOrders();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Error: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart className="text-green-600" /> Pedidos de Venta
          </h1>
          <p className="text-sm text-gray-500 mt-1">Stock comprometido al confirmar · Repuesto al cancelar</p>
        </div>
        <Link href="/dashboard/sales/quotes"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm text-sm">
          <Plus size={18} /> Desde Cotización
        </Link>
      </div>

      {/* PIPELINE CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].map(st => {
          const cfg = STATUS_CONFIG[st];
          const data = pipeline.find(p => p.status === st);
          return (
            <button
              key={st}
              onClick={() => setFilterStatus(filterStatus === st ? '' : st)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                filterStatus === st ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${cfg?.color ?? 'bg-gray-100 text-gray-600'}`}>
                {cfg?.icon} {cfg?.label ?? st}
              </div>
              <p className="text-2xl font-bold text-gray-800">{data?.count ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">{fmt(Number(data?.total ?? 0))}</p>
            </button>
          );
        })}
      </div>

      {/* FILTROS */}
      <div className="flex gap-2 flex-wrap">
        {['', ...Object.keys(STATUS_CONFIG)].map(s => (
          <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {s === '' ? 'Todos' : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
        <button onClick={fetchOrders} className="ml-auto p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
            <tr>
              <th className="px-5 py-3">N° Pedido</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-center">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">Cargando...</td></tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  <ShoppingCart size={32} className="mx-auto mb-2 text-gray-300" />
                  <p>No hay pedidos{filterStatus ? ` en estado "${STATUS_CONFIG[filterStatus]?.label}"` : ''}.</p>
                </td>
              </tr>
            ) : orders.map(o => {
              const st = STATUS_CONFIG[o.status] ?? { label: o.status, color: 'bg-gray-100 text-gray-600', icon: null };
              const flowIdx = FLOW.indexOf(o.status);
              const nextStatus = flowIdx >= 0 && flowIdx < FLOW.length - 1 ? FLOW[flowIdx + 1]! : null;
              const canAdvance = nextStatus !== null;
              const canCancel = o.status !== 'CANCELLED' && o.status !== 'INVOICED';
              return (
                <tr key={o.id} className="hover:bg-green-50/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/sales/orders/${o.id}`)}>
                  <td className="px-5 py-3 font-mono font-semibold text-green-700">{o.orderNumber}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{o.client.name}</td>
                  <td className="px-5 py-3 text-gray-500">{new Date(o.orderDate).toLocaleDateString('es-VE')}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">
                    {fmt(Number(o.totalAmount), o.currencyCode)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                      {st.icon} {st.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {canAdvance && nextStatus && (
                        <button onClick={(e) => advanceStatus(o.id, o.status, e)}
                          title={`Avanzar a ${STATUS_CONFIG[nextStatus]?.label ?? nextStatus}`}
                          className="px-2 py-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-medium border border-green-200">
                          → {STATUS_CONFIG[nextStatus]?.label ?? nextStatus}
                        </button>
                      )}
                      {o.status === 'DELIVERED' && (
                        <Link href={`/dashboard/sales/invoices/new?orderId=${o.id}`}
                          className="px-2 py-1 text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg font-medium border border-teal-200">
                          Facturar
                        </Link>
                      )}
                      {canCancel && (
                        <button onClick={(e) => cancelOrder(o.id, e)}
                          title="Cancelar pedido"
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                          <XCircle size={15} />
                        </button>
                      )}
                      <Link href={`/dashboard/sales/orders/${o.id}`}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                        <Eye size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium ${page === p ? 'bg-green-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
