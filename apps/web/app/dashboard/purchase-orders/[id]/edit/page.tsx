'use client';
import { useEffect, useState, use } from 'react';
import { apiClient } from '@/lib/api-client';
import { 
  Save, Trash2, Plus, ChevronLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Supplier {
  id: string;
  name: string;
  rif: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
  priceBase?: number;
}

interface OrderItemInput {
  productId: string;
  quantityOrdered: number | string;
  unitPrice: number | string;
}

export default function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  // Desempaquetar params usando React.use()
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // Datos maestros
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);


  
  const [formData, setFormData] = useState({
    supplierId: '',
    notes: '',
    currencyCode: 'USD',
    exchangeRate: 1,
    status: 'OPEN',
  });

  const [items, setItems] = useState<OrderItemInput[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Cargar Proveedores
        const suppliersResponse = await apiClient.get<{ items: Supplier[]; pagination: Record<string, unknown> }>('/suppliers');
        if (suppliersResponse.items) setSuppliers(suppliersResponse.items);

        // 2. Cargar Productos
        const productsData = await apiClient.get<{ items: Product[]; pagination: Record<string, unknown> } | Product[]>('/products');
        if (Array.isArray(productsData)) {
            setProducts(productsData);
        } else if (productsData && 'items' in productsData && Array.isArray(productsData.items)) {
            setProducts(productsData.items);
        }

        // 3. Cargar Orden
        const order = await apiClient.get<{
            supplierId: string, notes: string, currencyCode: string, exchangeRate: number, status: string,
            items: {productId: string, quantityOrdered: number, unitPrice: number}[]
        }>(`/purchase-orders/${orderId}`);
        if (order) {
            setFormData({
                supplierId: order.supplierId,
                notes: order.notes || '',
                currencyCode: order.currencyCode || 'USD',
                exchangeRate: Number(order.exchangeRate) || 1,
                status: order.status,
            });
            
            // Mapear items
            if (Array.isArray(order.items)) {
                setItems(order.items.map((i) => ({
                    productId: i.productId,
                    quantityOrdered: Number(i.quantityOrdered),
                    unitPrice: Number(i.unitPrice)
                })));
            }
        } else {
            alert('Error cargando la orden');
            router.push('/dashboard/purchase-orders');
        }

      } catch (err) {
         console.error('Error de red:', err);
         router.push('/dashboard/purchase-orders');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [orderId, router]);

  const addItem = () => {
    setItems([...items, { productId: '', quantityOrdered: 1, unitPrice: 0 }]);
  };

  const updateItem = (index: number, field: keyof OrderItemInput, value: string | number) => {
    const newItems = [...items];
    const row = newItems[index];
    if (!row) return;

    if (field === 'productId') {
        row.productId = String(value);
    } else if (field === 'quantityOrdered') {
        row.quantityOrdered = Number(value);
    } else if (field === 'unitPrice') {
        row.unitPrice = Number(value);
    }
    
    // Si cambia el producto, actualizar precio unitario si es necesario (opcional)
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        row.unitPrice = 0; // O traer el costo anterior si existiera historial
      }
    }
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((acc, item) => acc + (Number(item.quantityOrdered) * Number(item.unitPrice)), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) return alert('Selecciona un proveedor');
    if (items.length === 0) return alert('Agrega al menos un producto');

    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        items: items.map(item => ({
          productId: item.productId,
          quantityOrdered: Number(item.quantityOrdered),
          unitPrice: Number(item.unitPrice)
        }))
      };

      await apiClient.patch(`/purchase-orders/${orderId}`, payload);
      window.location.href = '/dashboard/purchase-orders';

    } catch (error: unknown) {
      console.error(error);
      const err = error as { message?: string | string[] };
      const errorMessage = Array.isArray(err.message) 
        ? err.message.join('\n') 
        : (err.message || 'Error al actualizar la orden');
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
      return <div className="p-8 text-center text-gray-400">Cargando orden...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchase-orders" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </Link>
        <div>
            <h1 className="text-2xl font-bold text-white">Editar Orden de Compra</h1>
            <p className="text-sm text-gray-400">Editando orden #{orderId.split('-').pop()}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CABECERA */}
        <div className="bg-[#1A1F2C] p-6 rounded-xl shadow-lg border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Proveedor *</label>
            <select 
              required
              className="w-full px-3 py-2 bg-[#0B1120] border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={formData.supplierId}
              onChange={e => setFormData({...formData, supplierId: e.target.value})}
            >
              <option value="">Seleccione...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rif})</option>)}
            </select>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-200 mb-1">Moneda</label>
             <select 
               className="w-full px-3 py-2 bg-[#0B1120] border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
               value={formData.currencyCode}
               onChange={e => setFormData({...formData, currencyCode: e.target.value})}
             >
               <option value="USD">USD ($)</option>
               <option value="VES">Bolívares (Bs)</option>
               <option value="EUR">Euros (€)</option>
             </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-200 mb-1">Notas / Observaciones</label>
            <textarea 
              className="w-full px-3 py-2 bg-[#0B1120] border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
        </div>

        {/* ITEMS */}
        <div className="bg-[#1A1F2C] p-6 rounded-xl shadow-lg border border-white/10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Productos</h3>
            <button type="button" onClick={addItem} className="text-blue-500 hover:text-blue-400 text-sm font-medium flex items-center gap-1 transition-colors">
              <Plus size={16} /> Agregar Item
            </button>
          </div>

          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/10">
              <tr>
                <th className="px-4 py-2">Producto</th>
                <th className="px-4 py-2 w-24">Cant.</th>
                <th className="px-4 py-2 w-32">Costo Unit.</th>
                <th className="px-4 py-2 w-32 text-right">Total</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item, index) => (
                <tr key={index} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2">
                    <select 
                        required
                        className="w-full px-2 py-1 bg-[#0B1120] border border-white/10 text-white rounded focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                        value={item.productId}
                        onChange={e => updateItem(index, 'productId', e.target.value)}
                    >
                        <option value="">Seleccionar...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" min="1" step="any" required
                      className="w-full px-2 py-1 bg-[#0B1120] border border-white/10 text-white rounded focus:ring-1 focus:ring-blue-500 outline-none text-center transition-all"
                      value={item.quantityOrdered}
                      onChange={e => updateItem(index, 'quantityOrdered', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" min="0" step="any" required
                      className="w-full px-2 py-1 bg-[#0B1120] border border-white/10 text-white rounded focus:ring-1 focus:ring-blue-500 outline-none text-right transition-all"
                      value={item.unitPrice}
                      onChange={e => updateItem(index, 'unitPrice', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-white">
                    {(Number(item.quantityOrdered) * Number(item.unitPrice)).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="text-center py-4 text-gray-500">No hay items agregados</td></tr>
              )}
            </tbody>
            <tfoot className="border-t border-white/10">
               <tr>
                 <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-200">TOTAL ESTIMADO:</td>
                 <td className="px-4 py-3 text-right font-bold text-blue-400 text-lg">
                   {calculateTotal().toFixed(2)} {formData.currencyCode}
                 </td>
                 <td></td>
               </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end pt-4">
           <button 
             type="submit" 
             disabled={loading}
             className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-transform active:scale-95"
           >
             <Save size={20} /> {loading ? 'Guardando...' : 'Guardar Cambios'}
           </button>
        </div>
      </form>
    </div>
  );
}
