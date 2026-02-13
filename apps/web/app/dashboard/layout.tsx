'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, Package, Users, Settings, LogOut, 
  Menu, Building2, UserCircle, Truck, ShoppingCart, ClipboardCheck, DollarSign, CreditCard, RefreshCw
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      try {
        // ✅ Usamos el nuevo endpoint optimizado
        const res = await fetch('http://localhost:3001/users/me', {
           headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (res.ok) {
            const myUser = await res.json();
            // Si el backend no devuelve el nombre (pq está en otra tabla), usamos el email
            // Pero como el strategy ya tiene acceso a todo, idealmente el backend debería devolverlo.
            // Por ahora, asumimos que req.user tiene lo básico.
            // Si req.user no trae 'name', lo sacamos del email.
            setUserName(myUser.name || session.user.email?.split('@')[0] || "Usuario");
            setUserRole(myUser.roleName || myUser.role); // Mostrar nombre del rol custom o el legacy
            setCompanyName(myUser.companyId ? "Mi Empresa" : "Sin Empresa"); // O idealmente traer el nombre de la empresa en /me
            setUserPermissions(myUser.permissions || []);
        }

      } catch (e) {
        console.error(e);
      }
    };

    getUser();
    getUser();
  }, [router]);

  // Fetch Tasa BCV al cargar
  useEffect(() => {
    const getRate = async () => {
        try {
            const res = await fetch('http://localhost:3001/exchange-rates/latest');
            if (res.ok) {
                const text = await res.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data && data.rate) setBcvRate(Number(data.rate));
                }
            }
        } catch (error) {
            console.error("Error fetching rate", error);
        }
    };
    getRate();
  }, []);

  const syncRate = async () => {
    setLoadingRate(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
        const res = await fetch('http://localhost:3001/exchange-rates/sync', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setBcvRate(Number(data.rate));
            alert(`Tasa actualizada: ${data.rate}`);
        } else {
            alert("Error actualizando tasa");
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión");
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
    { name: 'Tesorería', icon: CreditCard, path: '/dashboard/accounting/payments' },
    { name: 'Pagos de Factura', icon: DollarSign, path: '/dashboard/accounting/bills', requiredPermission: 'bills.view' },
    { name: 'Registrar Pago', icon: CreditCard, path: '/dashboard/accounting/payments/new', requiredPermission: 'payments.create' },
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

        {/* INFO DEL USUARIO */}
        <div className={`p-4 border-b border-gray-100 ${!isSidebarOpen && 'hidden'}`}>
            <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                    <UserCircle size={24} />
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-gray-800 truncate">{userName}</p>
                    <p className="text-xs text-gray-500 truncate">{companyName}</p>
                </div>
            </div>
        </div>

        <nav className="p-4 space-y-2">
          {filteredMenu.map((item) => (
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
          ))}
        </nav>

        <div className="absolute bottom-4 left-0 w-full px-4">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 w-full rounded-lg text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
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