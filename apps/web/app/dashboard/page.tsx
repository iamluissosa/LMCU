'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { createClient } from '@/lib/supabase';
import {
  DollarSign, Package, AlertTriangle, Activity, TrendingUp, Briefcase,
  Receipt, FileText, CheckCircle, Calendar, ShoppingCart, Users,
  BarChart2, ArrowRightCircle, Zap, Scale, CreditCard, Award,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { MiniTable } from '@/components/dashboard/MiniTable';
import { SalesSparkline } from '@/components/dashboard/SalesSparkline';

const supabase = createClient();

/* ─── Tipos ────────────────────────────────────────────────────────────── */

interface TopClient      { clientId: string; name: string; amount: number; }
interface TopSalesperson { salespersonId: string; name: string; amount: number; }
interface WeeklyPoint    { week: string; total: number; }

interface DashboardStats {
  // Legados
  inventoryValue?:     number;
  totalProducts?:      number;
  lowStockCount?:      number;
  totalUsers?:         number;
  lowStockProducts?:   { id: string; name: string; currentStock: number; priceBase: number }[];
  accountsReceivable?: number;
  invoicesIssuedCount?: number;
  invoicesPaidCount?:  number;
  quotesStats?: {
    sent: number; expired: number; accepted: number; rejected: number; total: number;
  };
  eventsStats?: {
    totalCount: number; activeCount: number; completedCount: number;
    thisMonthCount: number; activeEventsIncome: number;
  };
  // Nuevos: Ventas
  salesStats?: {
    monthlySalesAmount:    number;
    salesDelta:            number | null;
    monthlyCollectedAmount: number;
    collectedDelta:        number | null;
    salesOrdersPending:    number;
    conversionRate:        number;
    topClients:            TopClient[];
  };
  // Nuevos: Compras
  purchaseStats?: {
    accountsPayable:         number;
    dueSoonBillsCount:       number;
    monthlyPaymentsOut:      number;
    paymentsDelta:           number | null;
    openPurchaseOrdersCount: number;
  };
  // Nuevos: Comisiones
  commissionsStats?: {
    earnedThisMonth:  number;
    pendingBalance:   number;
    topSalespersons: TopSalesperson[];
  };
  // Nuevos: Balance
  financialSummary?: {
    monthlyBalance: number;
    liquidityRatio: number | null;
  };
  weeklySales?: WeeklyPoint[];
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */

const fmt = (n?: number) =>
  `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SectionHeader = ({
  icon, label, color, href,
}: { icon: React.ReactNode; label: string; color: string; href?: string }) => (
  <div className="flex justify-between items-center">
    <h2 className={`text-lg font-bold text-gray-300 flex items-center gap-2`}>
      <span className={color}>{icon}</span> {label}
    </h2>
    {href && (
      <a
        href={href}
        className="text-xs bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
      >
        Ver módulo <ArrowRightCircle size={12} />
      </a>
    )}
  </div>
);

/* ─── Página Principal ─────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      try {
        const user = await apiClient.get<{ permissions?: string[] }>('/users/me');
        setPermissions(user.permissions || []);
        const data = await apiClient.get<DashboardStats>('/dashboard/stats');
        setStats(data);
      } catch (err: any) {
        const msg = err?.message ?? 'Error desconocido';
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

  /* ── Estados de carga / error ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="p-10 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-gray-400 animate-pulse font-medium tracking-wide">Cargando dashboard...</p>
      </div>
    );
  }

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
            <button onClick={() => window.location.href = '/dashboard/settings/general/companies'} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
              <TrendingUp size={18} /> Completar Perfil
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Guards de permisos ───────────────────────────────────────────────── */
  const showInventory   = hasPerm('widget.inventory.view') || hasPerm('inventory.view');
  const showLowStock    = hasPerm('widget.low_stock.view');
  const showSales       = hasPerm('widget.sales.view');
  const showFinance     = hasPerm('widget.finance.view');
  const showEvents      = hasPerm('widget.events.view') || hasPerm('events.view');
  const showCommissions = hasPerm('widget.commissions.view') || hasPerm('commissions.view');

  const { salesStats, purchaseStats, commissionsStats, financialSummary, weeklySales } = stats;

  /* ── Columnas de tablas ──────────────────────────────────────────────── */
  const clientColumns = [
    { key: 'name',   label: 'Cliente', render: (r: TopClient) => <span className="font-medium text-gray-200">{r.name}</span> },
    { key: 'amount', label: 'Facturado', align: 'right' as const, render: (r: TopClient) => <span className="font-mono text-emerald-400">{fmt(r.amount)}</span> },
  ];

  const spColumns = [
    { key: 'name',   label: 'Vendedor', render: (r: TopSalesperson) => <span className="font-medium text-gray-200">{r.name}</span> },
    { key: 'amount', label: 'Comisión', align: 'right' as const, render: (r: TopSalesperson) => <span className="font-mono text-amber-400">{fmt(r.amount)}</span> },
  ];

  const balancePositive = (financialSummary?.monthlyBalance ?? 0) >= 0;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-400">Vista consolidada de indicadores según tu rol</p>
        </div>
        <div className="text-xs text-gray-600 bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg">
          {new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ── GRUPO 1: VENTAS PROFUNDAS ─────────────────────────────────── */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showSales && (
        <section className="space-y-4">
          <SectionHeader
            icon={<TrendingUp size={20} />}
            label="Ventas del Mes"
            color="text-indigo-400"
            href="/dashboard/sales"
          />

          {/* KPIs principales de ventas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            <StatCard
              title="Facturado (Mes Actual)"
              value={fmt(salesStats?.monthlySalesAmount)}
              subtitle="vs mes anterior"
              icon={<Receipt size={20} />}
              colorClass="bg-indigo-500/20 text-indigo-400"
              delta={salesStats?.salesDelta}
              wide
            />

            <StatCard
              title="Ingresos Cobrados"
              value={fmt(salesStats?.monthlyCollectedAmount)}
              subtitle="PaymentIn del mes"
              icon={<DollarSign size={20} />}
              colorClass="bg-emerald-500/20 text-emerald-400"
              delta={salesStats?.collectedDelta}
            />

            <StatCard
              title="OV Pendientes de Facturar"
              value={salesStats?.salesOrdersPending ?? 0}
              subtitle="Órdenes activas sin factura"
              icon={<ShoppingCart size={20} />}
              colorClass="bg-orange-500/20 text-orange-400"
              badge={
                (salesStats?.salesOrdersPending ?? 0) > 0 ? (
                  <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">
                    Acción requerida
                  </span>
                ) : undefined
              }
              href="/dashboard/sales"
            />

            <StatCard
              title="Tasa de Conversión"
              value={`${salesStats?.conversionRate ?? 0}%`}
              subtitle="Cotización → Pedido"
              icon={<Zap size={20} />}
              colorClass="bg-purple-500/20 text-purple-400"
            />
          </div>

          {/* Fila: Túnel de cotizaciones + Top 5 Clientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Túnel de cotizaciones */}
            <div className="bg-[#1A1F2C] p-6 rounded-2xl border border-white/5 shadow-lg">
              <div className="flex items-center gap-2 mb-5">
                <FileText size={18} className="text-indigo-400" />
                <p className="text-sm font-semibold text-gray-300">Túnel de Cotizaciones (Histórico)</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Enviadas',   value: stats.quotesStats?.sent,     color: 'text-blue-400',    bg: 'bg-blue-500/10' },
                  { label: 'Aceptadas',  value: stats.quotesStats?.accepted,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Vencidas',   value: stats.quotesStats?.expired,   color: 'text-orange-400',  bg: 'bg-orange-500/10' },
                  { label: 'Rechazadas', value: stats.quotesStats?.rejected,  color: 'text-red-400',     bg: 'bg-red-500/10' },
                ].map((item) => (
                  <div key={item.label} className={`${item.bg} rounded-xl p-3 text-center`}>
                    <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                    <p className={`text-xl font-bold ${item.color}`}>{item.value ?? 0}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 clientes */}
            <div className="bg-[#1A1F2C] p-6 rounded-2xl border border-white/5 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} className="text-indigo-400" />
                <p className="text-sm font-semibold text-gray-300">Top 5 Clientes del Mes</p>
              </div>
              <MiniTable
                rows={salesStats?.topClients ?? []}
                columns={clientColumns}
                emptyMessage="Sin facturas emitidas este mes"
                rankBadge
              />
            </div>
          </div>

          {/* Sparkline de tendencia semanal */}
          {(weeklySales?.length ?? 0) > 0 && (
            <div className="bg-[#1A1F2C] p-6 rounded-2xl border border-white/5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 size={18} className="text-indigo-400" />
                  <p className="text-sm font-semibold text-gray-300">Tendencia de Ventas (últimas 8 semanas)</p>
                </div>
                <span className="text-xs text-gray-500 bg-white/5 px-2.5 py-1 rounded-md">Monto facturado en USD</span>
              </div>
              <SalesSparkline data={weeklySales ?? []} />
            </div>
          )}
        </section>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ── GRUPO 2: TESORERÍA: CxC + CxP + BALANCE ─────────────────── */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showFinance && (
        <section className="space-y-4">
          <SectionHeader icon={<Briefcase size={20} />} label="Tesorería y Compras" color="text-emerald-400" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* CxC */}
            <StatCard
              title="Cuentas por Cobrar (CxC)"
              value={fmt(stats.accountsReceivable)}
              subtitle={`${stats.invoicesPaidCount ?? 0} cobradas · ${stats.invoicesIssuedCount ?? 0} emitidas (mes)`}
              icon={<Receipt size={20} />}
              colorClass="bg-blue-500/20 text-blue-400"
              wide
            />

            {/* CxP */}
            <StatCard
              title="Cuentas por Pagar (CxP)"
              value={fmt(purchaseStats?.accountsPayable)}
              subtitle="Facturas de compra pendientes"
              icon={<CreditCard size={20} />}
              colorClass="bg-red-500/20 text-red-400"
              badge={
                (purchaseStats?.dueSoonBillsCount ?? 0) > 0 ? (
                  <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">
                    {purchaseStats?.dueSoonBillsCount} vencen en 7d
                  </span>
                ) : undefined
              }
            />

            {/* Egresos del mes */}
            <StatCard
              title="Egresos del Mes"
              value={fmt(purchaseStats?.monthlyPaymentsOut)}
              subtitle="vs mes anterior"
              icon={<ArrowRightCircle size={20} />}
              colorClass="bg-rose-500/20 text-rose-400"
              delta={purchaseStats?.paymentsDelta}
            />

            {/* OC Abiertas */}
            <StatCard
              title="OC Abiertas"
              value={purchaseStats?.openPurchaseOrdersCount ?? 0}
              subtitle="Órdenes de compra activas"
              icon={<ShoppingCart size={20} />}
              colorClass="bg-amber-500/20 text-amber-400"
              href="/dashboard/purchase-orders"
            />

          </div>

          {/* Balance del mes + Ratio Liquidez */}
          {financialSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              <div className={`bg-[#1A1F2C] p-6 rounded-2xl border shadow-lg ${balancePositive ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-medium text-gray-400">Balance del Mes</p>
                  <div className={`p-2.5 rounded-xl ${balancePositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    <Scale size={20} />
                  </div>
                </div>
                <h3 className={`text-4xl font-bold tracking-tight ${balancePositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmt(financialSummary.monthlyBalance)}
                </h3>
                <p className="text-xs text-gray-500 mt-2">Ingresos cobrados − Egresos pagados</p>
              </div>

              <div className="bg-[#1A1F2C] p-6 rounded-2xl border border-white/5 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-medium text-gray-400">Ratio de Liquidez (CxC / CxP)</p>
                  <div className="bg-cyan-500/20 text-cyan-400 p-2.5 rounded-xl">
                    <Activity size={20} />
                  </div>
                </div>
                {financialSummary.liquidityRatio !== null ? (
                  <>
                    <h3 className={`text-4xl font-bold tracking-tight ${financialSummary.liquidityRatio >= 1 ? 'text-cyan-400' : 'text-orange-400'}`}>
                      {financialSummary.liquidityRatio.toFixed(2)}x
                    </h3>
                    <p className="text-xs mt-2 text-gray-500">
                      {financialSummary.liquidityRatio >= 1
                        ? 'CxC cubre la deuda actual ✅'
                        : 'CxC insuficiente para cubrir CxP ⚠️'}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm mt-3">Sin deudas pendientes</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ── GRUPO 3: COMISIONES ──────────────────────────────────────── */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showCommissions && (
        <section className="space-y-4">
          <SectionHeader
            icon={<Award size={20} />}
            label="Comisiones de Ventas"
            color="text-amber-400"
            href="/dashboard/settings/commissions"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* KPIs de comisiones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-1 gap-5">
              <StatCard
                title="Generadas (Mes Actual)"
                value={fmt(commissionsStats?.earnedThisMonth)}
                subtitle="Comisiones EARNED"
                icon={<DollarSign size={20} />}
                colorClass="bg-amber-500/20 text-amber-400"
              />
              <StatCard
                title="Saldo Por Pagar"
                value={fmt(commissionsStats?.pendingBalance)}
                subtitle="Balance neto acumulado"
                icon={<CreditCard size={20} />}
                colorClass="bg-orange-500/20 text-orange-400"
                badge={
                  (commissionsStats?.pendingBalance ?? 0) > 0 ? (
                    <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">
                      Pendiente de pago
                    </span>
                  ) : undefined
                }
              />
            </div>

            {/* Ranking de vendedores */}
            <div className="bg-[#1A1F2C] p-6 rounded-2xl border border-white/5 shadow-lg lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Award size={18} className="text-amber-400" />
                <p className="text-sm font-semibold text-gray-300">Ranking Vendedores del Mes</p>
              </div>
              <MiniTable
                rows={commissionsStats?.topSalespersons ?? []}
                columns={spColumns}
                emptyMessage="Sin comisiones registradas este mes"
                rankBadge
              />
            </div>
          </div>
        </section>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ── GRUPO 4: EVENTOS ──────────────────────────────────────────── */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showEvents && (
        <section className="space-y-4">
          <SectionHeader
            icon={<Calendar size={20} />}
            label="Eventos y Proyectos"
            color="text-pink-400"
            href="/dashboard/events"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Eventos Activos"
              value={stats.eventsStats?.activeCount ?? 0}
              subtitle="En ejecución"
              icon={<Activity size={20} />}
              colorClass="bg-pink-500/20 text-pink-400"
            />
            <StatCard
              title="Ingresos (Eventos Activos)"
              value={fmt(stats.eventsStats?.activeEventsIncome)}
              subtitle={`${stats.eventsStats?.completedCount ?? 0} completados · ${stats.eventsStats?.totalCount ?? 0} totales`}
              icon={<DollarSign size={20} />}
              colorClass="bg-emerald-500/20 text-emerald-400"
              wide
            />
            <StatCard
              title="Eventos del Mes"
              value={stats.eventsStats?.thisMonthCount ?? 0}
              subtitle="Registrados este mes"
              icon={<Calendar size={20} />}
              colorClass="bg-blue-500/20 text-blue-400"
            />
          </div>
        </section>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ── GRUPO 5: INVENTARIO ───────────────────────────────────────── */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {(showInventory || showLowStock) && (
        <section className="space-y-4">
          <SectionHeader icon={<Package size={20} />} label="Inventario y Almacén" color="text-purple-400" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {showInventory && (
              <>
                <StatCard
                  title="Valor del Inventario"
                  value={fmt(stats.inventoryValue)}
                  subtitle="Precio base × stock actual"
                  icon={<DollarSign size={20} />}
                  colorClass="bg-emerald-500/20 text-emerald-400"
                />
                <StatCard
                  title="Total Productos"
                  value={stats.totalProducts ?? 0}
                  subtitle="En catálogo activo"
                  icon={<Package size={20} />}
                  colorClass="bg-purple-500/20 text-purple-400"
                />
              </>
            )}
            {showLowStock && (
              <StatCard
                title="Stock Crítico"
                value={stats.lowStockCount ?? 0}
                subtitle="Productos por agotarse (≤10 un.)"
                icon={<AlertTriangle size={20} />}
                colorClass="bg-orange-500/20 text-orange-400"
                badge={
                  (stats.lowStockCount ?? 0) > 0 ? (
                    <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">
                      Requiere atención
                    </span>
                  ) : undefined
                }
              />
            )}
            <StatCard
              title="Usuarios Activos"
              value={stats.totalUsers ?? 0}
              subtitle="Registrados en la empresa"
              icon={<Users size={20} />}
              colorClass="bg-sky-500/20 text-sky-400"
            />
          </div>

          {/* Tabla de stock crítico */}
          {showLowStock && (stats.lowStockProducts?.length ?? 0) > 0 && (
            <div className="bg-[#1A1F2C] rounded-2xl shadow-lg border border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5 flex justify-between items-center">
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
                    {stats.lowStockProducts?.map((prod) => (
                      <tr key={prod.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-200">{prod.name}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-full text-xs font-bold">
                            {prod.currentStock} un.
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-gray-400">${Number(prod.priceBase).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Sin permisos visibles */}
      {!showSales && !showFinance && !showInventory && !showLowStock && !showEvents && !showCommissions && (
        <div className="text-center py-20 text-gray-600">
          <BarChart2 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No tienes widgets configurados</p>
          <p className="text-sm mt-1">Contacta al administrador para asignar permisos de visualización</p>
        </div>
      )}
    </div>
  );
}