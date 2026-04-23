import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ─────────────────────────────────────────────
// Tipos del dominio Cotizaciones
// ─────────────────────────────────────────────

export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

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
    queryFn: async () => {
      const response = await apiClient.get<any>('/quotes', filters as Record<string, string | number | undefined>);
      
      return {
        ...response,
        items: (response.items || []).map((item: any) => ({
          id: item.id || '',
          reference: item.quoteNumber || 'N/A',
          clientName: item.client?.name || 'Cliente Desconocido',
          status: item.status || 'DRAFT',
          total: Number(item.totalAmount) || 0,
          validUntil: item.expiresAt || item.createdAt || new Date().toISOString(),
          createdAt: item.createdAt || new Date().toISOString(),
        }))
      };
    },
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useQuoteDetail(id: string) {
  return useQuery<Quote>({
    queryKey: quoteKeys.detail(id),
    queryFn: async () => {
      const data = await apiClient.get<any>(`/quotes/${id}`);
      return {
        id: data.id,
        reference: data.quoteNumber,
        clientId: data.clientId,
        clientName: data.client?.name || 'Cliente Desconocido',
        sellerId: data.salespersonId || data.createdById || '',
        sellerName: 'Vendedor',
        status: data.status,
        items: (data.items || []).map((i: any) => ({
          id: i.id,
          productId: i.productId || i.serviceCategoryId,
          productName: i.product?.name || i.serviceCategory?.name || i.description || 'Item',
          quantity: Number(i.quantity) || 0,
          unitPrice: Number(i.unitPrice) || 0,
          discount: Number(i.discount) || 0,
          subtotal: Number(i.totalLine) || 0,
        })),
        subtotal: Number(data.subtotal) || 0,
        taxAmount: Number(data.taxAmount) || 0,
        total: Number(data.totalAmount) || 0,
        validUntil: data.expiresAt || data.createdAt,
        notes: data.notes,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Quote;
    },
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
