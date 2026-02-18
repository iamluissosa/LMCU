'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  PackageCheck, ClipboardCheck
} from 'lucide-react';
import Link from 'next/link';

export default function ReceptionsPage() {
  const [activeStep, setActiveStep] = useState(1); // 1: Seleccionar PO, 2: Verificar Cantidades
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [receptionItems, setReceptionItems] = useState<any[]>([]); // Lo que vamos a recibir
  const [loading, setLoading] = useState(false);


  // Cargar Órdenes Pendientes
  useEffect(() => {
    const fetchOrders = async () => {
      // Aquí deberías tener un endpoint que filtre por status != RECEIVED
      // Por ahora simulo trayendo todas y filtrando en front
      try {
        const response = await apiClient.get<{ items: any[]; pagination: any }>('/purchase-orders');
        // Solo mostramos las que se pueden recibir
        if (response.items) {
           setOrders(response.items.filter((o: any) => o.status === 'OPEN' || o.status === 'PARTIALLY_RECEIVED'));
        }
      } catch (error) {
         console.error(error);
      }
    };
    fetchOrders();
  }, []);

  // Paso 1 -> Paso 2: Preparar Items
  const handleSelectOrder = async (orderSummary: any) => {
    // Fetch detalle completo para obtener los items y productos
    try {
        const order = await apiClient.get<any>(`/purchase-orders/${orderSummary.id}`);
        
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

        const itemsToReceive = order.items.map((item: any) => ({
            productId: item.productId,
            productName: item.product?.name || 'Producto desconocido',
            ordered: item.quantityOrdered,
            receivedSoFar: item.quantityReceived,
            quantity: item.quantityOrdered - item.quantityReceived // Sugerimos el restante
        })).filter((i: any) => i.quantity > 0); // Solo mostramos lo pendiente

        setReceptionItems(itemsToReceive);
        setActiveStep(2);

    } catch(err) {
        console.error(err);
        alert('Error de conexión / carga');
    }
  };

  // Guardar Recepción
  const handleSubmit = async () => {
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
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <PackageCheck className="text-blue-600" /> Recepción de Mercancía
      </h1>

      {/* PASO 1: SELECCIONAR ORDEN */}
      {activeStep === 1 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Seleccione Orden de Compra</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.length === 0 ? <p className="text-gray-500">No hay órdenes pendientes.</p> : 
             orders.map((order) => (
              <div key={order.id} className="border p-4 rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
                   onClick={() => handleSelectOrder(order)}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-800">{order.orderNumber}</span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">{order.status}</span>
                </div>
                <p className="text-sm text-gray-600">{order.supplier.name}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PASO 2: CONTEO FÍSICO */}
      {activeStep === 2 && selectedOrder && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Recibiendo Orden {selectedOrder.orderNumber}</h2>
              <p className="text-sm text-gray-500">Proveedor: {selectedOrder.supplier.name}</p>
            </div>
            <button onClick={() => setActiveStep(1)} className="text-sm text-gray-500 hover:text-gray-700">Cambiar Orden</button>
          </div>

          <table className="w-full text-sm text-left text-gray-600 mb-6">
            <thead className="bg-gray-50 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3 text-center">Pedido</th>
                <th className="px-4 py-3 text-center">Pendiente</th>
                <th className="px-4 py-3 w-32">Cantidad Recibida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receptionItems.map((item, idx) => (
                <tr key={item.productId}>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.productName}</td>
                  <td className="px-4 py-3 text-center">{Number(item.ordered)}</td>
                  <td className="px-4 py-3 text-center bg-yellow-50 text-yellow-700 font-bold">
                    {Number(item.ordered) - Number(item.receivedSoFar)}
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number" 
                      className="w-full border-2 border-blue-100 rounded p-1 text-center font-bold text-blue-600 focus:border-blue-500 outline-none"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...receptionItems];
                        newItems[idx].quantity = e.target.value;
                        setReceptionItems(newItems);
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