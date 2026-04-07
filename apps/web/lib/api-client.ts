import { createClient } from '@/lib/supabase';
import { ApiResponse, ApiError } from '@erp/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

let cachedAccessToken: string | null = null;
let isTokenListenerInitialized = false;

// Initialize listener to keep token fresh in memory (Browser only)
if (typeof window !== 'undefined') {
  const supabase = createClient();
  supabase.auth.getSession().then(({ data }) => {
    cachedAccessToken = data.session?.access_token || null;
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedAccessToken = session?.access_token || null;
  });
  isTokenListenerInitialized = true;
}

async function request<T>(
  endpoint: string,
  method: RequestMethod = 'GET',
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  let token = cachedAccessToken;

  // Si estamos en el lado del servidor, o no se ha inicializado el token en cliente, debemos buscarlo fresh.
  if (typeof window === 'undefined' || !isTokenListenerInitialized) {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || null;
  }

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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

    const json = await res.json();
    // El API puede devolver: { data: T, ... } (wrapped) o directamente T (unwrapped).
    // Detectamos el wrapper por la presencia de la clave 'data' en un objeto plano.
    if (
      json !== null &&
      typeof json === 'object' &&
      !Array.isArray(json) &&
      'data' in json
    ) {
      return (json as ApiResponse<T>).data;
    }
    return json as T;
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    // Si el error ya es tipo ApiError, lo relanzamos
    if (e && typeof e === 'object' && 'statusCode' in e) {
      throw err;
    }
    // Si es error de red u otro
    throw {
      statusCode: 500,
      message: e instanceof Error ? e.message : 'Error de conexión',
      error: 'Network Error',
      timestamp: new Date().toISOString(),
      path: endpoint,
    } as ApiError;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, headers?: Record<string, string>) => 
    request<T>(endpoint, 'GET', undefined, headers),

  post: <T>(endpoint: string, body: unknown, headers?: Record<string, string>) => 
    request<T>(endpoint, 'POST', body, headers),

  patch: <T>(endpoint: string, body: unknown, headers?: Record<string, string>) => 
    request<T>(endpoint, 'PATCH', body, headers),

  delete: <T>(endpoint: string, headers?: Record<string, string>) => 
    request<T>(endpoint, 'DELETE', undefined, headers),
};
