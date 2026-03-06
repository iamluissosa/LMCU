'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
}

export default function ServiceCategoriesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<ServiceCategory>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const data = await apiClient.get<ServiceCategory[]>('/service-categories');
      setCategories(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (category?: ServiceCategory) => {
    if (category) {
      setCurrentCategory({ ...category });
    } else {
      setCurrentCategory({ name: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentCategory({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (currentCategory.id) {
        await apiClient.patch(`/service-categories/${currentCategory.id}`, {
          name: currentCategory.name,
          description: currentCategory.description,
        });
      } else {
        await apiClient.post('/service-categories', {
          name: currentCategory.name,
          description: currentCategory.description,
        });
      }
      handleCloseModal();
      fetchCategories();
    } catch (error) {
      console.error(error);
      alert('Error al guardar categoría de servicio');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría de servicio?')) return;
    try {
      await apiClient.delete(`/service-categories/${id}`);
      fetchCategories();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar, es posible que esté en uso.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Categorías de Servicio</h1>
          <p className="text-gray-500 text-sm mt-1">Configuración de servicios y mano de obra no inventariables</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus size={20} />
          Nueva Categoría
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                <th className="p-4 font-semibold">Nombre</th>
                <th className="p-4 font-semibold">Descripción</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">No hay categorías registradas.</td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-medium text-gray-800">{cat.name}</td>
                    <td className="p-4 text-gray-600">{cat.description || '-'}</td>
                    <td className="p-4 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(cat)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {currentCategory.id ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={currentCategory.name || ''}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Mano de Obra, Mantenimiento..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (Opcional)</label>
                <textarea
                  value={currentCategory.description || ''}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
