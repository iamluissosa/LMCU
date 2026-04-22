import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ─────────────────────────────────────────────
// Tipos del dominio Cotizaciones
// ─────────────────────────────────────────────

export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export interface Quote {
  id: string;
  reference: string;
  clientId: string;
  clientName: string;
  sellerId: string;
  sellerName: string;
  status: QuoteStatus;
  items: QuoteItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  validUntil: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteListItem {
  id: string;
  reference: string;
  clientName: string;
  status: QuoteStatus;
  total: number;
  validUntil: string;
  createdAt: string;
}

interface QuotesResponse {
  items: QuoteListItem[];
  total: number;
  page: number;
  limit: number;
}

interface QuoteFilters {
  status?: QuoteStatus;
  clientId?: string;
  sellerId?: string;
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────

export const quoteKeys = {
  all: ['quotes'] as const,
  list: (filters: QuoteFilters) => [...quoteKeys.all, 'list', filters] as const,
  detail: (id: string) => [...quoteKeys.all, 'detail', id] as const,
};

// ─────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────

export function useQuotes(filters: QuoteFilters = {}) {
  return useQuery<QuotesResponse>({
    queryKey: quoteKeys.list(filters),
    queryFn: () =>
      apiClient.get<QuotesResponse>('/quotes', filters as Record<string, string | number>),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useQuoteDetail(id: string) {
  return useQuery<Quote>({
    queryKey: quoteKeys.detail(id),
    queryFn: () => apiClient.get<Quote>(`/quotes/${id}`),
    enabled: !!id,
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    Quote,
    Error,
    { id: string; status: QuoteStatus; notes?: string }
  >({
    mutationFn: ({ id, ...body }) =>
      apiClient.patch<Quote, typeof body>(`/quotes/${id}/status`, body),

    onSuccess: (updatedQuote) => {
      // Actualización optimista del detalle en caché
      queryClient.setQueryData(quoteKeys.detail(updatedQuote.id), updatedQuote);
      // Invalida la lista para forzar re-fetch
      queryClient.invalidateQueries({ queryKey: quoteKeys.list({}) });
    },
  });
}
