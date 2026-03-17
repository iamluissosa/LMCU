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
  CONFIRMED:  { label: 'Confirmado',  color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',   icon: <CheckCircle size={12} /> },
  PROCESSING: { label: 'En Proceso',  color: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20', icon: <Package size={12} /> },
  SHIPPED:    { label: 'Despachado', color: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', icon: <Truck size={12} /> },
  DELIVERED:  { label: 'Entregado',  color: 'bg-green-500/10 text-green-400 border border-green-500/20',  icon: <CheckCircle size={12} /> },
  INVOICED:   { label: 'Facturado',  color: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',    icon: <FileText size={12} /> },
  CANCELLED:  { label: 'Cancelado',  color: 'bg-white/5 text-gray-500 border border-white/10',      icon: <XCircle size={12} /> },
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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="text-green-500" /> Pedidos de Venta
          </h1>
          <p className="text-sm text-gray-400 mt-1 uppercase tracking-tight font-medium">Stock comprometido al confirmar · Repuesto al cancelar</p>
        </div>
        <Link href="/dashboard/sales/quotes"
          className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-green-500/20 text-xs">
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
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                filterStatus === st 
                  ? 'border-green-500/50 bg-green-500/10 shadow-lg shadow-green-500/5' 
                  : 'border-white/5 bg-[#1A1F2C] hover:border-white/10'
              }`}>
              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${cfg?.color ?? 'bg-white/5 text-gray-400 border border-white/10'}`}>
                {cfg?.icon} {cfg?.label ?? st}
              </div>
              <p className="text-3xl font-black text-white">{data?.count ?? 0}</p>
              <p className="text-xs text-gray-500 font-mono mt-1">{fmt(Number(data?.total ?? 0))}</p>
            </button>
          );
        })}
      </div>

      {/* FILTROS */}
      <div className="flex gap-2 flex-wrap items-center">
        {['', ...Object.keys(STATUS_CONFIG)].map(s => (
          <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              filterStatus === s 
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' 
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}>
            {s === '' ? 'Todos' : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
        <button onClick={fetchOrders} className="ml-auto p-2.5 text-gray-500 hover:bg-white/5 hover:text-white rounded-xl transition-colors border border-transparent hover:border-white/10">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-[#1A1F2C] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-white/5 text-[10px] uppercase text-gray-500 font-black tracking-widest">
            <tr>
              <th className="px-6 py-4">N° Pedido</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4 text-right">Total</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={6} className="py-20 text-center text-gray-500 font-medium">Cargando pedidos...</td></tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center text-gray-500">
                  <ShoppingCart size={40} className="mx-auto mb-4 text-gray-700" />
                  <p className="text-lg font-bold text-gray-400">No hay pedidos registrados</p>
                  <p className="text-sm text-gray-600 mt-1">{filterStatus ? `En estado "${STATUS_CONFIG[filterStatus]?.label}"` : 'Empieza creando una cotización'}.</p>
                </td>
              </tr>
            ) : orders.map(o => {
              const st = STATUS_CONFIG[o.status] ?? { label: o.status, color: 'bg-white/5 text-gray-400', icon: null };
              const flowIdx = FLOW.indexOf(o.status);
              const nextStatus = flowIdx >= 0 && flowIdx < FLOW.length - 1 ? FLOW[flowIdx + 1]! : null;
              const canAdvance = nextStatus !== null;
              const canCancel = o.status !== 'CANCELLED' && o.status !== 'INVOICED';
              return (
                <tr key={o.id} className="group hover:bg-white/5 transition-all cursor-pointer"
                  onClick={() => router.push(`/dashboard/sales/orders/${o.id}`)}>
                  <td className="px-6 py-4 font-mono font-bold text-green-400">{o.orderNumber}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-200 group-hover:text-white transition-colors">{o.client.name}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-400 font-medium">{new Date(o.orderDate).toLocaleDateString('es-VE')}</td>
                  <td className="px-6 py-4 text-right font-black text-gray-200 group-hover:text-white transition-colors">
                    {fmt(Number(o.totalAmount), o.currencyCode)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.color}`}>
                      {st.icon} {st.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canAdvance && nextStatus && (
                        <button onClick={(e) => advanceStatus(o.id, o.status, e)}
                          title={`Avanzar a ${STATUS_CONFIG[nextStatus]?.label ?? nextStatus}`}
                          className="px-3 py-1.5 text-[10px] bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-xl font-bold uppercase tracking-wider border border-green-500/20 transition-all shadow-lg shadow-green-500/5">
                          → {STATUS_CONFIG[nextStatus]?.label ?? nextStatus}
                        </button>
                      )}
                      {o.status === 'DELIVERED' && (
                        <Link href={`/dashboard/sales/invoices/new?orderId=${o.id}`}
                          className="px-3 py-1.5 text-[10px] bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-xl font-bold uppercase tracking-wider border border-teal-500/20 transition-all shadow-lg shadow-teal-500/5">
                          Facturar
                        </Link>
                      )}
                      {canCancel && (
                        <button onClick={(e) => cancelOrder(o.id, e)}
                          title="Cancelar pedido"
                          className="p-2 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20">
                          <XCircle size={16} />
                        </button>
                      )}
                      <Link href={`/dashboard/sales/orders/${o.id}`}
                        className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10">
                        <Eye size={16} />
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
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-10 h-10 rounded-xl text-xs font-bold transition-all border ${
                page === p 
                  ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-600/20' 
                  : 'bg-[#1A1F2C] border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
