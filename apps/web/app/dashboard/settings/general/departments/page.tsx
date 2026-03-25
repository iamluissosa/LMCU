'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export default function DepartmentsPage() {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<Department>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const data = await apiClient.get<Department[]>('/departments');
      setItems(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (item?: Department) => {
    if (item) {
      setCurrentItem({ ...item });
    } else {
      setCurrentItem({ code: '', name: '', description: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentItem({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (currentItem.id) {
        await apiClient.patch(`/departments/${currentItem.id}`, {
          name: currentItem.name,
          description: currentItem.description,
          isActive: currentItem.isActive,
        });
      } else {
        await apiClient.post('/departments', {
          code: currentItem.code,
          name: currentItem.name,
          description: currentItem.description,
        });
      }
      handleCloseModal();
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert(error?.response?.data?.message || 'Error al guardar el departamento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este departamento?')) return;
    try {
      await apiClient.delete(`/departments/${id}`);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar, es posible que esté en uso.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex justify-between items-center bg-[#1A1F2C] p-8 rounded-[2rem] shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Departamentos</h1>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2">Centros de costo y distribución de gastos</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 transition-all font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 active:scale-95"
        >
          <Plus size={20} />
          Nuevo Departamento
        </button>
      </div>

      <div className="bg-[#1A1F2C] rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500/20 border-t-blue-500 mb-4"></div>
            <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Cargando departamentos...</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-[#0B1120] text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="px-8 py-5">Código</th>
                <th className="px-8 py-5">Nombre</th>
                <th className="px-8 py-5">Descripción</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No hay departamentos registrados</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-500/5 transition-colors group">
                    <td className="px-8 py-5 font-black text-blue-400 tracking-tight">{item.code}</td>
                    <td className="px-8 py-5 font-bold text-white tracking-tight">{item.name}</td>
                    <td className="px-8 py-5 text-gray-400 font-medium">{item.description || '-'}</td>
                    <td className="px-8 py-5 flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="p-2.5 bg-[#0B1120] text-gray-500 hover:text-blue-400 hover:border-blue-500/50 border border-white/5 rounded-xl transition-all active:scale-90"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nueva/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#1A1F2C] rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 border border-white/10 animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-white tracking-tighter mb-8">
              {currentItem.id ? 'Editar Departamento' : 'Nuevo Departamento'}
            </h2>
            <form onSubmit={handleSave} className="space-y-6">
              
              {!currentItem.id && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Código del Departamento</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={currentItem.code || ''}
                    onChange={(e) => setCurrentItem({ ...currentItem, code: e.target.value.toUpperCase() })}
                    className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-bold uppercase"
                    placeholder="Ej: MKT-01, IT-01"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre del Departamento</label>
                <input
                  type="text"
                  required
                  value={currentItem.name || ''}
                  onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
                  className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-bold"
                  placeholder="Ej: Marketing, Sistemas..."
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Descripción (Opcional)</label>
                <textarea
                  value={currentItem.description || ''}
                  onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                  className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-medium"
                  rows={3}
                  placeholder="Describe brevemente el centro de costo..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 text-gray-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 active:scale-95"
                >
                  {submitting ? 'Guardando...' : 'Guardar Información'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
