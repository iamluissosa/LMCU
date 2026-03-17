'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  ShoppingCart, Plus, Search, Calendar, ChevronRight, User, Package, Clock, XCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Supplier { id: string; name: string; rif?: string; email?: string; phone?: string; address?: string; }
interface OrderItem { id: string; product?: { code: string; name: string }; quantityOrdered: number; unitPrice: number; }
interface PurchaseOrder { id: string; orderNumber: string; status: string; supplier: Supplier; createdAt: string; updatedAt: string; totalAmount: number; _count?: { items: number }; notes?: string; items: OrderItem[]; }

const PO_STATUS_LABELS: Record<string, string> = {
  'OPEN': 'Abierto',
  'PARTIALLY_RECEIVED': 'Parcial',
  'RECEIVED': 'Recibido',
  'CLOSED': 'Cerrado',
  'CANCELLED': 'Anulada',
};

const PO_STATUS_COLORS: Record<string, string> = {
  'OPEN': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  'PARTIALLY_RECEIVED': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'RECEIVED': 'bg-green-500/10 text-green-400 border-green-500/20',
  'CLOSED': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  'CANCELLED': 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ items: PurchaseOrder[]; pagination: Record<string, unknown> }>('/purchase-orders');
      setOrders(response.items);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const data = await apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`);
      setSelectedOrder(data);
      setIsModalOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar detalles de la orden');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="text-blue-500" /> Órdenes de Compra
          </h1>
          <p className="text-gray-400 text-sm">Gestiona tus abastecimientos y pedidos a proveedores</p>
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
            className="w-full pl-10 pr-4 py-2 bg-[#1A1F2C] border border-white/10 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-lg"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LISTA DE ÓRDENES */}
      <div className="bg-[#1A1F2C] rounded-xl shadow-lg border border-white/10 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/10">
            <tr>
              <th className="px-6 py-4">Orden #</th>
              <th className="px-6 py-4">Proveedor</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Items</th>
              <th className="px-6 py-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredOrders.map((po) => (
              <tr key={po.id} className="hover:bg-white/5 cursor-pointer transition-colors" 
                  onClick={() => fetchOrderDetails(po.id)}>
                <td className="px-6 py-4 font-bold text-white">{po.orderNumber}</td>
                <td className="px-6 py-4">
                    <div className="text-gray-200 font-medium">{po.supplier?.name}</div>
                    <div className="text-xs text-gray-500">{new Date(po.createdAt).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${PO_STATUS_COLORS[po.status] || 'bg-white/10 text-gray-300'}`}>
                    {PO_STATUS_LABELS[po.status] || po.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                    <span className="bg-[#0B1120] border border-white/10 text-gray-300 px-2 py-1 rounded text-xs">
                        {po._count?.items || 0}
                    </span>
                </td>
                <td className="px-6 py-4 text-right text-blue-500">
                  {loadingDetails && selectedOrder?.id === po.id ? '...' : <ChevronRight size={18} className="inline" />}
                </td>
              </tr>
            ))}
             {filteredOrders.length === 0 && !loading && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No hay órdenes de compra registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DETALLE ORDEN */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1F2C] border border-white/10 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            
            {/* Header Modal */}
            <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {selectedOrder.orderNumber}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${PO_STATUS_COLORS[selectedOrder.status]}`}>
                            {PO_STATUS_LABELS[selectedOrder.status]}
                        </span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                        Creado el {new Date(selectedOrder.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-400 transition-colors">
                    <XCircle size={24} />
                </button>
            </div>

            {/* Body Scrollable */}
            <div className="p-6 overflow-y-auto">
                {/* Info Proveedor y Notas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-[#0B1120] p-4 rounded-lg border border-blue-500/20">
                        <h3 className="text-xs font-bold text-blue-400 uppercase mb-3 flex items-center gap-2">
                            <User size={14}/> Proveedor
                        </h3>
                        <div className="text-sm">
                            <p className="font-bold text-white text-lg">{selectedOrder.supplier.name}</p>
                            <p className="text-gray-300">{selectedOrder.supplier.rif}</p>
                            <p className="text-gray-400 text-xs mt-1">{selectedOrder.supplier.email}</p>
                            <p className="text-gray-400 text-xs">{selectedOrder.supplier.phone}</p>
                            <p className="text-gray-400 text-xs mt-2">{selectedOrder.supplier.address}</p>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Notas / Observaciones</h3>
                        <div className="bg-[#0B1120] p-3 rounded-lg border border-white/10 text-sm text-gray-300 italic h-full">
                            {selectedOrder.notes || 'Sin notas adicionales.'}
                        </div>
                    </div>
                </div>

                {/* Tabla de Items */}
                <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                    <Package size={16} /> Productos Solicitados
                </h3>
                <div className="border border-white/10 rounded-lg overflow-hidden mb-6">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/5 text-xs uppercase font-semibold text-gray-400 border-b border-white/10">
                            <tr>
                                <th className="px-4 py-3">Código</th>
                                <th className="px-4 py-3">Producto</th>
                                <th className="px-4 py-3 text-right">Cant.</th>
                                <th className="px-4 py-3 text-right">Costo Unit.</th>
                                <th className="px-4 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {selectedOrder.items.map((item: OrderItem) => (
                                <tr key={item.id} className="hover:bg-white/5 transition-colors text-gray-300">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                                        {item.product?.code || '---'}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-white">
                                        {item.product?.name || 'Producto Eliminado'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-blue-400">
                                        {item.quantityOrdered}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        ${Number(item.unitPrice).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-white">
                                        ${(Number(item.quantityOrdered) * Number(item.unitPrice)).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-[#0B1120] font-bold text-gray-200 border-t border-white/10">
                            <tr>
                                <td colSpan={4} className="px-4 py-3 text-right uppercase text-xs">Total Orden</td>
                                <td className="px-4 py-3 text-right text-lg text-green-400">
                                    ${Number(selectedOrder.totalAmount).toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Timeline / Status Info (Visual Mockup) */}
                <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-white/10 pt-4">
                     <div className="flex items-center gap-1">
                        <Calendar size={14}/> Creado: {new Date(selectedOrder.createdAt).toLocaleString()}
                     </div>
                     {selectedOrder.updatedAt !== selectedOrder.createdAt && (
                         <div className="flex items-center gap-1">
                            <Clock size={14}/> Actualizado: {new Date(selectedOrder.updatedAt).toLocaleString()}
                         </div>
                     )}
                </div>

            </div>

            {/* Footer Actions */}
            <div className="bg-white/5 px-6 py-4 border-t border-white/10 flex justify-end gap-3 rounded-b-xl">
                <button onClick={() => setIsModalOpen(false)} 
                    className="px-4 py-2 border border-white/20 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors font-medium text-sm">
                    Cerrar
                </button>
                {/* Aquí se podrían agregar acciones como "Recibir Orden", "Imprimir", etc. */}
                {selectedOrder.status === 'OPEN' && (
                     <Link href={`/dashboard/purchase-orders/${selectedOrder.id}/edit`} 
                         className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm flex items-center gap-2">
                        Editar Orden
                     </Link>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
