'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { 
  Save, Trash2, Plus, ChevronLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';


export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Datos
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);


  
  const [formData, setFormData] = useState({
    supplierId: '',
    notes: '',
    currencyCode: 'USD',
    exchangeRate: 1,
  });

  const [items, setItems] = useState<any[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      // Cargar Proveedores
      try {
        const response = await apiClient.get<{ items: any[]; pagination: any }>('/suppliers');
        if (response.items && Array.isArray(response.items)) setSuppliers(response.items);
        else console.error('Proveedores no es un array:', response);
      } catch (err) {
         console.error('Error de red proveedores:', err);
      }

      // Cargar Productos (P-02: Respuesta paginada)
      try {
        const response = await apiClient.get<{ items: any[]; pagination: any }>('/products');
        setProducts(response.items || []);
      } catch (err) {
        console.error('Error de red productos:', err);
      }

    };
    fetchData();
  }, []);

  const addItem = () => {
    setItems([...items, { productId: '', quantityOrdered: 1, unitPrice: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Si cambia el producto, actualizar precio unitario base
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        // Asumimos que el precio base es el costo o precio de compra estimado
        // Ojo: product.priceBase suele ser venta. Deberíamos tener cost. 
        // Por ahora usamos 0 o el usuario lo llena.
        newItems[index].unitPrice = 0; 
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

      await apiClient.post('/purchase-orders', payload);
      window.location.href = '/dashboard/purchase-orders';

    } catch (error: any) {
      console.error('Error al crear orden:', JSON.stringify(error, null, 2));
      const responseMsg = error.response?.data?.message;
      const errorMessage = responseMsg 
        ? (Array.isArray(responseMsg) ? responseMsg.join('\n') : responseMsg)
        : (error.message || 'Error desconocido al crear la orden');
      
      alert(`❌ Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // --- MODAL CREAR PRODUCTO ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', code: '', description: '', price: 0 });

  const handleOpenProductModal = (index: number) => {
    setActiveRowIndex(index);
    setNewProduct({ name: '', code: '', description: '', price: 0 });
    setIsProductModalOpen(true);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
        const created = await apiClient.post<any>('/products', {
            name: newProduct.name,
            code: newProduct.code,
            description: newProduct.description,
            priceBase: Number(newProduct.price),
            // costAverage se actualizará con la compra, iniciamos en 0
        });

        // Agregar a la lista local
        setProducts([...products, created]);
        
        // Seleccionar en la fila activa
        if (activeRowIndex !== null) {
            updateItem(activeRowIndex, 'productId', created.id);
        }
        
        setIsProductModalOpen(false);
    } catch (error) {
        console.error(error);
        alert('Error creando producto / de conexión');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchase-orders" className="text-gray-500 hover:text-gray-800">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Nueva Orden de Compra</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CABECERA */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
            <select 
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.supplierId}
              onChange={e => setFormData({...formData, supplierId: e.target.value})}
            >
              <option value="">Seleccione...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rif})</option>)}
            </select>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
             <select 
               className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
               value={formData.currencyCode}
               onChange={e => setFormData({...formData, currencyCode: e.target.value})}
             >
               <option value="USD">USD ($)</option>
               <option value="VES">Bolívares (Bs)</option>
               <option value="EUR">Euros (€)</option>
             </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Observaciones</label>
            <textarea 
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
        </div>

        {/* ITEMS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Productos</h3>
            <button type="button" onClick={addItem} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
              <Plus size={16} /> Agregar Item
            </button>
          </div>

          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 uppercase text-xs font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-2">Producto</th>
                <th className="px-4 py-2 w-24">Cant.</th>
                <th className="px-4 py-2 w-32">Costo Unit.</th>
                <th className="px-4 py-2 w-32 text-right">Total</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                        <select 
                          required
                          className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                          value={item.productId}
                          onChange={e => updateItem(index, 'productId', e.target.value)}
                        >
                          <option value="">Seleccionar...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button type="button" onClick={() => handleOpenProductModal(index)} 
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-1.5 rounded" title="Crear Nuevo Producto">
                            <Plus size={16} />
                        </button>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" min="1" step="any" required
                      className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-center"
                      value={item.quantityOrdered}
                      onChange={e => updateItem(index, 'quantityOrdered', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" min="0" step="any" required
                      className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-right"
                      value={item.unitPrice}
                      onChange={e => updateItem(index, 'unitPrice', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {(Number(item.quantityOrdered) * Number(item.unitPrice)).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="text-center py-4 text-gray-400">No hay items agregados</td></tr>
              )}
            </tbody>
            <tfoot>
               <tr>
                 <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-800">TOTAL ESTIMADO:</td>
                 <td className="px-4 py-3 text-right font-bold text-blue-600 text-lg">
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
             <Save size={20} /> {loading ? 'Creando...' : 'Crear Orden de Compra'}
           </button>
        </div>
      </form>

      {/* MODAL NUEVO PRODUCTO */}
      {isProductModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
                  <h2 className="text-lg font-bold mb-4">Crear Nuevo Producto</h2>
                  <form onSubmit={handleCreateProduct} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium mb-1">Nombre *</label>
                          <input required className="w-full border rounded p-2"
                              value={newProduct.name}
                              onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium mb-1">Código *</label>
                              <input required className="w-full border rounded p-2"
                                  value={newProduct.code}
                                  onChange={e => setNewProduct({...newProduct, code: e.target.value})}
                              />
                          </div>
                           <div>
                              <label className="block text-sm font-medium mb-1">Precio Ref. (Venta)</label>
                              <input type="number" className="w-full border rounded p-2"
                                  value={newProduct.price}
                                  onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1">Descripción</label>
                          <textarea className="w-full border rounded p-2" rows={2}
                              value={newProduct.description}
                              onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                          />
                      </div>
                       <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                            Cancelar
                        </button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-medium">
                            Guardar Producto
                        </button>
                    </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
