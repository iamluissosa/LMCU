'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, LayoutDashboard, ShieldAlert, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { apiClient } from '@/lib/api-client';

const supabase = createClient();

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

const DASHBOARD_WIDGETS = [
  { id: 'widget.inventory.view', name: 'Módulo de Inventario', description: 'Total de productos y valor de inventario.' },
  { id: 'widget.low_stock.view', name: 'Alertas de Stock Bajo', description: 'Listado y cantidad de productos con stock crítico.' },
  { id: 'widget.sales.view', name: 'Módulo de Ventas', description: 'Facturas emitidas y estado de las cotizaciones.' },
  { id: 'widget.finance.view', name: 'Módulo de Finanzas', description: 'Cuentas por cobrar y facturas cobradas en el mes.' },
];

export default function DashboardSettingsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    checkPermissionAndLoadData();
  }, []);

  const checkPermissionAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setHasPermission(false);
        return;
      }

      // 1. Verificar permisos
      interface UserPermissionsResponse {
        permissions: string[];
        role: { name: string };
        isAdmin: boolean;
      }
      const userRes = await apiClient.get<UserPermissionsResponse>('/users/me');
      const userPermissions = userRes.permissions || [];
      const isAdmin = userPermissions.includes('settings.view') || userRes.isAdmin || userRes.role?.name === 'ADMIN';

      if (!isAdmin) {
        setHasPermission(false);
        setIsLoading(false);
        return;
      }

      setHasPermission(true);

      // 2. Cargar roles existentes
      await fetchRoles();

    } catch (error) {
      console.error('Error al cargar configuración del dashboard:', error);
      alert('Error al cargar la configuración');
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const rolesData = await apiClient.get<Role[]>('/settings/roles');
      setRoles(rolesData);
      if (rolesData.length > 0) {
        setSelectedRole(rolesData[0] as Role);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      alert('Error al cargar los roles');
    }
  };

  const handleToggleWidget = (widgetId: string) => {
    if (!selectedRole) return;

    const currentPermissions = selectedRole.permissions || [];
    let newPermissions: string[];

    if (currentPermissions.includes(widgetId)) {
      newPermissions = currentPermissions.filter((p) => p !== widgetId);
    } else {
      newPermissions = [...currentPermissions, widgetId];
    }

    setSelectedRole({
      ...selectedRole,
      permissions: newPermissions,
    });
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;

    setIsSaving(true);
    try {
      await apiClient.patch(`/settings/roles/${selectedRole.id}`, {
        name: selectedRole.name,
        description: selectedRole.description,
        permissions: selectedRole.permissions,
      });
      
      alert(`Configuración guardada para el rol ${selectedRole.name}`);
      // Actualizar la lista en memoria
      setRoles(roles.map(r => r.id === selectedRole.id ? selectedRole : r));
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('Ocurrió un error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h2 className="text-xl font-bold">Acceso Denegado</h2>
        <p className="text-muted-foreground">No tienes permisos para configurar el Dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5" />
          Configuración por Roles del Dashboard
        </h3>
        <p className="text-sm text-muted-foreground">
          Define qué indicadores y widgets son visibles para cada rol de usuario dentro de la empresa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Panel Izquierdo: Lista de Roles */}
        <div className="md:col-span-1 bg-[#1A1F2C] border border-white/10 rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h4 className="text-sm font-semibold text-gray-200">Seleccionar Rol</h4>
          </div>
          <div className="p-0">
             <div className="flex flex-col">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`text-left px-4 py-3 text-sm transition-colors border-l-2 custom-transition ${
                    selectedRole?.id === role.id 
                      ? 'border-l-primary bg-primary/10 text-primary font-medium' 
                      : 'border-l-transparent text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {role.name}
                </button>
              ))}
             </div>
          </div>
        </div>

        {/* Panel Derecho: Configuración de Widgets */}
        <div className="md:col-span-3 bg-[#1A1F2C] border border-white/10 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-white/5 flex flex-row items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-white">Widgets del Rol: {selectedRole?.name}</h4>
              <p className="text-sm text-gray-400 mt-1">
                Activa o desactiva las tarjetas que se mostrarán en la pantalla principal.
              </p>
            </div>
            <button 
              onClick={handleSaveRole} 
              disabled={isSaving || !selectedRole}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Cambios
            </button>
          </div>
          <div className="p-6 space-y-6">
             {selectedRole ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {DASHBOARD_WIDGETS.map((widget) => {
                    const isEnabled = selectedRole.permissions.includes(widget.id);
                    return (
                      <div 
                        key={widget.id} 
                        className={`p-4 rounded-xl border ${isEnabled ? 'border-primary/50 bg-primary/5' : 'border-white/5 bg-[#0B1120]'} flex flex-row items-center justify-between space-x-4 transition-all`}
                      >
                        <div className="flex-1 space-y-1">
                          <label className="text-sm font-medium text-gray-200">
                            {widget.name}
                          </label>
                          <p className="text-[0.8rem] text-gray-400">
                            {widget.description}
                          </p>
                        </div>
                        <button
                          role="switch"
                          aria-checked={isEnabled}
                          onClick={() => handleToggleWidget(widget.id)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isEnabled ? 'bg-blue-600' : 'bg-gray-600'}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
             ) : (
               <div className="text-center text-sm text-muted-foreground py-10">
                 Selecciona un rol a la izquierda para configurar sus widgets.
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
