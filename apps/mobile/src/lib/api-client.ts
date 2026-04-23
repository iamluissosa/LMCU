import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

// Log de diagnóstico para verificar la URL del API (solo visible en dev)
if (__DEV__) {
  console.log('[ApiClient] Base URL:', API_BASE_URL);
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'lmcu_access_token',
  REFRESH_TOKEN: 'lmcu_refresh_token',
  USER_DATA: 'lmcu_user_data',
} as const;

// ─────────────────────────────────────────────
// Gestión de tokens (SecureStore, no AsyncStorage)
// ─────────────────────────────────────────────

export const TokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async setTokens(accessToken: string, refreshToken?: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
  },

  async getUserData<T>(): Promise<T | null> {
    const raw = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async setUserData<T>(data: T): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
  },
};

// ─────────────────────────────────────────────
// Cliente HTTP con interceptor de autenticación
// ─────────────────────────────────────────────

interface ApiResponse<T> {
  data: T;
  message?: string;
}

interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await TokenStorage.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorBody: ApiError;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { message: response.statusText, statusCode: response.status };
      }
      throw new ApiClientError(errorBody.message, response.status, errorBody.error);
    }

    // 204 No Content
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const json = await response.json();
    // El backend NestJS puede retornar directamente el objeto o envuelto en { data }
    return (json.data ?? json) as T;
  }

  /**
   * Envuelve fetch() para capturar errores de red (ej: "Network request failed")
   * y convertirlos en un ApiClientError con información útil para debugging.
   */
  private async safeFetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch (error) {
      // "Network request failed" — sin conexión, CORS bloqueado, o servidor caído
      const message =
        error instanceof Error ? error.message : 'Error de red desconocido';
      throw new ApiClientError(
        `No se pudo conectar al servidor (${message}). Verifica tu conexión a internet.`,
        0,
        'NETWORK_ERROR',
      );
    }
  }

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      });
    }
    const headers = await this.getAuthHeaders();
    const response = await this.safeFetch(url.toString(), { method: 'GET', headers });
    return this.handleResponse<T>(response);
  }

  async post<T, B = unknown>(path: string, body: B): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await this.safeFetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  async patch<T, B = unknown>(path: string, body: B): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await this.safeFetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await this.safeFetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers,
    });
    return this.handleResponse<T>(response);
  }
}

// Error tipado para manejo en TanStack Query
export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  /** Error de red (sin conexión, CORS, servidor caído) */
  get isNetworkError(): boolean {
    return this.statusCode === 0 && this.errorCode === 'NETWORK_ERROR';
  }
}

// Instancia singleton exportable
export const apiClient = new ApiClient(API_BASE_URL);

export type { ApiResponse, ApiError };
