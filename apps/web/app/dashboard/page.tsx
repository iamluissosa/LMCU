'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  DollarSign, Package, Users, AlertTriangle, Activity, TrendingUp
} from 'lucide-react';

// Interface local temporal hasta que se mueva a @erp/types
interface DashboardStats {
  monthlySales: number;
  activeOrders: number;
  lowStockItems: number;
  totalCustomers: number;
  inventoryValue?: number;
  totalProducts?: number;
  lowStockCount?: number;
  totalUsers?: number;
  lowStockProducts?: any[];
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.get<DashboardStats>('/dashboard/stats');
        setStats(data);
      } catch (error) {
        console.error("Error cargando dashboard", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div className="p-10 text-center">Cargando indicadores...</div>;

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Panel de Control</h1>
        <p className="text-gray-500">Resumen general de tu operación</p>
      </div>

      {/* TARJETAS KPI (INDICADORES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Valor Inventario */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Valor Inventario</p>
            <h3 className="text-2xl font-bold text-gray-800">
              ${stats?.inventoryValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="bg-green-100 p-3 rounded-lg text-green-600">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Card 2: Total Productos */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Productos</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats?.totalProducts}</h3>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
            <Package size={24} />
          </div>
        </div>

        {/* Card 3: Alertas Stock */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Stock Bajo</p>
            <h3 className="text-2xl font-bold text-red-600">{stats?.lowStockCount}</h3>
          </div>
          <div className="bg-red-100 p-3 rounded-lg text-red-600">
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Card 4: Usuarios */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Equipo</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats?.totalUsers}</h3>
          </div>
          <div className="bg-purple-100 p-3 rounded-lg text-purple-600">
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* SECCIÓN INFERIOR: TABLA RÁPIDA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Tabla de Alertas de Stock */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Activity size={18} className="text-red-500" /> Productos por Agotarse
            </h3>
            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">Crítico</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Producto</th>
                  <th className="px-6 py-3 text-center">Stock Actual</th>
                  <th className="px-6 py-3 text-right">Precio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats?.lowStockProducts?.length === 0 ? (
                  <tr><td colSpan={3} className="p-6 text-center text-gray-400">Todo el inventario está saludable ✅</td></tr>
                ) : (
                  stats?.lowStockProducts?.map((prod: any) => (
                    <tr key={prod.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">{prod.name}</td>
                      <td className="px-6 py-3 text-center">
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
                          {prod.currentStock} un.
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-gray-900">${Number(prod.priceBase).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Banner Informativo (Placeholder) */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <TrendingUp /> Próximos Pasos
            </h3>
            <p className="text-blue-100 text-sm mb-6">
              Tu sistema está creciendo. Asegúrate de mantener actualizados los RIF de tus empresas para evitar problemas fiscales.
            </p>
          </div>
          <button className="bg-white text-blue-600 font-bold py-2 px-4 rounded-lg text-sm hover:bg-blue-50 transition-colors w-full">
            Ver Configuración
          </button>
        </div>

      </div>
    </div>
  );
}