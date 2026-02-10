'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, Plus, Pencil, Trash2, X, Save, UserCircle, Briefcase } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]); // Para el Dropdown
  const [loading, setLoading] = useState(true);
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    companyId: '' // Aquí guardaremos el ID de la empresa seleccionada
  });

  // 1. Cargar Usuarios y Compañías al inicio
  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const headers = { Authorization: `Bearer ${session.access_token}` };

    try {
      // Llamada paralela (Más rápido)
      const [resUsers, resCompanies] = await Promise.all([
        fetch('http://localhost:3001/users', { headers }),
        fetch('http://localhost:3001/companies', { headers })
      ]);

      if (resUsers.ok) setUsers(await resUsers.json());
      if (resCompanies.ok) setCompanies(await resCompanies.json());
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 2. Abrir Modal (Crear o Editar)
  const handleOpen = (user?: any) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        name: user.name || '',
        email: user.email,
        password: '', // No mostramos el password viejo por seguridad
        role: user.role,
        companyId: user.companyId || ''
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', email: '', password: '', role: 'USER', companyId: '' });
    }
    setIsModalOpen(true);
  };

  // 3. Guardar Cambios
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const url = editingId 
        ? `http://localhost:3001/users/${editingId}`
        : 'http://localhost:3001/users';
      
      const method = editingId ? 'PATCH' : 'POST';

      // Si no escriben password al editar, lo quitamos para no sobrescribirlo vacío
      const payload: any = { ...formData };
      if (editingId && !payload.password) delete payload.password;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Error al guardar');

      setIsModalOpen(false);
      fetchData(); // Recargar tabla
      alert('✅ Usuario guardado correctamente');

    } catch (error) {
      alert('❌ Error al procesar usuario');
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Borrar Usuario
  const handleDelete = async (id: string) => {
    if(!confirm("¿Seguro que quieres eliminar este usuario?")) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`http://localhost:3001/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
    });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-blue-600" /> Gestión de Usuarios
          </h1>
          <p className="text-gray-500 text-sm">Administra roles y asigna empresas</p>
        </div>
        <button onClick={() => handleOpen()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus size={18} /> Crear Usuario
        </button>
      </div>

      {/* TABLA DE USUARIOS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-900 font-semibold uppercase text-xs border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Rol</th>
              <th className="px-6 py-4">Empresa Asignada</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
                        <UserCircle size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                    {user.company ? (
                        <span className="flex items-center gap-2 text-gray-700 font-medium">
                            <Briefcase size={14} className="text-gray-400"/> {user.company.name}
                        </span>
                    ) : (
                        <span className="text-red-400 text-xs italic">Sin Asignar</span>
                    )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpen(user)} className="p-2 text-gray-500 hover:text-blue-600 transition-colors">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(user.id)} className="p-2 text-gray-500 hover:text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">
                {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input required type="email" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              {!editingId && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                    <input required type="password" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                        <option value="USER">Usuario (Vendedor)</option>
                        <option value="ADMIN">Administrador</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a Empresa</label>
                    <select className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.companyId} onChange={e => setFormData({...formData, companyId: e.target.value})}>
                        <option value="">-- Seleccionar --</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.rif})</option>
                        ))}
                    </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
                  <Save size={18} /> Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}