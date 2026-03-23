'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { apiClient } from '@/lib/api-client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  LayoutDashboard, Package, Settings, LogOut, 
  Menu, Building2, UserCircle, Truck, ShoppingCart, ClipboardCheck, 
  DollarSign, CreditCard, RefreshCw, FileText, TrendingUp, Receipt, Users,
  Bell, Sun, Calculator
} from 'lucide-react';

interface UserProfile {
  name?: string;
  email?: string;
  roleName?: string;
  role?: string;
  companyName?: string;
  permissions?: string[];
}

interface AllRatesResponse {
  usd: { rate: number | null; date: string | null; source: string | null };
  eur: { rate: number | null; date: string | null; source: string | null };
}

type ActiveCurrency = 'USD' | 'EUR';

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
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [eurRate, setEurRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [activeCurrency, setActiveCurrency] = useState<ActiveCurrency>('USD');
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
    const getRates = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const data = await apiClient.get<AllRatesResponse>('/exchange-rates/latest-all');
        if (data?.usd?.rate) setUsdRate(Number(data.usd.rate));
        if (data?.eur?.rate) setEurRate(Number(data.eur.rate));
      } catch (error: unknown) {
        const err = error as ApiError;
        console.error('Error fetching rates:', err?.message ?? error);
      }
    };
    getRates();
  }, []);

  const syncRates = async () => {
    setLoadingRate(true);
    try {
        const data = await apiClient.post<AllRatesResponse>('/exchange-rates/sync-all', {});
        if (data?.usd?.rate) setUsdRate(Number(data.usd.rate));
        if (data?.eur?.rate) setEurRate(Number(data.eur.rate));
        toast.success(`Tasas actualizadas — USD: ${data?.usd?.rate?.toFixed ? Number(data.usd.rate).toFixed(4) : '--'} | EUR: ${data?.eur?.rate?.toFixed ? Number(data.eur.rate).toFixed(4) : '--'}`);
    } catch (error) {
        console.error(error);
        toast.error("Error actualizando tasas");
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
            { name: 'Libros Fiscales IVA', icon: FileText, path: '/dashboard/accounting/books', requiredPermission: 'bills.view' },
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
            { name: 'Formatos de Documentos', icon: FileText, path: '/dashboard/settings/general/document-formats', requiredPermission: 'settings.formats' },
            { name: 'Ajustes Fiscales (ISLR)', icon: Calculator, path: '/dashboard/settings/general/fiscal', requiredPermission: 'settings.view' },
          ]
        }
      ]
    }
  ];

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#0B1120] print:bg-white text-gray-100 print:text-black flex font-sans">
      {/* SIDEBAR */}
      <aside className={`print:hidden bg-[#0B1120] border-r border-white/5 fixed h-full z-20 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        
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
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 print:ml-0 print:block ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        
        {/* HEADER SUPERIOR */}
        <header className="print:hidden h-20 bg-[#0B1120] flex items-center justify-between px-6 sticky top-0 z-10 border-b border-white/5">
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">
               <Menu size={20} />
             </button>
             
             {/* INDICADORES DE TASA BCV — USD y EUR */}
             <div className="hidden md:flex items-center gap-1.5">
               {/* Badge USD */}
               <button
                 onClick={() => setActiveCurrency('USD')}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 border ${
                   activeCurrency === 'USD'
                     ? 'bg-green-500/15 border-green-500/30 text-green-300'
                     : 'bg-white/5 border-white/10 text-gray-400 hover:border-green-500/20 hover:text-green-400'
                 }`}
               >
                 <span className="font-black text-[10px] uppercase tracking-widest">USD</span>
                 <span className="font-mono text-xs">{usdRate ? usdRate.toFixed(4) : '---'}</span>
               </button>

               {/* Badge EUR */}
               <button
                 onClick={() => setActiveCurrency('EUR')}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 border ${
                   activeCurrency === 'EUR'
                     ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                     : 'bg-white/5 border-white/10 text-gray-400 hover:border-blue-500/20 hover:text-blue-400'
                 }`}
               >
                 <span className="font-black text-[10px] uppercase tracking-widest">EUR</span>
                 <span className="font-mono text-xs">{eurRate ? eurRate.toFixed(4) : '---'}</span>
               </button>

               {/* Botón Refresh — actualiza ambas */}
               <button
                 onClick={syncRates}
                 disabled={loadingRate}
                 className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors border border-white/5"
                 title="Actualizar tasas BCV"
               >
                 <RefreshCw size={13} className={loadingRate ? 'animate-spin' : ''} />
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
        <main className="p-6 md:p-8 flex-1 overflow-auto bg-[#0B1120] print:bg-white print:p-0 print:overflow-visible border-none">
          {children}
        </main>
      </div>
    </div>
  );
}