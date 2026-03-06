'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { createClient } from '@/lib/supabase';
import {
  DollarSign, Package, AlertTriangle, Activity, TrendingUp, Briefcase, Receipt, FileText, CheckCircle
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
  accountsReceivable?: number;
  invoicesIssuedCount?: number;
  invoicesPaidCount?: number;
  quotesStats?: { sent: number; expired: number; accepted: number; rejected: number };
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
    lowStockProducts: [],
    accountsReceivable: 0,
    invoicesIssuedCount: 0,
    invoicesPaidCount: 0,
    quotesStats: { sent: 0, expired: 0, accepted: 0, rejected: 0 }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      try {
        const user = await apiClient.get<any>('/users/me');
        const userPerms = user.permissions || [];
        setPermissions(userPerms);

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

  const hasPerm = (p: string) => permissions.includes(p) || permissions.includes('*');

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

  // --- Widgets Configuration ---
  const showInventory = hasPerm('widget.inventory.view') || hasPerm('inventory.view');
  const showLowStock = hasPerm('widget.low_stock.view');
  const showSales = hasPerm('widget.sales.view');
  const showFinance = hasPerm('widget.finance.view');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER */}
      <div className="flex justify-between items-end">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-400">Vista consolidada de indicadores según tu rol</p>
          </div>
      </div>

      {/* ── MÓDULO DE INVENTARIO ── */}
      {(showInventory || showLowStock) && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2">
            <Package size={20} className="text-purple-400"/> Operaciones y Almacén
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {showInventory && (
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
                     <TrendingUp size={12} /> Saldo monetario
                  </p>
                </div>
              </div>
            )}

            {showInventory && (
              <div className="bg-[#1A1F2C] p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-medium text-gray-400">Total Productos</p>
                  <div className="bg-purple-500/20 p-2.5 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                    <Package size={20} />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white tracking-tight">{stats?.totalProducts}</h3>
                  <p className="text-xs text-purple-400 font-medium mt-2">En Catálogo Activo</p>
                </div>
              </div>
            )}

            {showLowStock && (
              <div className="bg-[#1A1F2C] p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-medium text-gray-400">Stock Crítico</p>
                  <div className="bg-orange-500/20 p-2.5 rounded-xl text-orange-400 group-hover:scale-110 transition-transform">
                    <AlertTriangle size={20} />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white tracking-tight">{stats?.lowStockCount}</h3>
                  <p className="text-xs text-orange-400 font-medium mt-2">Productos por agotarse</p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── MÓDULO DE FINANZAS / TESORERÍA ── */}
      {showFinance && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2">
            <Briefcase size={20} className="text-emerald-400"/> Tesorería
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-[#1A1F2C] p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden group hover:border-white/10 transition-colors lg:col-span-2">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-medium text-gray-400">Cuentas por Cobrar (Facturas Emitidas vs Pagos)</p>
                <div className="bg-blue-500/20 p-2.5 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                  <Briefcase size={20} />
                </div>
              </div>
              <div>
                <h3 className="text-4xl font-bold text-white tracking-tight">
                  ${stats?.accountsReceivable?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
                <div className="flex gap-4 mt-3">
                   <p className="text-xs text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                      <CheckCircle size={12}/> {stats?.invoicesPaidCount} Cobradas (Mes)
                   </p>
                   <p className="text-xs text-blue-400 font-medium flex items-center gap-1 bg-blue-500/10 px-2.5 py-1 rounded-md">
                      <Receipt size={12}/> {stats?.invoicesIssuedCount} Emitidas (Mes)
                   </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── MÓDULO DE VENTAS ── */}
      {showSales && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-400"/> Ventas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-[#1A1F2C] p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden group hover:border-white/10 transition-colors lg:col-span-2">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-medium text-gray-400">Túnel de Cotizaciones (Histórico)</p>
                <div className="bg-indigo-500/20 p-2.5 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform">
                  <FileText size={20} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-4">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Enviadas</p>
                      <p className="text-xl font-bold text-blue-400">{stats?.quotesStats?.sent}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Aceptadas</p>
                      <p className="text-xl font-bold text-emerald-400">{stats?.quotesStats?.accepted}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Vencidas</p>
                      <p className="text-xl font-bold text-orange-400">{stats?.quotesStats?.expired}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Rechazadas</p>
                      <p className="text-xl font-bold text-red-400">{stats?.quotesStats?.rejected}</p>
                  </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SECCIÓN INFERIOR: TABLA RÁPIDA (Siempre visible si tiene perms de Stock) */}
      {showLowStock && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        </div>
      )}
    </div>
  );
}