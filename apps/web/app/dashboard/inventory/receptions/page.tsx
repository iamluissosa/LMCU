'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  PackageCheck, ClipboardCheck
} from 'lucide-react';

interface OrderItem {
  productId: string;
  product?: { name: string };
  quantityOrdered: number;
  quantityReceived: number;
}

interface PurchaseOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  supplier?: { name: string };
  items?: OrderItem[];
}

interface ReceptionItem {
  productId: string;
  productName: string;
  ordered: number;
  receivedSoFar: number;
  quantity: number | string;
}

export default function ReceptionsPage() {
  const [activeStep, setActiveStep] = useState(1); // 1: Seleccionar PO, 2: Verificar Cantidades
  const [orders, setOrders] = useState<PurchaseOrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderSummary | null>(null);
  const [receptionItems, setReceptionItems] = useState<ReceptionItem[]>([]); // Lo que vamos a recibir
  const [loading, setLoading] = useState(false);


  // Cargar Órdenes Pendientes
  useEffect(() => {
    const fetchOrders = async () => {
      // Aquí deberías tener un endpoint que filtre por status != RECEIVED
      // Por ahora simulo trayendo todas y filtrando en front
      try {
        const response = await apiClient.get<{ items: PurchaseOrderSummary[]; pagination: Record<string, unknown> }>('/purchase-orders');
        // Solo mostramos las que se pueden recibir
        if (response.items) {
           setOrders(response.items.filter((o: PurchaseOrderSummary) => o.status === 'OPEN' || o.status === 'PARTIALLY_RECEIVED'));
        }
      } catch (error) {
         console.error(error);
      }
    };
    fetchOrders();
  }, []);

  // Paso 1 -> Paso 2: Preparar Items
  const handleSelectOrder = async (orderSummary: PurchaseOrderSummary) => {
    // Fetch detalle completo para obtener los items y productos
    try {
        const order = await apiClient.get<PurchaseOrderSummary>(`/purchase-orders/${orderSummary.id}`);
        
        if (!order) {
            alert('Error cargando los detalles de la orden');
            return;
        }

        setSelectedOrder(order);

        // Pre-llenamos con lo que FALTA por recibir
        if (!order.items || !Array.isArray(order.items)) {
             alert('Esta orden no tiene productos asociados.');
             return;
        }

        const itemsToReceive = order.items.map((item: OrderItem) => ({
            productId: item.productId,
            productName: item.product?.name || 'Producto desconocido',
            ordered: item.quantityOrdered,
            receivedSoFar: item.quantityReceived,
            quantity: item.quantityOrdered - item.quantityReceived // Sugerimos el restante
        })).filter((i: ReceptionItem) => Number(i.quantity) > 0); // Solo mostramos lo pendiente

        setReceptionItems(itemsToReceive);
        setActiveStep(2);

    } catch(err) {
        console.error(err);
        alert('Error de conexión / carga');
    }
  };

  // Guardar Recepción
  const handleSubmit = async () => {
    if (!selectedOrder) return;
    setLoading(true);
    
    try {
      const payload = {
        purchaseOrderId: selectedOrder.id,
        notes: "Recepción Regular",
        items: receptionItems.map(i => ({
          productId: i.productId,
          quantity: Number(i.quantity)
        }))
      };

      await apiClient.post('/receptions', payload);

      alert("✅ Mercancía recibida e inventario actualizado.");
      window.location.reload();

    } catch (e) {
      console.error(e);
      alert("❌ Error al procesar recepción");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <PackageCheck className="text-blue-500" /> Recepción de Mercancía
      </h1>

      {/* PASO 1: SELECCIONAR ORDEN */}
      {activeStep === 1 && (
        <div className="bg-[#1A1F2C] p-6 rounded-xl shadow-lg border border-white/10">
          <h2 className="text-lg font-semibold mb-4 text-white">Seleccione Orden de Compra</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.length === 0 ? <p className="text-gray-400">No hay órdenes pendientes.</p> : 
             orders.map((order) => (
              <div key={order.id} className="bg-[#0B1120] border border-white/10 p-4 rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
                   onClick={() => handleSelectOrder(order)}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-white">{order.orderNumber}</span>
                  <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-1 rounded-full">{order.status}</span>
                </div>
                <p className="text-sm text-gray-300">{order.supplier?.name || 'Desconocido'}</p>
                <p className="text-xs text-gray-500 mt-2">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PASO 2: CONTEO FÍSICO */}
      {activeStep === 2 && selectedOrder && (
        <div className="bg-[#1A1F2C] p-6 rounded-xl shadow-lg border border-white/10 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Recibiendo Orden {selectedOrder.orderNumber}</h2>
              <p className="text-sm text-gray-400">Proveedor: {selectedOrder.supplier?.name || 'Desconocido'}</p>
            </div>
            <button onClick={() => setActiveStep(1)} className="text-sm text-gray-400 hover:text-white transition-colors">Cambiar Orden</button>
          </div>

          <table className="w-full text-sm text-left text-gray-300 mb-6">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase font-semibold border-b border-white/10">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3 text-center">Pedido</th>
                <th className="px-4 py-3 text-center">Pendiente</th>
                <th className="px-4 py-3 w-32">Cantidad Recibida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {receptionItems.map((item, idx) => (
                <tr key={item.productId} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{item.productName}</td>
                  <td className="px-4 py-3 text-center">{Number(item.ordered)}</td>
                  <td className="px-4 py-3 text-center bg-yellow-500/10 text-yellow-400 font-bold">
                    {Number(item.ordered) - Number(item.receivedSoFar)}
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number" 
                      className="w-full bg-[#0B1120] border border-white/10 rounded-lg p-1 text-center font-bold text-blue-400 focus:border-blue-500 outline-none transition-all"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...receptionItems];
                        const row = newItems[idx];
                        if (row) {
                          row.quantity = e.target.value;
                          setReceptionItems(newItems);
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end gap-3">
            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-bold shadow-lg hover:shadow-xl transition-all"
            >
              {loading ? 'Procesando...' : (
                <>
                  <ClipboardCheck size={20} /> Confirmar Entrada al Almacén
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}