import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ─────────────────────────────────────────────
// Tipos del dominio Comisiones
// ─────────────────────────────────────────────

export type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

export interface Commission {
  id: string;
  sellerId: string;
  sellerName: string;
  saleId: string;
  saleReference: string;
  amount: number;
  percentage: number;
  status: CommissionStatus;
  period: string;
  paidAt?: string;
  createdAt: string;
}

export interface CommissionSummary {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  currentPeriodAmount: number;
  items: Commission[];
}

interface CommissionFilters {
  status?: CommissionStatus;
  period?: string;
  sellerId?: string;
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────

export const commissionKeys = {
  all: ['commissions'] as const,
  list: (filters: CommissionFilters) => [...commissionKeys.all, 'list', filters] as const,
  summary: (sellerId?: string) => [...commissionKeys.all, 'summary', sellerId] as const,
  detail: (id: string) => [...commissionKeys.all, 'detail', id] as const,
};

// ─────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────

export function useCommissions(filters: CommissionFilters = {}) {
  return useQuery<CommissionSummary>({
    queryKey: commissionKeys.list(filters),
    queryFn: () =>
      apiClient.get<CommissionSummary>('/commissions', filters as Record<string, string | number>),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useCommissionSummary(sellerId?: string) {
  return useQuery<CommissionSummary>({
    queryKey: commissionKeys.summary(sellerId),
    queryFn: () =>
      apiClient.get<CommissionSummary>('/commissions/summary', sellerId ? { sellerId } : undefined),
    staleTime: 5 * 60 * 1000,
  });
}
