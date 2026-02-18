import { createClient } from '@/lib/supabase';
import { ApiResponse, ApiError } from '@erp/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

async function request<T>(
  endpoint: string,
  method: RequestMethod = 'GET',
  body?: any,
  headers?: Record<string, string>
): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
      ...headers,
    },
    ...(body && { body: JSON.stringify(body) }),
  };

  try {
    const res = await fetch(`${API_URL}${endpoint}`, config);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.statusText }));
      const error: ApiError = {
        statusCode: res.status,
        message: errorData.message || 'Error desconocido',
        error: errorData.error || res.statusText,
        timestamp: new Date().toISOString(),
        path: endpoint,
      };
      throw error;
    }

    const response: ApiResponse<T> = await res.json();
    return response.data; // Unpack data
  } catch (err: any) {
    // Si el error ya es tipo ApiError, lo relanzamos
    if (err.statusCode) {
      throw err;
    }
    // Si es error de red u otro
    throw {
      statusCode: 500,
      message: err.message || 'Error de conexión',
      error: 'Network Error',
      timestamp: new Date().toISOString(),
      path: endpoint,
    } as ApiError;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, headers?: Record<string, string>) => 
    request<T>(endpoint, 'GET', undefined, headers),

  post: <T>(endpoint: string, body: any, headers?: Record<string, string>) => 
    request<T>(endpoint, 'POST', body, headers),

  patch: <T>(endpoint: string, body: any, headers?: Record<string, string>) => 
    request<T>(endpoint, 'PATCH', body, headers),

  delete: <T>(endpoint: string, headers?: Record<string, string>) => 
    request<T>(endpoint, 'DELETE', undefined, headers),
};
