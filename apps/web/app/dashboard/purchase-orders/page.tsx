'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { 
  ShoppingCart, Plus, Search, Calendar, ArrowRight, ChevronRight, User, Package,
  CheckCircle, Clock, XCircle, AlertTriangle 
} from 'lucide-react';
import Link from 'next/link';

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

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ items: any[]; pagination: any }>('/purchase-orders');
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
      const data = await apiClient.get<any>(`/purchase-orders/${id}`);
      setSelectedOrder(data);
      setIsModalOpen(true);
    } catch (error) {
      console.error(error);
      alert('Error al cargar detalles de la orden');
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
              <tr key={po.id} className="hover:bg-gray-50 cursor-pointer transition-colors" 
                  onClick={() => fetchOrderDetails(po.id)}>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            
            {/* Header Modal */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        {selectedOrder.orderNumber}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${PO_STATUS_COLORS[selectedOrder.status]}`}>
                            {PO_STATUS_LABELS[selectedOrder.status]}
                        </span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Creado el {new Date(selectedOrder.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <XCircle size={24} />
                </button>
            </div>

            {/* Body Scrollable */}
            <div className="p-6 overflow-y-auto">
                {/* Info Proveedor y Notas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center gap-2">
                            <User size={14}/> Proveedor
                        </h3>
                        <div className="text-sm">
                            <p className="font-bold text-gray-800 text-lg">{selectedOrder.supplier.name}</p>
                            <p className="text-gray-600">{selectedOrder.supplier.rif}</p>
                            <p className="text-gray-500 text-xs mt-1">{selectedOrder.supplier.email}</p>
                            <p className="text-gray-500 text-xs">{selectedOrder.supplier.phone}</p>
                            <p className="text-gray-500 text-xs mt-2">{selectedOrder.supplier.address}</p>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Notas / Observaciones</h3>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-600 italic h-full">
                            {selectedOrder.notes || 'Sin notas adicionales.'}
                        </div>
                    </div>
                </div>

                {/* Tabla de Items */}
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Package size={16} /> Productos Solicitados
                </h3>
                <div className="border rounded-lg overflow-hidden mb-6">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-600">
                            <tr>
                                <th className="px-4 py-3">Código</th>
                                <th className="px-4 py-3">Producto</th>
                                <th className="px-4 py-3 text-right">Cant.</th>
                                <th className="px-4 py-3 text-right">Costo Unit.</th>
                                <th className="px-4 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {selectedOrder.items.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                        {item.product?.code || '---'}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {item.product?.name || 'Producto Eliminado'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-blue-600">
                                        {item.quantityOrdered}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600">
                                        ${Number(item.unitPrice).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-800">
                                        ${(Number(item.quantityOrdered) * Number(item.unitPrice)).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold text-gray-800">
                            <tr>
                                <td colSpan={4} className="px-4 py-3 text-right uppercase text-xs">Total Orden</td>
                                <td className="px-4 py-3 text-right text-lg text-green-600">
                                    ${Number(selectedOrder.totalAmount).toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Timeline / Status Info (Visual Mockup) */}
                <div className="flex items-center gap-4 text-xs text-gray-500 border-t pt-4">
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
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} 
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium text-sm">
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
