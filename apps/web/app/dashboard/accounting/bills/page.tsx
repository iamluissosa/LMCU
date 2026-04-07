'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { FileText, DollarSign } from 'lucide-react';

import { PurchaseOrder, PurchaseOrderItem } from '@erp/types';
import { useRouter } from 'next/navigation';

export default function BillsPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
// ... existing states ...
  const [orders, setOrders] = useState<PurchaseOrder[]>([]); // Tipado
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null); // Tipado
  
  // Datos de la Factura
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    controlNumber: '',
    issueDate: new Date().toISOString().split('T')[0]
  });
  
  // Interface local para items de factura en edición
  interface BillItemDraft {
      productId: string;
      productName: string;
      received: number;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      islrRate: number;
  }

  const [billItems, setBillItems] = useState<BillItemDraft[]>([]);

  // 1. Cargar Órdenes con Recepciones
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await apiClient.get<{ items: PurchaseOrder[]; pagination: unknown }>('/purchase-orders');
        // Filtramos solo las que tienen algo recibido (status != OPEN)
        setOrders(response.items.filter((o) => o.status === 'PARTIALLY_RECEIVED' || o.status === 'RECEIVED'));
      } catch (error: unknown) {
        console.error('Error fetching orders (full):', error);
        const e = error as { message?: string };
        alert(`Error: ${e.message || 'Error al cargar órdenes'}`);
      }
    };
    fetchOrders();
  }, []);

  // 2. Preparar la Factura basada en lo RECIBIDO
  const handleSelectOrder = async (order: PurchaseOrder) => {
    // Necesitamos cargar los detalles COMPLETOS (items y productos)
    try {
        const fullOrder = await apiClient.get<PurchaseOrder>(`/purchase-orders/${order.id}`);
        setSelectedOrder(fullOrder);
        
        // Mapeamos lo items. 
        // PRECARGAMOS: Cantidad = Lo Recibido. Precio = El de la Orden.
        // El contador puede editar el precio si varió, pero la cantidad no debería subir.
        const itemsToBill: BillItemDraft[] = fullOrder.items?.map((item: PurchaseOrderItem) => ({
          productId: item.productId,
          productName: item.product?.name || 'Producto Desconocido',
          received: Number(item.quantityReceived || 0), // Límite Máximo
          quantity: Number(item.quantityReceived || 0), // Sugerido
          unitPrice: Number(item.unitPrice),       // Precio pactado
          taxRate: 16,                     // Default 16%
          islrRate: 0,                     // Default 0%
        })).filter((i) => i.received > 0) || []; // Solo facturamos lo que llegó

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
    if (!selectedOrder) return;
    
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
          taxRate: Number(i.taxRate), // Guardamos la tasa individual
          islrRate: Number(i.islrRate), // Guardamos la tasa ISLR
          totalLine: (Number(i.quantity) * Number(i.unitPrice)) // Subtotal línea sin iva
        }))
      };

      await apiClient.post('/bills', payload);

      alert("✅ Factura registrada y conciliada correctamente.");
      window.location.reload();
    } catch (err: unknown) {
      console.error('Error completo:', err);
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = e.response?.data?.message || e.message || 'Error desconocido';
      alert(`❌ Error de Conciliación: ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <DollarSign className="text-green-500" /> Registro de Facturas
          </h1>
          <p className="text-sm text-gray-400 mt-1 uppercase tracking-tight font-medium">Cuentas por Pagar a Proveedores</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard/accounting/bills/direct')} 
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 transition-all"
        >
          + Nueva Compra Directa
        </button>
      </div>

      {/* PASO 1: ELEGIR ORDEN PARA CRUZAR */}
      {step === 1 && (
        <div className="bg-[#1A1F2C] p-8 rounded-2xl shadow-2xl border border-white/10">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Órdenes con Recepción Pendiente de Pago</h2>
          <div className="grid gap-4">
            {orders.map((order) => (
              <div key={order.id} onClick={() => handleSelectOrder(order)}
                   className="flex justify-between items-center p-5 border border-white/5 rounded-2xl hover:border-green-500/50 cursor-pointer transition-all bg-white/5 hover:bg-white/10 group shadow-lg shadow-black/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/10 rounded-xl text-green-400 group-hover:scale-110 transition-transform">
                    <FileText size={24} />
                  </div>
                  <div>
                    <div className="font-black text-white text-lg tracking-tight">{order.orderNumber}</div>
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-tight">{order.supplier?.name || 'Proveedor Desconocido'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-green-400 bg-green-500/10 px-3 py-1 rounded-full mb-2 uppercase tracking-widest border border-green-500/20">
                    {order.status}
                  </div>
                  <div className="text-sm font-black text-white font-mono tracking-tighter">TOTAL EST: ${order.totalAmount}</div>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="py-12 text-center">
                <FileText size={48} className="mx-auto text-gray-700 mb-4" />
                <p className="text-gray-500 font-bold">No hay recepciones pendientes por facturar.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PASO 2: INGRESAR DATOS DE FACTURA */}
      {step === 2 && selectedOrder && (
        <div className="bg-[#1A1F2C] p-8 rounded-2xl shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
            <h2 className="text-xl font-black text-white tracking-tight uppercase">Facturando Orden <span className="text-green-400 font-mono">#{selectedOrder.orderNumber}</span></h2>
            <button onClick={() => setStep(1)} className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Volver a la lista</button>
          </div>

          {/* Datos Fiscales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">N° Factura Física</label>
              <input type="text" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-green-500/50 outline-none placeholder:text-gray-600 transition-all font-mono" placeholder="Ej: 000451"
                value={invoiceData.invoiceNumber} onChange={e => setInvoiceData({...invoiceData, invoiceNumber: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">N° de Control</label>
              <input type="text" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-green-500/50 outline-none placeholder:text-gray-600 transition-all font-mono" placeholder="Ej: 00-..."
                value={invoiceData.controlNumber} onChange={e => setInvoiceData({...invoiceData, controlNumber: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Fecha de Emisión</label>
              <input type="date" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-green-500/50 outline-none transition-all color-scheme-dark"
                style={{ colorScheme: 'dark' }}
                value={invoiceData.issueDate} onChange={e => setInvoiceData({...invoiceData, issueDate: e.target.value})} />
            </div>
          </div>

          {/* Tabla de Conciliación */}
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5 shadow-inner mb-8">
            <table className="w-full text-sm text-left">
              <thead className="bg-white/5 text-[10px] uppercase text-gray-500 font-black tracking-widest">
                <tr>
                  <th className="px-5 py-4">Producto / Servicio</th>
                  <th className="px-5 py-4 text-center">Recibido (MAX)</th>
                  <th className="px-5 py-4 w-32">Cant. Facturada</th>
                  <th className="px-5 py-4 w-36">Precio Unit. ($)</th>
                  <th className="px-5 py-4 w-32">IVA (%)</th>
                  <th className="px-5 py-4 w-28 text-center">Ret. ISLR %</th>
                  <th className="px-5 py-4 text-right">Subtotal + IVA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {billItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors group">
                    <td className="px-5 py-4 font-bold text-gray-200 group-hover:text-white transition-colors">{item.productName}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="bg-white/5 text-gray-400 px-3 py-1 rounded-lg font-mono text-xs border border-white/5 group-hover:border-white/10 transition-all">
                        {item.received}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <input type="number" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-center font-black text-green-400 focus:ring-2 focus:ring-green-500/50 outline-none transition-all"
                        max={item.received}
                        value={item.quantity}
                          onChange={(e) => {
                          const val = Number(e.target.value);
                          if(val > item.received) alert("¡No puedes facturar más de lo recibido!");
                          const newItems = [...billItems];
                          if (newItems[idx]) {
                             newItems[idx].quantity = val;
                             setBillItems(newItems);
                          }
                        }}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <input type="number" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-right text-gray-200 font-mono focus:ring-2 focus:ring-green-500/50 outline-none transition-all"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const newItems = [...billItems];
                          if (newItems[idx]) {
                             newItems[idx].unitPrice = Number(e.target.value);
                             setBillItems(newItems);
                          }
                        }}
                      />
                    </td>
                    <td className="px-5 py-4">
                       <select className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:ring-2 focus:ring-green-500/50 outline-none transition-all appearance-none cursor-pointer"
                          value={item.taxRate}
                          onChange={(e) => {
                              const newItems = [...billItems];
                              if (newItems[idx]) {
                                 newItems[idx].taxRate = Number(e.target.value);
                                 setBillItems(newItems);
                              }
                          }}
                       >
                          <option value={16} className="bg-[#1A1F2C]">16% (G)</option>
                          <option value={8} className="bg-[#1A1F2C]">8% (R)</option>
                          <option value={31} className="bg-[#1A1F2C]">31% (L)</option>
                          <option value={0} className="bg-[#1A1F2C]">Exento (E)</option>
                       </select>
                    </td>
                    <td className="px-5 py-4">
                       <input type="number" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-center text-orange-400 font-bold focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
                          value={item.islrRate}
                          onChange={(e) => {
                              const newItems = [...billItems];
                              if (newItems[idx]) {
                                 newItems[idx].islrRate = Number(e.target.value);
                                 setBillItems(newItems);
                              }
                          }}
                       />
                    </td>
                    <td className="px-5 py-4 text-right font-black text-white bg-white/5 transition-all">
                      ${((item.quantity * item.unitPrice) * (1 + (item.taxRate/100))).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-8 border-t border-white/10">
            <div className="w-full max-w-sm space-y-4">
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Base Imponible</p>
                  <p className="font-mono font-black text-xl text-white">${billItems.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.unitPrice)), 0).toFixed(2)}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">IVA Estimado</p>
                  <p className="font-mono font-black text-xl text-teal-400">${billItems.reduce((acc, i) => acc + ((Number(i.quantity) * Number(i.unitPrice)) * (Number(i.taxRate)/100)), 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center p-6 bg-green-500/5 rounded-2xl border border-green-500/10 shadow-xl shadow-green-500/5">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Saldo Total a Pagar</span>
                <span className="text-4xl font-black text-green-400 tracking-tighter">${calculateTotal().toFixed(2)}</span>
              </div>
              
              <div className="pt-6">
                <button onClick={handleSubmit} className="bg-green-600 hover:bg-green-500 text-white p-5 rounded-2xl flex items-center gap-3 font-black uppercase tracking-widest text-xs w-full justify-center shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <FileText size={22} /> Registrar Cuenta por Pagar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}