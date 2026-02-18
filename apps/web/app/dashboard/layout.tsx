'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { apiClient } from '@/lib/api-client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, Package, Settings, LogOut, 
  Menu, Building2, UserCircle, Truck, ShoppingCart, ClipboardCheck, DollarSign, CreditCard, RefreshCw, FileText
} from 'lucide-react';

const supabase = createClient();

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("Cargando...");
  const [userRole, setUserRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [bcvRate, setBcvRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'Tesorería': pathname.includes('/dashboard/accounting')
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      try {
        const myUser = await apiClient.get<any>('/users/me');
        
        // Usar el nombre real del usuario
        setUserName(myUser.name || myUser.email?.split('@')[0] || "Usuario");
        
        // Usar el nombre del rol custom o legacy
        setUserRole(myUser.roleName || myUser.role || "Usuario");
        
        // Usar el nombre real de la empresa si viene en los datos
        setCompanyName(myUser.companyName || "Sin Empresa");
        
        setUserPermissions(myUser.permissions || []);
      } catch (e) {
        console.error(e);
      }
    };

    getUser();
  }, [router]);

  // Fetch Tasa BCV al cargar
  useEffect(() => {
    const getRate = async () => {
        try {
            const data: any = await apiClient.get('/exchange-rates/latest');
            if (data && data.val) setBcvRate(Number(data.val)); // Fix: Exchange rate comes as { val: number } or similar? Check backend if needed.
            // Actually let's assume it returns { rate: number } or similar based on previous code.
            // Previous code: data.rate
            if (data && data.rate) setBcvRate(Number(data.rate));
        } catch (error) {
            console.error("Error fetching rate", error);
        }
    };
    getRate();
  }, []);

  const syncRate = async () => {
    setLoadingRate(true);
    try {
        const data: any = await apiClient.post('/exchange-rates/sync', {});
        setBcvRate(Number(data.rate));
        alert(`Tasa actualizada: ${data.rate}`);
    } catch (error) {
        console.error(error);
        alert("Error actualizando tasa");
    } finally {
        setLoadingRate(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Función para verificar permisos
  const can = (permission: string) => {
    if (userRole === 'ADMIN') return true; // Super admin ve todo
    return userPermissions.includes(permission);
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', requiredPermission: 'dashboard.view' }, 
    { name: 'Proveedores', icon: Truck, path: '/dashboard/suppliers', requiredPermission: 'suppliers.view' },
    { name: 'Órdenes de Compra', icon: ShoppingCart, path: '/dashboard/purchase-orders', requiredPermission: 'purchase_orders.view' },
    { name: 'Inventario', icon: Package, path: '/dashboard/inventory', requiredPermission: 'inventory.view' },
    { name: 'Recepciones', icon: ClipboardCheck, path: '/dashboard/inventory/receptions', requiredPermission: 'receptions.view' },
    { 
      name: 'Tesorería', 
      icon: CreditCard, 
      children: [
        { name: 'Registro de Facturas', icon: DollarSign, path: '/dashboard/accounting/bills', requiredPermission: 'bills.view' },
        { name: 'Historial de Pagos', icon: FileText, path: '/dashboard/accounting/payments', requiredPermission: 'payments.view' },
        { name: 'Registrar Pago', icon: CreditCard, path: '/dashboard/accounting/payments/new', requiredPermission: 'payments.create' },
      ]
    },
    { name: 'Empresas', icon: Building2, path: '/dashboard/settings/general/companies', requiredPermission: 'companies.view' },
    { name: 'Configuración', icon: Settings, path: '/dashboard/settings/general/users', requiredPermission: 'settings.view' },
  ];

  const filteredMenu = menuItems.filter(item => 
    !item.requiredPermission || can(item.requiredPermission)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* SIDEBAR */}
      <aside className={`bg-white border-r border-gray-200 fixed h-full z-10 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center justify-center border-b border-gray-100">
          {isSidebarOpen ? (
            <h1 className="text-xl font-bold text-blue-600 tracking-tight">ERP SYSTEM</h1>
          ) : (
            <Building2 className="text-blue-600" />
          )}
        </div>

        {/* INFO DEL USUARIO - CLICKEABLE */}
        <div className={`relative ${!isSidebarOpen && 'hidden'}`}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="p-4 border-b border-gray-100 w-full hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                <UserCircle size={24} />
              </div>
              <div className="overflow-hidden flex-1 text-left">
                <p className="text-sm font-bold text-gray-800 truncate">{userName}</p>
                <p className="text-xs text-gray-500 truncate">{companyName}</p>
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* DROPDOWN MENU */}
          {isUserMenuOpen && (
            <div className="absolute top-full left-0 right-0 bg-white shadow-lg border border-gray-200 z-50 mx-2 rounded-lg">
              <div className="p-4 border-b border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Usuario</p>
                <p className="text-sm font-semibold text-gray-800">{userName}</p>
                <p className="text-xs text-gray-500 mt-2 mb-1">Empresa</p>
                <p className="text-sm font-semibold text-gray-800">{companyName}</p>
                <p className="text-xs text-gray-500 mt-2 mb-1">Rol</p>
                <p className="text-sm font-semibold text-gray-800">{userRole || 'Sin rol'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 p-3 w-full rounded-b-lg text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={20} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>

        <nav className="p-4 space-y-2">
          {filteredMenu.map((item) => {
            // If item has children (nested menu), render collapsible section
            if (item.children) {
              const isOpen = openMenus[item.name] || false;
              const hasActiveChild = item.children.some(child => pathname === child.path);
              
              const toggleMenu = () => {
                setOpenMenus(prev => ({
                  ...prev,
                  [item.name]: !prev[item.name]
                }));
              };
              
              return (
                <div key={item.name}>
                  <button
                    onClick={toggleMenu}
                    className={`flex items-center justify-between w-full gap-3 p-3 rounded-lg transition-colors ${
                      hasActiveChild || isOpen
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} />
                      {isSidebarOpen && <span>{item.name}</span>}
                    </div>
                    {isSidebarOpen && (
                      <svg
                        className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                  
                  {isOpen && isSidebarOpen && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children
                        .filter(child => !child.requiredPermission || can(child.requiredPermission))
                        .map((child) => (
                          <Link
                            key={child.path}
                            href={child.path}
                            className={`flex items-center gap-3 p-2 rounded-lg transition-colors text-sm ${
                              pathname === child.path
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <child.icon size={16} />
                            <span>{child.name}</span>
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              );
            }

            // Regular menu item
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  pathname === item.path 
                    ? 'bg-blue-50 text-blue-600 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon size={20} />
                {isSidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>


      </aside>

      {/* MAIN CONTENT */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-4">
             {/* WIDGET TASA CAMBIO */}
             <div className="hidden md:flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <span className="text-xs font-bold text-green-700">BCV:</span>
                <span className="text-sm font-mono text-gray-800">{bcvRate ? `${bcvRate.toFixed(4)}` : '---'}</span>
                <button onClick={syncRate} disabled={loadingRate} className="text-green-600 hover:text-green-800 transition-colors">
                    <RefreshCw size={14} className={loadingRate ? "animate-spin" : ""} />
                </button>
             </div>
             
             {/* Aquí puedes poner notificaciones u otros elementos */}
             <span className="text-sm text-gray-500 hidden sm:block">
                Rol: <span className="font-semibold text-gray-700">{userRole || 'Cargando...'}</span>
             </span>
          </div>
        </header>

        <main className="p-6 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}