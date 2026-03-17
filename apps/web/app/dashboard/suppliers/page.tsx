'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Truck, Plus, Search, Pencil, Trash2, X, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  rif: string;
  email?: string;
  phone?: string;
  address?: string;
  retentionISLR?: number | string;
  paymentTerms?: number | string;
  currencyPref?: 'USD' | 'VES' | 'MULTI';
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
    paymentTerms: 0,
    currencyPref: 'MULTI' as const,
  });

  // Cargar datos
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ items: Supplier[]; pagination: Record<string, unknown> }>('/suppliers');
      setSuppliers(response.items);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  // Abrir Modal (Crear o Editar)
  const handleOpen = (supplier?: Supplier) => {
    if (supplier) {
      setEditingId(supplier.id);
      setFormData({
        name: supplier.name,
        rif: supplier.rif,
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        retentionISLR: Number(supplier.retentionISLR) || 0,
        paymentTerms: Number(supplier.paymentTerms) || 0,
        currencyPref: supplier.currencyPref || 'MULTI'
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', rif: '', email: '', phone: '', address: '', retentionISLR: 0, paymentTerms: 0, currencyPref: 'MULTI' });
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
      const payload: Record<string, string | number | undefined> = { ...formData };
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
      
    } catch (error: unknown) {
      toast.error(`❌ Error al guardar proveedor: ${error instanceof Error ? error.message : 'Desconocido'}`);
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
        toast.error("Error eliminando proveedor");
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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="text-blue-500" /> Proveedores
          </h1>
          <p className="text-gray-400 text-sm">Gestiona tus aliados comerciales</p>
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
            className="w-full pl-10 pr-4 py-2 bg-[#1A1F2C] border border-white/10 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-lg"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* TABLA */}
      <div className="bg-[#1A1F2C] rounded-xl shadow-lg border border-white/10 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/10">
            <tr>
              <th className="px-6 py-4">Razón Social / RIF</th>
              <th className="px-6 py-4">Contacto</th>
              <th className="px-6 py-4">Condiciones</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredSuppliers.map((supplier) => (
              <tr key={supplier.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-white flex items-center gap-2">
                    {supplier.name}
                    {supplier.currencyPref === 'USD' && <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">USD</span>}
                    {supplier.currencyPref === 'VES' && <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-full">VES</span>}
                    {supplier.currencyPref === 'MULTI' && <span className="text-[9px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded-full">MULTI</span>}
                  </div>
                  <div className="text-xs text-blue-400 font-mono bg-blue-500/10 inline-block px-1 rounded mt-1 border border-blue-500/20">{supplier.rif}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-200">{supplier.email || '-'}</div>
                  <div className="text-xs text-gray-400">{supplier.phone}</div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded w-fit">
                            Crédito: {supplier.paymentTerms} días
                        </span>
                        {Number(supplier.retentionISLR) > 0 && (
                            <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded w-fit">
                                Ret. ISLR: {supplier.retentionISLR}%
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpen(supplier)} className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(supplier.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
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
          <div className="bg-[#1A1F2C] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-lg font-bold text-white">{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400 hover:text-red-400 transition-colors" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-200 mb-1">Razón Social *</label>
                    <input required className="w-full px-3 py-2 bg-[#0B1120] border border-white/10 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">RIF / ID Fiscal *</label>
                    <input required className="w-full px-3 py-2 bg-[#0B1120] border border-white/10 text-white placeholder-gray-500 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="J-12345678-9"
                    value={formData.rif} onChange={e => setFormData({...formData, rif: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">Teléfono</label>
                    <input className="w-full px-3 py-2 bg-[#0B1120] border border-white/10 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-200 mb-1">Dirección Fiscal</label>
                    <input className="w-full px-3 py-2 bg-[#0B1120] border border-white/10 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">Email</label>
                    <input type="email" className="w-full px-3 py-2 bg-[#0B1120] border border-white/10 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">Moneda Preferida *</label>
                    <select
                      className="w-full px-3 py-2 bg-[#0B1120] border border-white/10 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                      value={formData.currencyPref}
                      onChange={e => setFormData({...formData, currencyPref: e.target.value as any})}
                    >
                      <option value="MULTI">Multimoneda (USD y VES)</option>
                      <option value="USD">Solo Dólares (USD)</option>
                      <option value="VES">Solo Bolívares (VES)</option>
                    </select>
                </div>
                
                {/* DATOS COMERCIALES */}
                <div className="col-span-2 grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <div>
                        <label className="block text-sm font-medium text-gray-200 mb-1">Días de Crédito</label>
                        <input type="number" className="w-full px-3 py-2 bg-[#0B1120] border border-white/10 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="0 = Contado"
                        value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-200 mb-1">% Retención ISLR</label>
                        <input type="number" step="0.01" className="w-full px-3 py-2 bg-[#0B1120] border border-white/10 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Ej: 75"
                        value={formData.retentionISLR} onChange={e => setFormData({...formData, retentionISLR: Number(e.target.value)})} />
                    </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:bg-white/5 rounded-lg transition-colors">Cancelar</button>
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