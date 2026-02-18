'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Truck, Plus, Search, Pencil, Trash2, X, Save } from 'lucide-react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);



  const [formData, setFormData] = useState({
    name: '',
    rif: '',
    email: '',
    phone: '',
    address: '',
    retentionISLR: 0,
    paymentTerms: 0
  });

  // Cargar datos
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ items: any[]; pagination: any }>('/suppliers');
      setSuppliers(response.items);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  // Abrir Modal (Crear o Editar)
  const handleOpen = (supplier?: any) => {
    if (supplier) {
      setEditingId(supplier.id);
      setFormData({
        name: supplier.name,
        rif: supplier.rif,
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        retentionISLR: Number(supplier.retentionISLR) || 0,
        paymentTerms: Number(supplier.paymentTerms) || 0
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', rif: '', email: '', phone: '', address: '', retentionISLR: 0, paymentTerms: 0 });
    }
    setIsModalOpen(true);
  };

  // Guardar
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingId 
        ? `/suppliers/${editingId}`
        : '/suppliers';
      
      // Sanitizar datos (convertir '' a undefined para validación backend)
      const payload: any = { ...formData };
      if (payload.email === '') delete payload.email;
      if (payload.phone === '') delete payload.phone;
      if (payload.address === '') delete payload.address;
      
      if (editingId) {
          await apiClient.patch(url, payload);
      } else {
          await apiClient.post(url, payload);
      }

      setIsModalOpen(false);
      fetchSuppliers();
      
    } catch (error: any) {
      alert(`❌ Error al guardar proveedor: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar
  const handleDelete = async (id: string) => {
    if(!confirm("¿Eliminar este proveedor?")) return;

    try {
        await apiClient.delete(`/suppliers/${id}`);
        fetchSuppliers();
    } catch (error) {
        console.error(error);
        alert("Error eliminando proveedor");
    }
  };

  // Filtrado de búsqueda
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.rif.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Truck className="text-blue-600" /> Proveedores
          </h1>
          <p className="text-gray-500 text-sm">Gestiona tus aliados comerciales</p>
        </div>
        <button onClick={() => handleOpen()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus size={18} /> Nuevo Proveedor
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input 
            type="text" placeholder="Buscar por Nombre o RIF..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 uppercase text-xs font-semibold text-gray-700">
            <tr>
              <th className="px-6 py-4">Razón Social / RIF</th>
              <th className="px-6 py-4">Contacto</th>
              <th className="px-6 py-4">Condiciones</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSuppliers.map((supplier) => (
              <tr key={supplier.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{supplier.name}</div>
                  <div className="text-xs text-blue-600 font-mono bg-blue-50 inline-block px-1 rounded mt-1">{supplier.rif}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-800">{supplier.email || '-'}</div>
                  <div className="text-xs text-gray-500">{supplier.phone}</div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded w-fit">
                            Crédito: {supplier.paymentTerms} días
                        </span>
                        {Number(supplier.retentionISLR) > 0 && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded w-fit">
                                Ret. ISLR: {supplier.retentionISLR}%
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpen(supplier)} className="p-2 text-gray-500 hover:text-blue-600"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(supplier.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredSuppliers.length === 0 && !loading && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">No se encontraron proveedores.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social *</label>
                    <input required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">RIF / ID Fiscal *</label>
                    <input required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="J-12345678-9"
                    value={formData.rif} onChange={e => setFormData({...formData, rif: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Fiscal</label>
                    <input className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                
                {/* DATOS COMERCIALES */}
                <div className="col-span-2 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Días de Crédito</label>
                        <input type="number" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0 = Contado"
                        value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">% Retención ISLR</label>
                        <input type="number" step="0.01" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: 75"
                        value={formData.retentionISLR} onChange={e => setFormData({...formData, retentionISLR: Number(e.target.value)})} />
                    </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
                  <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}