'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { apiClient } from '@/lib/api-client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, Package, Settings, LogOut, 
  Menu, Building2, UserCircle, Truck, ShoppingCart, ClipboardCheck, 
  DollarSign, CreditCard, RefreshCw, FileText, TrendingUp, Receipt, Users,
  Bell, Sun
} from 'lucide-react';

interface UserProfile {
  name?: string;
  email?: string;
  roleName?: string;
  role?: string;
  companyName?: string;
  permissions?: string[];
}

interface ExchangeRateResponse {
  rate?: number | string;
}

interface ApiError {
  message?: string;
  statusCode?: number;
}

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
    'Finanzas': pathname.includes('/dashboard/accounting'),
    'Facturación': pathname.includes('/dashboard/sales'),
    'Configuración': pathname.includes('/dashboard/settings'),
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          try {
            const myUser = await apiClient.get<any>('/users/me');
            setUserName(myUser.name || myUser.email?.split('@')[0] || 'Usuario');
            setUserRole(myUser.roleName || myUser.role || 'Usuario');
            setCompanyName(myUser.companyName || 'Sin Empresa');
            setUserPermissions(myUser.permissions || []);
          } catch (e: unknown) {
            const err = e as ApiError;
            console.error('Error cargando perfil de usuario:', err?.message ?? e);
          }
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    const getRate = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const data = await apiClient.get<ExchangeRateResponse>('/exchange-rates/latest');
        if (data && data.rate) setBcvRate(Number(data.rate));
      } catch (error: unknown) {
        const err = error as ApiError;
        console.error('Error fetching rate:', err?.message ?? error);
      }
    };
    getRate();
  }, []);

  const syncRate = async () => {
    setLoadingRate(true);
    try {
        const data = await apiClient.post<ExchangeRateResponse>('/exchange-rates/sync', {});
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
    try {
      setIsUserMenuOpen(false);
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  const can = (permission: string) => {
    if (userRole === 'ADMIN') return true;
    return userPermissions.includes(permission);
  };

  const menuSections = [
    {
      title: 'PRINCIPAL',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', requiredPermission: 'dashboard.view' },
        { name: 'Empresas', icon: Building2, path: '/dashboard/settings/general/companies', requiredPermission: 'companies.view' },
        { 
          name: 'Finanzas', 
          icon: CreditCard, 
          children: [
            { name: 'Facturas de Compra', icon: DollarSign, path: '/dashboard/accounting/bills', requiredPermission: 'bills.view' },
            { name: 'Historial de Pagos', icon: FileText, path: '/dashboard/accounting/payments', requiredPermission: 'payments.view' },
            { name: 'Registrar Pago', icon: CreditCard, path: '/dashboard/accounting/payments/new', requiredPermission: 'payments.create' },
          ]
        },
        { 
          name: 'Facturación', 
          icon: Receipt,
          children: [
            { name: 'Cotizaciones', icon: FileText, path: '/dashboard/sales/quotes', requiredPermission: 'sales.view' },
            { name: 'Pedidos de Venta', icon: ShoppingCart, path: '/dashboard/sales/orders', requiredPermission: 'sales.view' },
            { name: 'Facturas de Venta', icon: Receipt, path: '/dashboard/sales/invoices', requiredPermission: 'sales.view' },
          ]
        }
      ]
    },
    {
      title: 'OPERACIONES',
      items: [
        { name: 'Clientes', icon: Users, path: '/dashboard/sales/clients', requiredPermission: 'clients.view' },
        { name: 'Inventario', icon: Package, path: '/dashboard/inventory', requiredPermission: 'inventory.view' },
        { name: 'Recepciones', icon: ClipboardCheck, path: '/dashboard/inventory/receptions', requiredPermission: 'receptions.view' },
        { name: 'Proveedores', icon: Truck, path: '/dashboard/suppliers', requiredPermission: 'suppliers.view' },
        { name: 'Órdenes de Compra', icon: ShoppingCart, path: '/dashboard/purchase-orders', requiredPermission: 'purchase_orders.view' },
      ]
    },
    {
      title: 'SISTEMA',
      items: [
        { 
          name: 'Configuración', 
          icon: Settings, 
          children: [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/settings/general/dashboard', requiredPermission: 'settings.view' },
            { name: 'Usuarios', icon: UserCircle, path: '/dashboard/settings/general/users', requiredPermission: 'settings.view' },
            { name: 'Categorías de Serv.', icon: ClipboardCheck, path: '/dashboard/settings/general/service-categories', requiredPermission: 'settings.view' },
          ]
        }
      ]
    }
  ];

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-gray-100 flex font-sans">
      {/* SIDEBAR */}
      <aside className={`bg-[#0B1120] border-r border-white/5 fixed h-full z-20 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        
        {/* LOGO / EMPRESA SELECTOR PLACEHOLDER */}
        <div className="h-20 flex-none flex flex-col justify-center px-4 border-b border-white/5">
           <div className="flex items-center gap-3">
             <div className="bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center text-white shrink-0">
               <Building2 size={16} />
             </div>
             {isSidebarOpen && (
               <div className="overflow-hidden">
                 <h1 className="text-sm font-semibold text-white leading-tight truncate">Todas las Empresas</h1>
                 <p className="text-xs text-blue-400 font-mono">ALL</p>
               </div>
             )}
           </div>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="p-4 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          {menuSections.map((section, sIdx) => {
            const visibleItems = section.items.filter(item => !item.requiredPermission || can(item.requiredPermission));
            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1">
                {isSidebarOpen && (
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-3">
                    {section.title}
                  </h3>
                )}
                
                {visibleItems.map((item) => {
                  if (item.children) {
                    const isOpen = openMenus[item.name] || false;
                    const hasActiveChild = item.children.some(child => pathname === child.path);
                    
                    const toggleMenu = () => setOpenMenus(prev => ({ ...prev, [item.name]: !prev[item.name] }));
                    
                    return (
                      <div key={item.name}>
                        <button
                          onClick={toggleMenu}
                          className={`flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                            hasActiveChild || isOpen
                              ? 'bg-white/10 text-white font-medium shadow-sm'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon size={18} className={hasActiveChild ? 'text-blue-400' : ''} />
                            {isSidebarOpen && <span className="text-sm">{item.name}</span>}
                          </div>
                          {isSidebarOpen && (
                            <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                        
                        {isOpen && isSidebarOpen && (
                          <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-1">
                            {item.children.filter(child => !child.requiredPermission || can(child.requiredPermission)).map((child) => (
                              <Link
                                key={child.path}
                                href={child.path}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                                  pathname === child.path
                                    ? 'bg-blue-500/10 text-blue-400 font-medium'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                }`}
                              >
                                {pathname === child.path && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                <span className={pathname !== child.path ? 'ml-4.5' : ''}>{child.name}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                        pathname === item.path 
                          ? 'bg-white/10 text-white font-medium shadow-sm' 
                          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                      }`}
                    >
                      <item.icon size={18} className={pathname === item.path ? 'text-blue-400' : ''} />
                      {isSidebarOpen && <span className="text-sm">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* FOOTER DEL SIDEBAR */}
        <div className="p-4 border-t border-white/5">
           <div className={`text-xs text-gray-600 ${!isSidebarOpen && 'text-center'}`}>
             {isSidebarOpen ? 'ERP v1.0 — Multiempresa' : 'v1.0'}
           </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        
        {/* HEADER SUPERIOR */}
        <header className="h-20 bg-[#0B1120] flex items-center justify-between px-6 sticky top-0 z-10 border-b border-white/5">
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">
               <Menu size={20} />
             </button>
             
             {/* INDICADOR DE TASA BCV */}
             <div className="hidden md:flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg text-sm">
                <span className="font-bold text-green-400">BCV:</span>
                <span className="font-mono text-green-100">{bcvRate ? `${bcvRate.toFixed(4)}` : '---'}</span>
                <button onClick={syncRate} disabled={loadingRate} className="text-green-500 hover:text-green-300 transition-colors ml-1">
                    <RefreshCw size={14} className={loadingRate ? "animate-spin" : ""} />
                </button>
             </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
             <button className="text-gray-400 hover:text-white transition-colors relative p-2">
               <Bell size={20} />
               <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
             </button>
             <button className="text-gray-400 hover:text-white transition-colors p-2">
               <Sun size={20} />
             </button>
             
             {/* USER MENU DROPDOWN */}
             <div className="relative">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-purple-500/30 hover:ring-purple-500/50 transition-all ml-2"
                >
                  {getInitials(userName)}
                </button>
                
                {isUserMenuOpen && (
                  <div className="absolute top-14 right-0 w-64 bg-[#1A1F2C] shadow-2xl border border-white/10 rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-white/5 bg-white/5">
                      <p className="text-xs text-gray-400">Sesión iniciada como</p>
                      <p className="font-medium text-white truncate text-sm mt-0.5">{userName}</p>
                      <p className="text-xs text-blue-400 mt-1">{userRole}</p>
                    </div>
                    <div className="p-2">
                       <button
                         onClick={handleLogout}
                         className="flex items-center gap-3 p-2.5 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
                       >
                         <LogOut size={16} />
                         <span>Cerrar Sesión</span>
                       </button>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </header>

        {/* CONTENIDO DE LA PÁGINA */}
        <main className="p-6 md:p-8 flex-1 overflow-auto bg-[#0B1120]">
          {children}
        </main>
      </div>
    </div>
  );
}