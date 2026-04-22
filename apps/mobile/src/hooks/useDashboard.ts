import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ─────────────────────────────────────────────
// Tipos: Respuesta real del backend GET /dashboard/stats
// ─────────────────────────────────────────────

interface BackendDashboardResponse {
  totalProducts: number;
  totalUsers: number;
  lowStockCount: number;
  inventoryValue: number;
  accountsReceivable: number;
  invoicesIssuedCount: number;
  invoicesPaidCount: number;
  quotesStats: {
    sent: number;
    expired: number;
    accepted: number;
    rejected: number;
    total: number;
  };
  salesStats: {
    monthlySalesAmount: number;
    salesDelta: number | null;
    monthlyCollectedAmount: number;
    collectedDelta: number | null;
    salesOrdersPending: number;
    conversionRate: number;
    topClients: Array<{ clientId: string; name: string; amount: number }>;
  };
  commissionsStats: {
    earnedThisMonth: number;
    pendingBalance: number;
    topSalespersons: Array<{ salespersonId: string; name: string; amount: number }>;
  };
  financialSummary: {
    monthlyBalance: number;
    liquidityRatio: number | null;
  };
  eventsStats: {
    totalCount: number;
    activeCount: number;
    completedCount: number;
    thisMonthCount: number;
    activeEventsIncome: number;
  };
  purchaseStats: {
    accountsPayable: number;
    dueSoonBillsCount: number;
    monthlyPaymentsOut: number;
    paymentsDelta: number | null;
    openPurchaseOrdersCount: number;
  };
  weeklySales: Array<{ week: string; total: number }>;
}

// ─────────────────────────────────────────────
// Tipos: Formato adaptado para la UI del mobile
// ─────────────────────────────────────────────

export interface DashboardMetrics {
  sales: {
    totalRevenue: number;
    totalSales: number;
    growthPercent: number;
    pendingCount: number;
  };
  commissions: {
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    sellersCount: number;
  };
  quotes: {
    totalCount: number;
    approvedCount: number;
    pendingCount: number;
    conversionRate: number;
  };
  topSellers: Array<{
    id: string;
    name: string;
    revenue: number;
    commission: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'sale' | 'quote' | 'commission';
    description: string;
    amount: number;
    createdAt: string;
  }>;
}

// ─────────────────────────────────────────────
// Transformador: Backend → Mobile UI
// Mapea la estructura plana del backend a la
// estructura jerárquica que espera la pantalla
// ─────────────────────────────────────────────

function transformBackendToMobile(raw: BackendDashboardResponse): DashboardMetrics {
  return {
    sales: {
      totalRevenue: raw.salesStats?.monthlySalesAmount ?? 0,
      totalSales: raw.invoicesIssuedCount ?? 0,
      growthPercent: raw.salesStats?.salesDelta ?? 0,
      pendingCount: raw.salesStats?.salesOrdersPending ?? 0,
    },
    commissions: {
      totalAmount: raw.commissionsStats?.earnedThisMonth ?? 0,
      // paidAmount = earnedThisMonth - pendingBalance (lo que ya se pagó)
      paidAmount: Math.max(
        0,
        (raw.commissionsStats?.earnedThisMonth ?? 0) - (raw.commissionsStats?.pendingBalance ?? 0),
      ),
      pendingAmount: raw.commissionsStats?.pendingBalance ?? 0,
      sellersCount: raw.commissionsStats?.topSalespersons?.length ?? 0,
    },
    quotes: {
      totalCount: raw.quotesStats?.total ?? 0,
      approvedCount: raw.quotesStats?.accepted ?? 0,
      pendingCount: raw.quotesStats?.sent ?? 0,
      conversionRate: raw.salesStats?.conversionRate ?? 0,
    },
    topSellers: (raw.commissionsStats?.topSalespersons ?? []).map((sp) => ({
      id: sp.salespersonId,
      name: sp.name,
      revenue: sp.amount,
      commission: sp.amount,
    })),
    // El backend no tiene un feed de actividad reciente — dejamos vacío
    recentActivity: [],
  };
}

// ─────────────────────────────────────────────
// Query Keys centralizados (evita duplicados)
// ─────────────────────────────────────────────

export const dashboardKeys = {
  all: ['dashboard'] as const,
  metrics: () => [...dashboardKeys.all, 'metrics'] as const,
};

// ─────────────────────────────────────────────
// Hook: useDashboardMetrics
// Llama a GET /dashboard/stats (endpoint real del backend)
// y transforma la respuesta al formato del mobile
// ─────────────────────────────────────────────

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: dashboardKeys.metrics(),
    queryFn: async () => {
      const raw = await apiClient.get<BackendDashboardResponse>('/dashboard/stats');
      return transformBackendToMobile(raw);
    },
    // Refresco automático cada 5 minutos (dashboard de ventas)
    staleTime: 5 * 60 * 1000,
    // Mantiene datos previos mientras se re-fetcha
    placeholderData: (prev) => prev,
  });
}
