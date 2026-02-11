'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, Package, Users, Settings, LogOut, 
  Menu, Building2, UserCircle 
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

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      // 1. Obtener datos del usuario desde NUESTRA API (para tener nombre y empresa)
      try {
        const res = await fetch('http://localhost:3001/profile', { // Asumiendo que existe endpoint profile, si no, lo simulo abajo con la sesión
           headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        // Si tienes un endpoint /profile úsalo, si no, usaremos la lógica local:
        // Por ahora, buscaré el usuario por su email en la lista (truco rápido)
        // O mejor: decodificamos el token si el backend lo envía.
        
        // ESTRATEGIA SEGURA: Consultar el usuario actual al backend
        const resUser = await fetch(`http://localhost:3001/users/${session.user.id}`, { // Ojo: Necesitas endpoint que busque por ID de Supabase o Email
             headers: { Authorization: `Bearer ${session.access_token}` }
        });

        // ⚠️ SI NO TIENES endpoint para "mi perfil", usaremos el email del session como fallback
        // Pero intentemos mostrar el nombre real si lo guardaste en metadata de supabase
        const { user } = session;
        
        // Intentar obtener el nombre desde la API de usuarios filtrando por email (Solución temporal efectiva)
        const resApi = await fetch('http://localhost:3001/users', {
            headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (resApi.ok) {
            const users = await resApi.json();
            const myUser = users.find((u: any) => u.email === user.email);
            if (myUser) {
                setUserName(myUser.name);
                setUserRole(myUser.role);
                setCompanyName(myUser.company?.name || "Sin Empresa");
            } else {
                setUserName(user.email?.split('@')[0] || "Usuario");
            }
        }

      } catch (e) {
        console.error(e);
      }
    };

    getUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Inventario', icon: Package, path: '/dashboard/inventory' },
    { name: 'Configuración', icon: Settings, path: '/dashboard/settings/companies' }, // Ajusta tus rutas
    { name: 'Usuarios', icon: Users, path: '/dashboard/settings/users' },
  ];

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

        {/* INFO DEL USUARIO (Aquí está la magia ✨) */}
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
          {menuItems.map((item) => (
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