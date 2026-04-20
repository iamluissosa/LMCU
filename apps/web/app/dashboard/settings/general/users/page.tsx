'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Settings, Save, Shield, Hash, Receipt } from 'lucide-react';

interface Company {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
  permissions?: string[];
  companyId?: string;
  company?: Company;
  isDefault?: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  roleId?: string;
  roleLegacy?: string;
  companyId?: string;
  isActive?: boolean;
  isSalesperson?: boolean;
  role?: Role;
  company?: Company;
  [key: string]: unknown;
}

export default function GeneralSettingsPage() {
  const [activeTab, setActiveTab] = useState('correlatives');
  const [settings, setSettings] = useState<Record<string, string | number>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos
  const fetchData = async () => {
    setLoading(true);

    // Separamos las llamadas para poder aislar errores individuales
    try {
      const settingsData = await apiClient
        .get<Record<string, string | number>>('/settings/general')
        .catch((err) => {
          console.error('Error cargando configuración general:',
            JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
          return null;
        });

      const rolesData = await apiClient
        .get<Role[]>('/settings/roles')
        .catch((err) => {
          console.error('Error cargando roles:',
            JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
          // devolvemos arreglo vacío para evitar paquetes nulos
          return [] as Role[];
        });

      if (settingsData) setSettings(settingsData);
      if (rolesData) setRoles(rolesData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Guardar Correlativos
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.patch('/settings/general', settings);
      alert('Configuración guardada');
    } catch (error) {
      console.error(error);
      alert('Error al guardar configuración');
    }
  };

  // --- MODAL & PERMISSIONS ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<{id?: string, name: string, permissions: string[], companyId?: string}>({
    name: '', permissions: []
  });
  const [companies, setCompanies] = useState<Company[]>([]);

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
    { id: 'payments.edit', label: 'Editar Egresos Directos' },
    { id: 'payments.delete', label: 'Eliminar Egresos Directos' },
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
    { id: 'settings.formats', label: 'Configurar Formatos de Documentos' },
    // ── VENTAS ──────────────────────────────────
    { id: 'clients.view', label: 'Ver Clientes' },
    { id: 'clients.create', label: 'Crear Clientes' },
    { id: 'clients.edit', label: 'Editar Clientes' },
    { id: 'clients.delete', label: 'Eliminar Clientes' },
    { id: 'sales.view', label: 'Ver Módulo de Ventas' },
    { id: 'sales.create', label: 'Crear Cotizaciones y Pedidos' },
    { id: 'sales.edit', label: 'Editar Estatus de Ventas' },
    { id: 'sales.invoice', label: 'Emitir Facturas de Venta y Cobros' },
    { id: 'sales.delete', label: 'Anular Documentos de Venta' },
    // ── EVENTOS Y RENTABILIDAD ────────────────────
    { id: 'events.view', label: 'Ver Eventos' },
    { id: 'events.create', label: 'Crear Eventos' },
    { id: 'events.edit', label: 'Editar Eventos' },
    { id: 'events.delete', label: 'Eliminar Eventos' },
    { id: 'incomes.view', label: 'Ver Ingresos por Evento' },
    { id: 'incomes.create', label: 'Registrar Ingresos' },
    { id: 'incomes.edit', label: 'Editar Ingresos' },
    { id: 'incomes.delete', label: 'Eliminar Ingresos' },
    // ── WIDGETS DASHBOARD ──────────────────────────
    { id: 'widget.inventory.view', label: 'Dashboard: Ver Métricas de Inventario' },
    { id: 'widget.low_stock.view', label: 'Dashboard: Ver Stock Crítico' },
    { id: 'widget.sales.view', label: 'Dashboard: Ver Métricas de Ventas' },
    { id: 'widget.finance.view', label: 'Dashboard: Ver Métricas de Finanzas' },
    // ── REPORTES ──────────────────────────
    { id: 'reports.view', label: 'Ver Módulo de Reportes' },
    // ── IMPRESIÓN ──────────────────────────
    { id: 'print.expenses', label: 'Imprimir Comprobantes de Egreso' },
    { id: 'print.sales', label: 'Imprimir Cotizaciones / Facturas de Venta' },
    { id: 'print.islr', label: 'Imprimir Retenciones ISLR' },
    { id: 'print.reports', label: 'Imprimir Reportes Financieros' },
  ];

  const handleOpenModal = async (role?: Role) => {
    // Cargar empresas si aún no están cargadas
    if (companies.length === 0) {
        try {
             const data = await apiClient.get<Company[]>('/companies');
             if(data) {
                 setCompanies(data);
             }
        } catch {
             console.error('No se pudieron cargar empresas, usuario no es admin global o error red');
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

    try {
      const payload = {
        name: currentRole.name,
        permissions: currentRole.permissions,
        companyId: currentRole.companyId,
      };

      if (currentRole.id) {
        await apiClient.patch(`/settings/roles/${currentRole.id}`, payload);
      } else {
        await apiClient.post('/settings/roles', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      // mostrar detalles legibles cuando el error es ApiError o un objeto con props
      console.error('Error guardando rol:',
        typeof err === 'object'
          ? JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
          : err);
      alert('Error al guardar rol');
    }
  };

  if (loading) return <div>Cargando configuraciones...</div>;

  return (
    <div className="space-y-6 relative animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
        <Settings className="text-blue-500" /> Configuración del Sistema
      </h1>

      {/* TABS */}
      <div className="flex border-b border-white/10 overflow-x-auto custom-scrollbar">
        <button 
          onClick={() => setActiveTab('correlatives')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'correlatives' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
        >
          <Hash size={16} /> Correlativos y Series
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'roles' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
        >
          <Shield size={16} /> Roles y Permisos
        </button>
        <button 
          onClick={() => setActiveTab('users_list')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'users_list' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
        >
          <Settings size={16} /> Usuarios del Sistema
        </button>
        <button 
          onClick={() => setActiveTab('expense_categories')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'expense_categories' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-400 hover:text-gray-300'}`}
        >
          <Receipt size={16} /> Categorías de Gasto
        </button>
      </div>

      {/* CONTENIDO TABS */}
      <div className="bg-[#1A1F2C] p-6 lg:p-8 rounded-2xl shadow-xl border border-white/5">
        
        {/* --- CORRELATIVOS --- */}
        {activeTab === 'correlatives' && (
          <form onSubmit={handleSaveSettings} className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
               
               {/* Columna Facturación */}
               <div className="space-y-5">
                 <div className="border-b border-white/5 pb-2 mb-4">
                     <h3 className="font-semibold text-white flex items-center gap-2">
                        <Receipt size={18} className="text-emerald-400" /> Facturación
                     </h3>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1.5">Prefijo Factura</label>
                   <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all" 
                     placeholder="Ej: FACT-"
                     value={settings.invoicePrefix || ''}
                     onChange={e => setSettings({...settings, invoicePrefix: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1.5">Próximo Número</label>
                   <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all" 
                     placeholder="Ej: 1"
                     value={settings.nextInvoiceNumber || ''}
                     onChange={e => setSettings({...settings, nextInvoiceNumber: e.target.value})}
                   />
                 </div>
               </div>
 
               {/* Columna Inventario */}
               <div className="space-y-5">
                 <div className="border-b border-white/5 pb-2 mb-4">
                     <h3 className="font-semibold text-white flex items-center gap-2">
                        <Hash size={18} className="text-purple-400" /> Inventario
                     </h3>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1.5">Prefijo Productos</label>
                   <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all" 
                     placeholder="Ej: PROD-"
                     value={settings.productPrefix || ''}
                     onChange={e => setSettings({...settings, productPrefix: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1.5">Próximo Código</label>
                   <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all" 
                     placeholder="Ej: 1"
                     value={settings.nextProductCode || ''}
                     onChange={e => setSettings({...settings, nextProductCode: e.target.value})}
                   />
                 </div>
               </div>
             </div>
             
             <div className="pt-6 mt-6 border-t border-white/5 flex justify-end">
               <button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all">
                 <Save size={18} /> Guardar Configuración
               </button>
             </div>
          </form>
        )}

        {/* --- ROLES --- */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                 <h3 className="font-semibold text-white">Roles Definidos</h3>
                 <p className="text-xs text-gray-400 mt-1">Niveles de acceso y permisos personalizables por empresa.</p>
              </div>
              <button onClick={() => handleOpenModal()} className="text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all">
                + Crear Rol
              </button>
            </div>
            <div className="border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                  <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400">
                    <tr>
                      <th className="px-5 py-4">Empresa</th>
                      <th className="px-5 py-4">Rol</th>
                      <th className="px-5 py-4">Permisos</th>
                      <th className="px-5 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {roles.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-gray-500">No hay roles personalizados.</td></tr> : 
                    roles.map((rol: Role) => (
                      <tr key={rol.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-4 text-gray-500 text-xs">{rol.company?.name || 'Local'}</td>
                        <td className="px-5 py-4 font-bold text-gray-200">{rol.name}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                              {Array.isArray(rol.permissions) && rol.permissions.map((p:string) => (
                                <span key={p} className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-[10px] border border-blue-500/20 font-medium">
                                    {p}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                            <button onClick={() => handleOpenModal(rol)} className="text-blue-400 hover:text-blue-300 font-medium mr-4 transition-colors">Editar</button>
                            <button onClick={async () => {
                                if (!confirm('¿Eliminar rol?')) return;
                                try {
                                    await apiClient.delete(`/settings/roles/${rol.id}`);
                                    fetchData();
                                } catch (error) {
                                    console.error(error);
                                    alert('Error al eliminar rol');
                                }
                            }} className="text-red-400 hover:text-red-300 font-medium transition-colors">Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        )}

        {/* --- USUARIOS (NUEVO) --- */}
        {activeTab === 'users_list' && (
           <UsersListTab />    
        )}

        {/* --- CAT. GASTO --- */}
        {activeTab === 'expense_categories' && (
           <ExpenseCategoriesTab />
        )}
      </div>

       {/* MODAL CREAR ROL */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1A1F2C] border border-white/10 p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">{currentRole.id ? 'Editar Rol' : 'Crear Nuevo Rol'}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>
                
                <form onSubmit={handleSaveRole} className="space-y-6">
                    
                    {/* Selector de Empresa para ADMIN */}
                    {companies.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">Empresa (Super Admin)</label>
                            <select 
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all custom-scrollbar"
                                value={currentRole.companyId || ''}
                                onChange={e => setCurrentRole({ ...currentRole, companyId: e.target.value })}
                            >
                                <option value="" className="bg-[#1A1F2C]">-- Seleccionar Empresa --</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id} className="bg-[#1A1F2C]">{c.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-2">Como administrador Global, debes asignar el rol a una empresa.</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Nombre del Rol</label>
                        <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all" required
                            value={currentRole.name} 
                            onChange={e => setCurrentRole({...currentRole, name: e.target.value})} 
                            placeholder="Ej: Gerente de Ventas"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-3">Permisos de Acceso</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm border border-white/10 bg-white/5 p-4 rounded-xl max-h-60 overflow-y-auto custom-scrollbar">
                            {ALL_PERMISSIONS.map(p => (
                                <label key={p.id} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                                    <input type="checkbox" 
                                        checked={currentRole.permissions.includes(p.id)}
                                        onChange={() => togglePermission(p.id)}
                                        className="w-4 h-4 text-blue-500 bg-gray-900 border-white/20 rounded focus:ring-blue-500 focus:ring-offset-gray-900"
                                    />
                                    <span className="text-gray-300 font-medium">{p.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all">
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
interface EditingUser {
    id: string | null;
    name: string;
    email: string;
    password?: string;
    roleLegacy: string;
    roleId: string;
    companyId: string;
    isSalesperson: boolean;
}

function UsersListTab() {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<EditingUser | null>(null); // null = Create Mode

    // Cargar Usuarios, Roles y Empresas
    const fetchData = async () => {
        try {
            const [usersData, rolesData, companiesData] = await Promise.all([
                apiClient.get<User[]>('/users'),
                apiClient.get<Role[]>('/settings/roles'),
                apiClient.get<Company[]>('/companies').catch(() => []) // Puede fallar si no es admin
            ]);

            if (usersData) setUsers(usersData);
            if (rolesData) setRoles(rolesData);
            if (companiesData) setCompanies(companiesData);
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
            companyId: '',
            isSalesperson: false
        });
        setIsUserModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser({
            id: user.id,
            name: user.name || '',
            email: user.email,
            roleLegacy: user.roleLegacy || 'USER',
            roleId: user.roleId || '',
            companyId: user.companyId || '',
            isSalesperson: user.isSalesperson || false
        });
        setIsUserModalOpen(true);
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
        
        try {
            await apiClient.delete(`/users/${userId}`);
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error al eliminar usuario');
        }
    };

    const handleResetPassword = async (userId: string, userName: string) => {
        const newPassword = prompt(`Nueva contraseña para ${userName} (mínimo 6 caracteres):`);
        if (!newPassword) return;
        if (newPassword.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            await apiClient.patch(`/users/${userId}/reset-password`, { password: newPassword });
            alert(`✅ Contraseña actualizada correctamente para ${userName}`);
        } catch (error: unknown) {
            console.error(error);
            const msg = error instanceof Error ? error.message : 'Error al resetear contraseña';
            alert(`Error: ${msg}`);
        }
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            if (editingUser.id) {
                // UPDATE
                await apiClient.patch(`/users/${editingUser.id}`, {
                    name: editingUser.name,
                    roleLegacy: editingUser.roleLegacy,
                    roleId: editingUser.roleId || null,
                    companyId: editingUser.companyId || null,
                    isSalesperson: editingUser.isSalesperson
                });
            } else {
                // CREATE (User + Auth)
                await apiClient.post('/users/create-with-auth', {
                    email: editingUser.email,
                    password: editingUser.password, // Solo al crear
                    name: editingUser.name,
                    roleLegacy: editingUser.roleLegacy,
                    roleId: editingUser.roleId || null,
                    companyId: editingUser.companyId || null,
                    isSalesperson: editingUser.isSalesperson
                });
            }
            setIsUserModalOpen(false);
            fetchData();
        } catch (error: unknown) {
            console.error(error);
            const msg = error instanceof Error ? error.message : 'Error al guardar usuario';
            alert(`Error: ${msg}`);
        }
    };

    // Filtrar roles disponibles para el usuario editado (Globales + Su Empresa)
    const availableRoles = roles.filter(r => !r.companyId || r.companyId === editingUser?.companyId);

    if (loading) return <div>Cargando lista de usuarios...</div>;

    return (
        <div className="space-y-6">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-semibold text-white">Usuarios Registrados</h3>
                <p className="text-xs text-gray-400 mt-1">Gestión de cuentas y asignación a empresas.</p>
              </div>
              <button onClick={handleOpenCreate} className="text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all">
                + Nuevo Usuario
              </button>
            </div>
            
            <div className="border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                  <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400">
                    <tr>
                      <th className="px-5 py-4">Nombre</th>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Empresa</th>
                      <th className="px-5 py-4">Rol (Legacy)</th>
                      <th className="px-5 py-4">Rol (Custom)</th>
                      <th className="px-5 py-4 text-center">Vendedor</th>
                      <th className="px-5 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-gray-500">No hay usuarios.</td></tr> : 
                    users.map((u: User) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-4 font-bold text-gray-200 cursor-pointer hover:text-blue-400" onClick={() => handleEditUser(u)}>
                            {u.name || 'Sin Nombre'}
                        </td>
                        <td className="px-5 py-4 text-gray-400">{u.email}</td>
                        <td className="px-5 py-4 text-xs text-gray-500">{u.company?.name || '---'}</td>
                        <td className="px-5 py-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold border ${u.roleLegacy === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-white/5 text-gray-300 border-white/10'}`}>
                                {u.roleLegacy}
                            </span>
                        </td>
                         <td className="px-5 py-4">
                            {u.role ? (
                                 <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md text-xs border border-blue-500/20 font-medium">
                                    {u.role.name}
                                 </span>
                            ) : <span className="text-gray-600 text-xs">-</span>}
                        </td>
                        <td className="px-5 py-4 text-center">
                            {u.isSalesperson ? (
                                <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-xs border border-emerald-500/20 font-bold">Sí</span>
                            ) : (
                                <span className="text-gray-600 text-xs">—</span>
                            )}
                        </td>
                        <td className="px-5 py-4 text-right">
                            <button onClick={() => handleEditUser(u)} className="text-blue-400 hover:text-blue-300 font-medium mr-3 transition-colors">Editar</button>
                            <button onClick={() => handleResetPassword(u.id, u.name || u.email)} className="text-amber-400 hover:text-amber-300 font-medium mr-3 transition-colors">Clave</button>
                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-300 font-medium transition-colors">Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>

            {/* MODAL USUARIO (CREAR / EDITAR) */}
            {isUserModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1A1F2C] border border-white/10 p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">
                                {editingUser.id ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                            </h2>
                            <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
                        </div>
                        
                        <form onSubmit={handleSaveUser} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Nombre</label>
                                <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm" required
                                    value={editingUser.name}
                                    onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                                <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm disabled:opacity-50" 
                                    required
                                    type="email"
                                    readOnly={!!editingUser.id}
                                    value={editingUser.email} 
                                    onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                                />
                            </div>

                            {!editingUser.id && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Contraseña</label>
                                    <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm" 
                                        required
                                        type="password"
                                        placeholder="Min. 6 caracteres"
                                        value={editingUser.password}
                                        onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                                    />
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Empresa</label>
                                <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none text-sm"
                                    value={editingUser.companyId}
                                    onChange={e => setEditingUser({...editingUser, companyId: e.target.value, roleId: ''})}
                                >
                                    <option value="" className="bg-[#1A1F2C]">-- Sin Empresa (Global) --</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id} className="bg-[#1A1F2C]">{c.name}</option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-gray-500 mt-2">Asigna el usuario a una organización específica.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Tipo Acceso</label>
                                    <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none text-sm"
                                        value={editingUser.roleLegacy}
                                        onChange={e => setEditingUser({...editingUser, roleLegacy: e.target.value})}
                                    >
                                        <option value="USER" className="bg-[#1A1F2C]">Usuario Normal</option>
                                        <option value="ADMIN" className="bg-[#1A1F2C]">Super Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Rol (Permisos)</label>
                                    <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none text-sm"
                                        value={editingUser.roleId}
                                        onChange={e => setEditingUser({...editingUser, roleId: e.target.value})}
                                    >
                                        <option value="" className="bg-[#1A1F2C]">-- Ninguno --</option>
                                        {availableRoles.map(r => (
                                            <option key={r.id} value={r.id} className="bg-[#1A1F2C]">{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Toggle Vendedor */}
                            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3.5">
                                <div>
                                    <p className="text-sm font-medium text-gray-200">¿Es Vendedor?</p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Al activar, este usuario aparecerá como opción de vendedor en Cotizaciones y Facturas.</p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={editingUser.isSalesperson}
                                    onClick={() => setEditingUser({...editingUser, isSalesperson: !editingUser.isSalesperson})}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#1A1F2C] ${
                                        editingUser.isSalesperson ? 'bg-emerald-500' : 'bg-white/20'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            editingUser.isSalesperson ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                                <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all">
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

// --- SUB-COMPONENT CATEGORÍAS DE GASTO ---
interface IslrConceptRef {
  id: string;
  code: string;
  description: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  islrConceptId?: string | null;
  islrConcept?: IslrConceptRef | null;
}

function ExpenseCategoriesTab() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [islrConcepts, setIslrConcepts] = useState<IslrConceptRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Partial<ExpenseCategory> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      const data = await apiClient.get<ExpenseCategory[]>('/expense-categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConcepts = async () => {
    try {
      const data = await apiClient.get<IslrConceptRef[]>('/islr/concepts');
      setIslrConcepts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchCategories(); fetchConcepts(); }, []);

  const handleOpenCreate = () => {
    setEditingCat({ name: '', description: '', isActive: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: ExpenseCategory) => {
    setEditingCat({ ...cat });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat?.name) return;
    setSaving(true);
    try {
      const payload = {
        name: editingCat.name,
        description: editingCat.description || '',
        islrConceptId: editingCat.islrConceptId || null,
      };

      if (editingCat.id) {
        // UPDATE
        await apiClient.patch(`/expense-categories/${editingCat.id}`, payload);
      } else {
        // CREATE
        await apiClient.post('/expense-categories', payload);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      const error = err as { message?: string };
      alert(`Error: ${error.message || 'No se pudo guardar. ¿Ya existe esta categoría?'}`);
    } finally {
      setSaving(false);
    }
  };

  const DEFAULT_CATEGORIES = [
    'Servicios Públicos', 'Alquiler / Arrendamiento', 'Papelería y Útiles',
    'Honorarios Profesionales', 'Fletes y Transporte', 'Mantenimiento',
    'Publicidad y Marketing', 'Seguros', 'Alimentación y Viáticos',
    'Combustible', 'Telecomunicaciones', 'Otros Gastos Operativos',
  ];

  const createDefaults = async () => {
    if (!confirm(`¿Crear ${DEFAULT_CATEGORIES.length} categorías por defecto?`)) return;
    setSaving(true);
    let created = 0;
    for (const name of DEFAULT_CATEGORIES) {
      try {
        await apiClient.post('/expense-categories', { name });
        created++;
      } catch {
        // ignorar si ya existe (unique constraint)
      }
    }
    setSaving(false);
    alert(`✅ ${created} categorías creadas correctamente.`);
    fetchCategories();
  };

  if (loading) return <div className="py-8 text-center text-gray-400">Cargando categorías...</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-gray-800">Categorías de Gasto</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Usadas en el registro de Compras Directas (servicios, alquileres, honorarios, etc.)
          </p>
        </div>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <button
              onClick={createDefaults}
              disabled={saving}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors">
              ✨ Crear por Defecto
            </button>
          )}
          <button
            onClick={handleOpenCreate}
            className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-medium transition-colors">
            + Nueva Categoría
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
            <tr>
              <th className="px-5 py-3">Nombre</th>
              <th className="px-5 py-3">Cód. ISLR</th>
              <th className="px-5 py-3">Descripción</th>
              <th className="px-5 py-3 text-center">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-500">
                  <div className="text-4xl mb-2">🗂️</div>
                  <p className="font-medium">No hay categorías definidas aún.</p>
                  <p className="text-xs mt-1 text-gray-400">Usa el botón &quot;Crear por Defecto&quot; para empezar rápido.</p>
                </td>
              </tr>
            ) : categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-white/5 transition-colors">
                <td className="px-5 py-4 font-medium text-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0 shadow-[0_0_8px_rgba(2fb3ff,0.5)]" style={{backgroundColor: '#f97316', boxShadow: '0 0 8px rgba(249,115,22,0.5)'}} />
                    {cat.name}
                  </div>
                </td>
                <td className="px-5 py-4">
                  {cat.islrConcept ? (
                    <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold px-2 py-1 rounded-lg">
                      <span className="font-mono">{cat.islrConcept.code}</span>
                      <span className="text-blue-300/60">•</span>
                      <span className="text-blue-300/80 font-normal truncate max-w-[140px]">{cat.islrConcept.description}</span>
                    </span>
                  ) : (
                    <span className="text-gray-600 text-xs">—</span>
                  )}
                </td>
                <td className="px-5 py-4 text-gray-400 text-xs">{cat.description || '—'}</td>
                <td className="px-5 py-4 text-center">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${cat.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                    {cat.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="text-blue-400 hover:text-blue-300 font-medium mr-4 transition-colors">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && editingCat !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1F2C] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Receipt size={22} className="text-orange-500" />
              {editingCat.id ? 'Editar Categoría' : 'Nueva Categoría de Gasto'}
            </h2>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Nombre <span className="text-orange-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm"
                  placeholder="Ej: Servicios Públicos, Alquiler..."
                  value={editingCat.name || ''}
                  onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Descripción <span className="text-gray-500 font-normal">(opcional)</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm resize-y custom-scrollbar"
                  placeholder="Para qué aplica esta categoría..."
                  value={editingCat.description || ''}
                  onChange={e => setEditingCat({ ...editingCat, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Concepto ISLR (Decreto 1808) <span className="text-gray-500 font-normal">(opcional)</span>
                </label>
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm"
                  value={editingCat.islrConceptId || ''}
                  onChange={e => setEditingCat({ ...editingCat, islrConceptId: e.target.value || null })}
                >
                  <option value="">Sin concepto ISLR</option>
                  {islrConcepts.map(c => (
                    <option key={c.id} value={c.id} className="bg-gray-900 text-white">
                      {c.code} – {c.description}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                  Si vinculas un concepto ISLR, al registrar un gasto directo con esta categoría se auto-calculará la retención.
                </p>
              </div>

              {editingCat.id && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-xs text-orange-400">
                  💡 Para modificar el nombre de manera segura, elimina esta categoría y crea una nueva (si aún no tiene gastos asociados).
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl text-sm font-medium transition-colors">
                  Cancelar
                </button>
                {editingCat.id ? (
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 transition-all">
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium shadow-lg shadow-orange-500/20 transition-all">
                    {saving ? 'Guardando...' : 'Crear Categoría'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
