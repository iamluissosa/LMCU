'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShoppingCart, Plus, Calendar, User, FileText, CheckCircle, Clock, XCircle, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PO_STATUS_LABELS: Record<string, string> = {
  'OPEN': 'Abierto',
  'PARTIALLY_RECEIVED': 'Parcial',
  'RECEIVED': 'Recibido',
  'CLOSED': 'Cerrado',
  'CANCELLED': 'Anulada',
};

const PO_STATUS_COLORS: Record<string, string> = {
  'OPEN': 'bg-gray-100 text-gray-700',
  'PARTIALLY_RECEIVED': 'bg-orange-100 text-orange-700',
  'RECEIVED': 'bg-green-100 text-green-700',
  'CLOSED': 'bg-gray-200 text-gray-800',
  'CANCELLED': 'bg-red-100 text-red-700',
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch('http://localhost:3001/purchase-orders', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setOrders(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart className="text-blue-600" /> Órdenes de Compra
          </h1>
          <p className="text-gray-500 text-sm">Gestiona tus abastecimientos y pedidos a proveedores</p>
        </div>
        <Link href="/dashboard/purchase-orders/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus size={18} /> Nueva Orden
        </Link>
      </div>

      {/* FILTROS */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input 
            type="text" placeholder="Buscar por Orden # o Proveedor..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LISTA DE ÓRDENES */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 uppercase text-xs font-semibold text-gray-700">
            <tr>
              <th className="px-6 py-4">Orden #</th>
              <th className="px-6 py-4">Proveedor</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Items</th>
              <th className="px-6 py-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredOrders.map((po) => (
              <tr key={po.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/dashboard/purchase-orders/${po.id}`}>
                <td className="px-6 py-4 font-bold text-gray-900">{po.orderNumber}</td>
                <td className="px-6 py-4">
                    <div className="text-gray-800 font-medium">{po.supplier?.name}</div>
                    <div className="text-xs text-gray-400">{new Date(po.createdAt).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${PO_STATUS_COLORS[po.status] || 'bg-gray-100'}`}>
                    {PO_STATUS_LABELS[po.status] || po.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                        {po._count?.items || 0}
                    </span>
                </td>
                <td className="px-6 py-4 text-right text-blue-600">
                  <ChevronRight size={18} className="inline" />
                </td>
              </tr>
            ))}
             {filteredOrders.length === 0 && !loading && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No hay órdenes de compra registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
