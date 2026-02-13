'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Settings, Save, Shield, Hash } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function GeneralSettingsPage() {
  const [activeTab, setActiveTab] = useState('correlatives');
  const [settings, setSettings] = useState<any>({});
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos
  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const headers = { Authorization: `Bearer ${session.access_token}` };

    const [resSettings, resRoles] = await Promise.all([
      fetch('http://localhost:3001/settings/general', { headers }),
      fetch('http://localhost:3001/settings/roles', { headers })
    ]);

    if (resSettings.ok) setSettings(await resSettings.json());
    if (resRoles.ok) setRoles(await resRoles.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Guardar Correlativos
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch('http://localhost:3001/settings/general', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}` 
      },
      body: JSON.stringify(settings),
    });
    alert('Configuración guardada');
  };

  // --- MODAL & PERMISSIONS ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<{id?: string, name: string, permissions: string[], companyId?: string}>({
    name: '', permissions: []
  });
  const [companies, setCompanies] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const ALL_PERMISSIONS = [
    { id: 'dashboard.view', label: 'Ver Dashboard' },
    { id: 'inventory.view', label: 'Ver Inventario' },
    { id: 'inventory.create', label: 'Crear Productos' },
    { id: 'inventory.edit', label: 'Editar Productos' },
    { id: 'inventory.delete', label: 'Eliminar Productos' },
    { id: 'receptions.view', label: 'Ver Entradas/Recepciones' },
    { id: 'receptions.create', label: 'Procesar Recepciones' },
    { id: 'purchase_orders.view', label: 'Ver Órdenes de Compra' },
    { id: 'purchase_orders.create', label: 'Crear Órdenes de Compra' },
    { id: 'purchase_orders.edit', label: 'Editar Órdenes de Compra' },
    { id: 'purchase_orders.delete', label: 'Eliminar Órdenes de Compra' },
    { id: 'bills.view', label: 'Ver Pagos de Factura' },
    { id: 'bills.create', label: 'Registrar Pagos de Factura' },
    { id: 'bills.edit', label: 'Editar Pagos de Factura' },
    { id: 'bills.delete', label: 'Eliminar Pagos de Factura' },
    { id: 'payments.view', label: 'Ver Historial de Pagos' },
    { id: 'payments.create', label: 'Registrar Egresos' },
    { id: 'suppliers.view', label: 'Ver Proveedores' },
    { id: 'suppliers.create', label: 'Crear Proveedores' },
    { id: 'suppliers.edit', label: 'Editar Proveedores' },
    { id: 'suppliers.delete', label: 'Eliminar Proveedores' },
    { id: 'users.view', label: 'Ver Usuarios' },
    { id: 'users.create', label: 'Crear Usuarios' },
    { id: 'users.edit', label: 'Editar Usuarios' },
    { id: 'users.delete', label: 'Eliminar Usuarios' },
    { id: 'companies.view', label: 'Ver Empresas' },
    { id: 'companies.create', label: 'Crear Empresas' },
    { id: 'companies.edit', label: 'Editar Empresas' },
    { id: 'settings.view', label: 'Ver Configuración' },
    { id: 'settings.edit', label: 'Editar Configuración' },
  ];

  const handleOpenModal = async (role?: any) => {
    // Verificar si es ADMIN para cargar empresas
    const { data: { session } } = await supabase.auth.getSession();
    if(session) {
        // Obtenemos info del usuario actual para saber si es ADMIN (podríamos guardarlo en estado al cargar página también)
        // Por consistencia, reutilizaremos la lógica de fetch users list tab o haremos un fetch rápido si no tenemos la info.
        // Simulamos chequeo rápido decodificando token o asumiendo que si ve el tab de roles puede ser admin? 
        // Mejor fetch de /profile o check de claims. 
        // Simplificación: si la lista de roles tiene roles de varias empresas, es admin.
        // O mejor: hacemos fetch de companies siempre si no están cargadas.
    }

    // Cargar empresas si aún no están cargadas
    if (companies.length === 0) {
        if(session) {
             const res = await fetch('http://localhost:3001/companies', { 
                headers: { Authorization: `Bearer ${session?.access_token}` }
             });
             if(res.ok) {
                 const data = await res.json();
                 setCompanies(data);
                 // Si pudo cargar compañías, asumimos que tiene permisos elevados o es que el endpoint es público (no debería)
                 // Pero para UI nos sirve. 
                 setIsAdmin(true); 
             }
        }
    }

    if (role) {
        setCurrentRole({ ...role, permissions: role.permissions || [], companyId: role.companyId });
    } else {
        setCurrentRole({ id: '', name: '', permissions: [], companyId: '' });
    }
    setIsModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    const has = currentRole.permissions.includes(permId);
    setCurrentRole(prev => ({
        ...prev,
        permissions: has 
            ? prev.permissions.filter(p => p !== permId)
            : [...prev.permissions, permId]
    }));
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch('http://localhost:3001/settings/roles' + (currentRole.id ? `/${currentRole.id}` : ''), {
      method: currentRole.id ? 'PATCH' : 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}` 
      },
      body: JSON.stringify({ 
          name: currentRole.name, 
          permissions: currentRole.permissions,
          companyId: currentRole.companyId // Enviar companyId
      }),
    });
    
    setIsModalOpen(false);
    fetchData(); 
  };

  if (loading) return <div>Cargando configuraciones...</div>;

  return (
    <div className="space-y-6 relative">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <Settings className="text-blue-600" /> Configuración del Sistema
      </h1>

      {/* TABS (Mismo código) */}
      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('correlatives')}
          className={`px-4 py-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'correlatives' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          <Hash size={16} /> Correlativos y Series
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'roles' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          <Shield size={16} /> Roles y Permisos
        </button>
        <button 
          onClick={() => setActiveTab('users_list')}
          className={`px-4 py-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'users_list' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          <Settings size={16} /> Usuarios del Sistema
        </button>
      </div>

      {/* CONTENIDO TABS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        
        {/* --- CORRELATIVOS --- */}
        {activeTab === 'correlatives' && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
             {/* ... (mismo inputs) ... */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                 <h3 className="font-semibold text-gray-700">Facturación</h3>
                 <div>
                   <label className="block text-sm text-gray-600 mb-1">Prefijo Factura</label>
                   <input type="text" className="w-full border rounded p-2" 
                     value={settings.invoicePrefix || ''}
                     onChange={e => setSettings({...settings, invoicePrefix: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-sm text-gray-600 mb-1">Próximo Número</label>
                   <input type="number" className="w-full border rounded p-2" 
                     value={settings.nextInvoiceNumber || ''}
                     onChange={e => setSettings({...settings, nextInvoiceNumber: e.target.value})}
                   />
                 </div>
               </div>
 
               <div className="space-y-4">
                 <h3 className="font-semibold text-gray-700">Inventario</h3>
                 <div>
                   <label className="block text-sm text-gray-600 mb-1">Prefijo Productos</label>
                   <input type="text" className="w-full border rounded p-2" 
                     value={settings.productPrefix || ''}
                     onChange={e => setSettings({...settings, productPrefix: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-sm text-gray-600 mb-1">Próximo Código</label>
                   <input type="number" className="w-full border rounded p-2" 
                     value={settings.nextProductCode || ''}
                     onChange={e => setSettings({...settings, nextProductCode: e.target.value})}
                   />
                 </div>
               </div>
             </div>
             <div className="pt-4 flex justify-end">
               <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                 <Save size={18} /> Guardar Cambios
               </button>
             </div>
          </form>
        )}

        {/* --- ROLES --- */}
        {activeTab === 'roles' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">Roles Definidos</h3>
              <button onClick={() => handleOpenModal()} className="text-sm bg-slate-900 text-white px-3 py-2 rounded hover:bg-slate-800">
                + Crear Rol
              </button>
            </div>
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 uppercase text-xs">
                <tr>
                  <th className="px-4 py-2">Empresa</th>
                  <th className="px-4 py-2">Rol</th>
                  <th className="px-4 py-2">Permisos</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {roles.length === 0 ? <tr><td colSpan={4} className="p-4 text-center">No hay roles personalizados.</td></tr> : 
                roles.map((rol: any) => (
                  <tr key={rol.id}>
                    <td className="px-4 py-3 text-gray-500 text-xs">{rol.company?.name || 'Local'}</td>
                    <td className="px-4 py-3 font-bold">{rol.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                          {Array.isArray(rol.permissions) && rol.permissions.map((p:string) => (
                            <span key={p} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] border border-blue-100">
                                {p}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                        <button onClick={() => handleOpenModal(rol)} className="text-blue-600 hover:text-blue-800 mr-3">Editar</button>
                        <button onClick={async () => {
                            if (!confirm('¿Eliminar rol?')) return;
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session) return;
                            await fetch(`http://localhost:3001/settings/roles/${rol.id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${session.access_token}` }
                            });
                            fetchData();
                        }} className="text-red-500 hover:text-red-700">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- USUARIOS (NUEVO) --- */}
        {activeTab === 'users_list' && (
           <UsersListTab />    
        )}
      </div>

       {/* MODAL CREAR ROL */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg">
                <h2 className="text-lg font-bold mb-4">{currentRole.id ? 'Editar Rol' : 'Crear Nuevo Rol'}</h2>
                
                <form onSubmit={handleSaveRole} className="space-y-4">
                    
                    {/* Selector de Empresa para ADMIN */}
                    {companies.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Empresa (Super Admin)</label>
                            <select 
                                className="w-full border rounded p-2"
                                value={currentRole.companyId || ''}
                                onChange={e => setCurrentRole({ ...currentRole, companyId: e.target.value })}
                                // Si es un update y ya tiene companyId, o si es create
                            >
                                <option value="">-- Seleccionar Empresa --</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Como administrador Global, debes asignar el rol a una empresa.</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre del Rol</label>
                        <input className="w-full border rounded p-2" required
                            value={currentRole.name} 
                            onChange={e => setCurrentRole({...currentRole, name: e.target.value})} 
                            placeholder="Ej: Gerente de Ventas"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Permisos de Acceso</label>
                        <div className="grid grid-cols-2 gap-2 text-sm border p-3 rounded-lg max-h-60 overflow-y-auto">
                            {ALL_PERMISSIONS.map(p => (
                                <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                    <input type="checkbox" 
                                        checked={currentRole.permissions.includes(p.id)}
                                        onChange={() => togglePermission(p.id)}
                                        className="text-blue-600 rounded"
                                    />
                                    <span>{p.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                            Cancelar
                        </button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-medium">
                            Guardar Rol
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}

// --- SUB-COMPONENT PARA USUARIOS ---
function UsersListTab() {
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null); // null = Create Mode

    // Cargar Usuarios, Roles y Empresas
    const fetchData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const headers = { Authorization: `Bearer ${session.access_token}` };

        try {
            const [resUsers, resRoles, resCompanies] = await Promise.all([
                fetch('http://localhost:3001/users', { headers }),
                fetch('http://localhost:3001/settings/roles', { headers }),
                fetch('http://localhost:3001/companies', { headers })
            ]);

            if (resUsers.ok) setUsers(await resUsers.json());
            if (resRoles.ok) setRoles(await resRoles.json());
            if (resCompanies.ok) setCompanies(await resCompanies.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => { fetchData(); }, []);

    // Handlers
    const handleOpenCreate = () => {
        setEditingUser({
            id: null,
            email: '',
            password: '', 
            name: '',
            roleLegacy: 'USER',
            roleId: '',
            companyId: ''
        });
        setIsUserModalOpen(true);
    };

    const handleEditUser = (user: any) => {
        setEditingUser({
            id: user.id,
            name: user.name || '',
            email: user.email,
            roleLegacy: user.roleLegacy || 'USER',
            roleId: user.roleId || '',
            companyId: user.companyId || ''
        });
        setIsUserModalOpen(true);
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        await fetch(`http://localhost:3001/users/${userId}`, { 
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.access_token}` } 
        });
        fetchData();
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const headers = { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}` 
        };

        try {
            if (editingUser.id) {
                // UPDATE
                await fetch(`http://localhost:3001/users/${editingUser.id}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({
                        name: editingUser.name,
                        roleLegacy: editingUser.roleLegacy,
                        roleId: editingUser.roleId || null,
                        companyId: editingUser.companyId || null
                    }),
                });
            } else {
                // CREATE (User + Auth)
                const res = await fetch('http://localhost:3001/users/create-with-auth', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        email: editingUser.email,
                        password: editingUser.password, // Solo al crear
                        name: editingUser.name,
                        roleLegacy: editingUser.roleLegacy,
                        roleId: editingUser.roleId || null,
                        companyId: editingUser.companyId || null
                    }),
                });
                if (!res.ok) {
                    const err = await res.json();
                    alert(`Error: ${err.message}`);
                    return;
                }
            }
            setIsUserModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error al guardar usuario');
        }
    };

    // Filtrar roles disponibles para el usuario editado (Globales + Su Empresa)
    const availableRoles = roles.filter(r => !r.companyId || r.companyId === editingUser?.companyId);

    if (loading) return <div>Cargando lista de usuarios...</div>;

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">Usuarios Registrados</h3>
              <button onClick={handleOpenCreate} className="text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700">
                + Nuevo Usuario
              </button>
            </div>
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 uppercase text-xs">
                <tr>
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Empresa</th>
                  <th className="px-4 py-2">Rol (Legacy)</th>
                  <th className="px-4 py-2">Rol (Custom)</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.length === 0 ? <tr><td colSpan={6} className="p-4 text-center">No hay usuarios.</td></tr> : 
                users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium cursor-pointer text-blue-600 hover:underline" onClick={() => handleEditUser(u)}>
                        {u.name || 'Sin Nombre'}
                    </td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{u.company?.name || '---'}</td>
                    <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${u.roleLegacy === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                            {u.roleLegacy}
                        </span>
                    </td>
                     <td className="px-4 py-3">
                        {u.role ? (
                             <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs border border-blue-200">
                                {u.role.name}
                             </span>
                        ) : <span className="text-gray-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                        <button onClick={() => handleEditUser(u)} className="text-blue-600 hover:text-blue-800 mr-3">Editar</button>
                        <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* MODAL USUARIO (CREAR / EDITAR) */}
            {isUserModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg">
                        <h2 className="text-lg font-bold mb-4">
                            {editingUser.id ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                        </h2>
                        <form onSubmit={handleSaveUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre</label>
                                <input className="w-full border rounded p-2" required
                                    value={editingUser.name}
                                    onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input className="w-full border rounded p-2 bg-gray-50" 
                                    required
                                    type="email"
                                    readOnly={!!editingUser.id} // Solo editable al crear
                                    value={editingUser.email} 
                                    onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                                />
                            </div>

                            {!editingUser.id && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Contraseña</label>
                                    <input className="w-full border rounded p-2" 
                                        required
                                        type="password"
                                        placeholder="Min. 6 caracteres"
                                        value={editingUser.password}
                                        onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                                    />
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium mb-1">Empresa</label>
                                <select className="w-full border rounded p-2"
                                    value={editingUser.companyId}
                                    onChange={e => setEditingUser({...editingUser, companyId: e.target.value, roleId: ''})}
                                >
                                    <option value="">-- Sin Empresa (Global) --</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1">Asigna el usuario a una organización específica.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Tipo Acceso</label>
                                    <select className="w-full border rounded p-2"
                                        value={editingUser.roleLegacy}
                                        onChange={e => setEditingUser({...editingUser, roleLegacy: e.target.value})}
                                    >
                                        <option value="USER">Usuario Normal</option>
                                        <option value="ADMIN">Super Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Rol (Permisos)</label>
                                    <select className="w-full border rounded p-2"
                                        value={editingUser.roleId}
                                        onChange={e => setEditingUser({...editingUser, roleId: e.target.value})}
                                    >
                                        <option value="">-- Ninguno --</option>
                                        {availableRoles.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-medium">
                                    {editingUser.id ? 'Guardar Cambios' : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}