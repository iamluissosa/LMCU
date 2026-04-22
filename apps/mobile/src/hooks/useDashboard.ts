import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ─────────────────────────────────────────────
// Tipos del dominio Dashboard
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
// Query Keys centralizados (evita duplicados)
// ─────────────────────────────────────────────

export const dashboardKeys = {
  all: ['dashboard'] as const,
  metrics: () => [...dashboardKeys.all, 'metrics'] as const,
};

// ─────────────────────────────────────────────
// Hook: useDashboardMetrics
// ─────────────────────────────────────────────

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: dashboardKeys.metrics(),
    queryFn: () => apiClient.get<DashboardMetrics>('/dashboard/metrics'),
    // Refresco automático cada 5 minutos (dashboard de ventas)
    staleTime: 5 * 60 * 1000,
    // Mantiene datos previos mientras se re-fetcha
    placeholderData: (prev) => prev,
  });
}
