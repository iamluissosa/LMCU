'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { 
  Package, Search, Plus, RefreshCw, X, Save, 
  Pencil, Trash2 
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  code: string;
  name: string;
  priceBase: number | string;
  currentStock: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  


  // Estados del Modal y Edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Formulario
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    priceBase: '',
    currentStock: ''
  });

  // --- 1. CARGAR PRODUCTOS ---
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ items: Product[]; pagination: Record<string, unknown> }>('/products');
      setProducts(response.items || []);
    } catch (err: unknown) {
      console.error('Error fetching products (full):', err);
      toast.error(`Error: ${err instanceof Error ? err.message : 'Error al cargar inventario'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // --- 2. PREPARAR EDICIÓN ---
  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      code: product.code,
      name: product.name,
      priceBase: product.priceBase.toString(),
      currentStock: product.currentStock.toString()
    });
    setIsModalOpen(true);
  };

  // --- 3. ABRIR PARA CREAR ---
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ code: '', name: '', priceBase: '', currentStock: '' });
    setIsModalOpen(true);
  };

  // --- 4. GUARDAR (CREAR O EDITAR) ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Limpieza de datos (Coma a Punto)
      const cleanPrice = formData.priceBase.toString().replace(',', '.');
      const priceNumber = parseFloat(cleanPrice);
      const stockNumber = parseInt(formData.currentStock);

      if (isNaN(priceNumber)) throw new Error("Precio inválido");

      const payload = {
        code: formData.code,
        name: formData.name,
        priceBase: priceNumber,
        currentStock: stockNumber,
      };

      if (editingId) {
        await apiClient.patch(`/products/${editingId}`, payload);
      } else {
        await apiClient.post('/products', payload);
      }

      setIsModalOpen(false);
      fetchProducts();
      toast.success(editingId ? 'Producto actualizado' : 'Producto creado');

    } catch (error: unknown) {
      toast.error(`❌ Error: ${error instanceof Error ? error.message : 'Desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- 5. BORRAR PRODUCTO ---
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) return;

    try {
      await apiClient.delete(`/products/${id}`);
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error('❌ Error eliminando producto');
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="text-blue-500" /> Inventario
          </h1>
          <p className="text-gray-400 text-sm">Gestiona tus productos y existencias</p>
        </div>
        <button 
          onClick={handleOpenCreate} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="bg-[#1A1F2C] p-4 rounded-xl shadow-lg border border-white/10 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o código..." 
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={fetchProducts} className="p-2 text-gray-500 hover:text-blue-600 transition-colors">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* TABLA DE PRODUCTOS (CORREGIDA) */}
      <div className="bg-[#1A1F2C] rounded-xl shadow-lg border border-white/10 overflow-hidden">
        {products.length === 0 && !loading ? (
          <div className="p-10 text-center text-gray-500">No hay productos registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-white/5 text-gray-400 font-semibold uppercase text-xs border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4 text-right">Precio Base</th>
                  <th className="px-6 py-4 text-center">Stock</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products
                  .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((product) => (
                  <tr key={product.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-blue-400 font-medium">{product.code}</td>
                    <td className="px-6 py-4 font-medium text-gray-200">{product.name}</td>
                    <td className="px-6 py-4 text-right">${Number(product.priceBase).toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                        product.currentStock > 10 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                        product.currentStock > 0 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {product.currentStock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-green-400 text-xs">● Activo</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="p-2 text-gray-500 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1A1F2C] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-lg font-bold text-white">
                {editingId ? '✏️ Editar Producto' : '✨ Nuevo Producto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-400">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Código</label>
                <input 
                  autoFocus required type="text" 
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Nombre</label>
                <input 
                  required type="text" 
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Precio ($)</label>
                  <input 
                    required type="text" 
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={formData.priceBase}
                    onChange={e => setFormData({...formData, priceBase: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Stock</label>
                  <input 
                    required type="number" 
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={formData.currentStock}
                    onChange={e => setFormData({...formData, currentStock: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:bg-white/5 rounded-lg font-medium transition-colors">Cancelar</button>
                <button 
                  type="submit" disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : <><Save size={18} /> {editingId ? 'Actualizar' : 'Guardar'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}