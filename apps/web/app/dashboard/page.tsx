'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { createClient } from '@/lib/supabase';
import {
  DollarSign, Package, Users, AlertTriangle, Activity, TrendingUp, Briefcase
} from 'lucide-react';

const supabase = createClient();

interface DashboardStats {
  monthlySales: number;
  activeOrders: number;
  lowStockItems: number;
  totalCustomers: number;
  inventoryValue?: number;
  totalProducts?: number;
  lowStockCount?: number;
  totalUsers?: number;
  lowStockProducts?: { id: string; name: string; currentStock: number; priceBase: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    monthlySales: 0,
    activeOrders: 0,
    lowStockItems: 0,
    totalCustomers: 0,
    inventoryValue: 0,
    totalProducts: 0,
    lowStockCount: 0,
    totalUsers: 0,
    lowStockProducts: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiClient.get<DashboardStats>('/dashboard/stats');
        setStats(data);
      } catch (error: any) {
        const msg = error.message || 'Error desconocido';
        console.error('Error cargando dashboard:', msg);
        if (msg.includes('Access Denied')) {
          setError('No tienes permisos para ver las estadísticas o tu registro está incompleto.');
        } else {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-400 animate-pulse font-medium tracking-wide">Cargando métricas...</div>;

  if (error) {
    return (
      <div className="p-10 text-center max-w-2xl mx-auto">
        <div className="bg-[#1A1F2C] border border-red-500/20 p-8 rounded-2xl shadow-lg">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
             <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 font-medium hover:bg-white/10 flex items-center gap-2 transition-colors">
                <Activity size={18} /> Reintentar
             </button>
             <button onClick={() => window.location.href='/dashboard/settings/general/companies'} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
                <TrendingUp size={18} /> Completar Perfil
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-400">Vista consolidada de indicadores operativos</p>
      </div>

      {/* TARJETAS KPI (INDICADORES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Valor Inventario */}
        <div className="bg-[#1A1F2C] p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-gray-400">Valor Inventario</p>
            <div className="bg-emerald-500/20 p-2.5 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white tracking-tight">
              ${stats?.inventoryValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-emerald-400 font-medium mt-2 flex items-center gap-1">
               <TrendingUp size={12} /> Saldo de almacén
            </p>
          </div>
        </div>

        {/* Card 2: Total Productos */}
        <div className="bg-[#1A1F2C] p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-gray-400">Productos</p>
            <div className="bg-purple-500/20 p-2.5 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
              <Package size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white tracking-tight">{stats?.totalProducts}</h3>
            <p className="text-xs text-purple-400 font-medium mt-2 flex items-center gap-1">
               Catálogo activo
            </p>
          </div>
        </div>

        {/* Card 3: Equipo */}
        <div className="bg-[#1A1F2C] p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-gray-400">Equipo</p>
            <div className="bg-blue-500/20 p-2.5 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white tracking-tight">{stats?.totalUsers}</h3>
            <p className="text-xs text-blue-400 font-medium mt-2 flex items-center gap-1">
               Usuarios registrados
            </p>
          </div>
        </div>

        {/* Card 4: Alertas Stock */}
        <div className="bg-[#1A1F2C] p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-gray-400">Stock Crítico</p>
            <div className="bg-orange-500/20 p-2.5 rounded-xl text-orange-400 group-hover:scale-110 transition-transform">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white tracking-tight">{stats?.lowStockCount}</h3>
            <p className="text-xs text-orange-400 font-medium mt-2 flex items-center gap-1">
               Requieren atención
            </p>
          </div>
        </div>
        
      </div>

      {/* SECCIÓN INFERIOR: TABLA RÁPIDA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tabla de Alertas de Stock */}
        <div className="lg:col-span-2 bg-[#1A1F2C] rounded-2xl shadow-lg border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Activity size={18} className="text-orange-400" /> Productos por Agotarse
            </h3>
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-full font-bold">Atención</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-white/5 text-gray-400 font-medium uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4 text-center">Stock Actual</th>
                  <th className="px-6 py-4 text-right">Precio Base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats?.lowStockProducts?.length === 0 ? (
                  <tr><td colSpan={3} className="p-8 text-center text-gray-500">Todo el inventario está saludable ✅</td></tr>
                ) : (
                  stats?.lowStockProducts?.map((prod) => (
                    <tr key={prod.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-200">{prod.name}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-full text-xs font-bold">
                          {prod.currentStock} un.
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-400">${Number(prod.priceBase).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Banner Informativo (Placeholder) */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-800 rounded-2xl shadow-lg p-8 text-white flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative z-10">
            <div className="bg-white/10 w-fit p-3 rounded-xl mb-4">
              <Briefcase size={24} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 tracking-tight">
              Gestión Corporativa
            </h3>
            <p className="text-indigo-100 text-sm mb-8 leading-relaxed">
              Administra todas las entidades de tu grupo desde un solo lugar. Optimiza recursos y analiza el progreso.
            </p>
          </div>
          <button className="relative z-10 bg-white text-indigo-900 font-bold py-3 px-4 rounded-xl text-sm hover:bg-indigo-50 transition-colors shadow-lg shadow-black/20">
            Ir a Configuración
          </button>
        </div>

      </div>
    </div>
  );
}