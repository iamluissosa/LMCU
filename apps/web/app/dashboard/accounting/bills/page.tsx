'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FileText, DollarSign } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PurchaseBillsPage() {
  const [step, setStep] = useState(1);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // Datos de la Factura
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    controlNumber: '',
    issueDate: new Date().toISOString().split('T')[0]
  });
  const [billItems, setBillItems] = useState<any[]>([]);

  // 1. Cargar Órdenes con Recepciones
  useEffect(() => {
    const fetchOrders = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('http://localhost:3001/purchase-orders', { 
        headers: { Authorization: `Bearer ${session.access_token}` } 
      });
      if (res.ok) {
        const data = await res.json();
        // Filtramos solo las que tienen algo recibido (status != OPEN)
        setOrders(data.filter((o: any) => o.status === 'PARTIALLY_RECEIVED' || o.status === 'RECEIVED'));
      }
    };
    fetchOrders();
  }, []);

  // 2. Preparar la Factura basada en lo RECIBIDO
  const handleSelectOrder = async (order: any) => {
    // Necesitamos cargar los detalles COMPLETOS (items y productos)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
        const res = await fetch(`http://localhost:3001/purchase-orders/${order.id}`, { 
            headers: { Authorization: `Bearer ${session.access_token}` } 
        });
        
        if (!res.ok) throw new Error('Error cargando detalles de la orden');
        
        const fullOrder = await res.json();
        setSelectedOrder(fullOrder);
        
        // Mapeamos lo items. 
        // PRECARGAMOS: Cantidad = Lo Recibido. Precio = El de la Orden.
        // El contador puede editar el precio si varió, pero la cantidad no debería subir.
        const itemsToBill = fullOrder.items?.map((item: any) => ({
          productId: item.productId,
          productName: item.product?.name || 'Producto Desconocido',
          received: item.quantityReceived, // Límite Máximo
          quantity: item.quantityReceived, // Sugerido
          unitPrice: item.unitPrice,       // Precio pactado
          unitPrice: item.unitPrice,       // Precio pactado
          taxRate: 16,                     // Default 16%
          islrRate: 0,                     // Default 0%
        })).filter((i: any) => Number(i.received) > 0) || []; // Solo facturamos lo que llegó

        setBillItems(itemsToBill);
        setStep(2);
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar los detalles de la orden');
    }
  };

  const calculateTotal = () => {
    // Total = Suma de (Cantidad * Precio * (1 + (Tasa/100)))
    return billItems.reduce((acc, item) => {
        const subtotal = Number(item.quantity) * Number(item.unitPrice);
        const tax = subtotal * (Number(item.taxRate) / 100);
        return acc + subtotal + tax;
    }, 0);
  };

  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Calcular totales globales para la cabecera
    const totalTaxable = billItems.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.unitPrice)), 0);
    const totalTax = billItems.reduce((acc, i) => acc + ((Number(i.quantity) * Number(i.unitPrice)) * (Number(i.taxRate)/100)), 0);
    const totalAmount = totalTaxable + totalTax;

    try {
      const payload = {
        supplierId: selectedOrder.supplierId,
        purchaseOrderId: selectedOrder.id,
        ...invoiceData,
        taxableAmount: totalTaxable,
        taxAmount: totalTax,
        totalAmount: totalAmount,
        items: billItems.map(i => ({
          productId: i.productId,
          productName: i.productName,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          unitPrice: Number(i.unitPrice),
          taxRate: Number(i.taxRate), // Guardamos la tasa individual
          islrRate: Number(i.islrRate), // Guardamos la tasa ISLR
          totalLine: (Number(i.quantity) * Number(i.unitPrice)) // Subtotal línea sin iva
        }))
      };

      const res = await fetch('http://localhost:3001/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("✅ Factura registrada y conciliada correctamente.");
        window.location.reload();
      } else {
        const errorData = await res.json();
        alert(`❌ Error de Conciliación: ${errorData.message}`);
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <DollarSign className="text-green-600" /> Registro de Facturas (Cuentas por Pagar)
      </h1>

      {/* PASO 1: ELEGIR ORDEN PARA CRUZAR */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Órdenes con Recepción Pendiente de Pago</h2>
          <div className="grid gap-4">
            {orders.map((order) => (
              <div key={order.id} onClick={() => handleSelectOrder(order)}
                   className="flex justify-between items-center p-4 border rounded-lg hover:border-green-500 cursor-pointer transition-colors bg-gray-50 hover:bg-white">
                <div>
                  <div className="font-bold text-gray-800">{order.orderNumber}</div>
                  <div className="text-sm text-gray-500">{order.supplier.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full mb-1">
                    {order.status}
                  </div>
                  <div className="text-sm font-mono text-gray-600">Total Est: ${order.totalAmount}</div>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-gray-400">No hay recepciones pendientes por facturar.</p>}
          </div>
        </div>
      )}

      {/* PASO 2: INGRESAR DATOS DE FACTURA */}
      {step === 2 && selectedOrder && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-in fade-in">
          <div className="flex justify-between mb-6 border-b pb-4">
            <h2 className="text-lg font-bold text-gray-800">Facturando Orden {selectedOrder.orderNumber}</h2>
            <button onClick={() => setStep(1)} className="text-sm text-gray-500 underline">Cambiar</button>
          </div>

          {/* Datos Fiscales */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">N° Factura</label>
              <input type="text" className="w-full border rounded p-2" placeholder="Ej: 000451"
                value={invoiceData.invoiceNumber} onChange={e => setInvoiceData({...invoiceData, invoiceNumber: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">N° Control</label>
              <input type="text" className="w-full border rounded p-2" placeholder="Ej: 00-..."
                value={invoiceData.controlNumber} onChange={e => setInvoiceData({...invoiceData, controlNumber: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha Emisión</label>
              <input type="date" className="w-full border rounded p-2"
                value={invoiceData.issueDate} onChange={e => setInvoiceData({...invoiceData, issueDate: e.target.value})} />
            </div>
          </div>

          {/* Tabla de Conciliación */}
          <table className="w-full text-sm text-left mb-6">
            <thead className="bg-gray-100 uppercase text-xs">
              <tr>
                <th className="px-4 py-2">Producto</th>
                <th className="px-4 py-2 text-center">Recibido (Max)</th>
                <th className="px-4 py-2 w-32">Cant. Facturada</th>
                <th className="px-4 py-2 w-32">Precio Unit.</th>
                <th className="px-4 py-2 w-32">Alícuota IVA</th>
                <th className="px-4 py-2 w-24">Ret. ISLR %</th>
                <th className="px-4 py-2 text-right">Subtotal + IVA</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {billItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 font-medium">{item.productName}</td>
                  <td className="px-4 py-2 text-center text-gray-500 bg-gray-50">{item.received}</td>
                  <td className="px-4 py-2">
                    <input type="number" className="w-full border rounded p-1 text-center font-bold"
                      max={item.received}
                      value={item.quantity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        // Validación visual rápida
                        if(val > item.received) alert("¡No puedes facturar más de lo recibido!");
                        const newItems = [...billItems];
                        newItems[idx].quantity = val;
                        setBillItems(newItems);
                      }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" className="w-full border rounded p-1 text-right"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const newItems = [...billItems];
                        newItems[idx].unitPrice = e.target.value;
                        setBillItems(newItems);
                      }}
                    />
                  </td>
                  {/* SELECTOR DE IVA */}
                  <td className="px-4 py-2">
                     <select className="w-full border rounded p-1 text-xs"
                        value={item.taxRate}
                        onChange={(e) => {
                            const newItems = [...billItems];
                            newItems[idx].taxRate = Number(e.target.value);
                            setBillItems(newItems);
                        }}
                     >
                        <option value={16}>16% (G)</option>
                        <option value={8}>8% (R)</option>
                        <option value={31}>31% (L)</option>
                        <option value={0}>Exento (E)</option>
                     </select>
                  </td>
                  {/* RETENCION ISLR MANUAL */}
                  <td className="px-4 py-2">
                     <input type="number" className="w-full border rounded p-1 text-center"
                        value={item.islrRate}
                        onChange={(e) => {
                            const newItems = [...billItems];
                            newItems[idx].islrRate = Number(e.target.value);
                            setBillItems(newItems);
                        }}
                     />
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-800">
                    {/* Subtotal Línea + IVA Línea */}
                    ${((item.quantity * item.unitPrice) * (1 + (item.taxRate/100))).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end pt-4 border-t">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal (Base Imponible):</span>
                <span className="font-mono font-medium">${billItems.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.unitPrice)), 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Impuestos (IVA):</span>
                <span className="font-mono font-medium">${billItems.reduce((acc, i) => acc + ((Number(i.quantity) * Number(i.unitPrice)) * (Number(i.taxRate)/100)), 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xl font-bold text-gray-800 border-t pt-3">
                <span>Total a Pagar:</span>
                <span className="text-green-600">${calculateTotal().toFixed(2)}</span>
              </div>
              
              <div className="pt-4 flex justify-end">
                <button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-bold w-full justify-center">
                  <FileText size={20} /> Registrar Cuenta por Pagar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}