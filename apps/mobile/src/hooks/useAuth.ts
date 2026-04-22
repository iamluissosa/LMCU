import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import type { AuthUser } from '@/store/auth.store';

// ─────────────────────────────────────────────
// Tipos de request/response de auth
// ─────────────────────────────────────────────

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

// ─────────────────────────────────────────────
// Hook: useLogin
// ─────────────────────────────────────────────

export function useLogin() {
  const { setUser } = useAuthStore();
  const router = useRouter();

  return useMutation<LoginResponse, ApiClientError, LoginRequest>({
    mutationFn: (credentials) =>
      apiClient.post<LoginResponse, LoginRequest>('/auth/login', credentials),

    onSuccess: async ({ user, accessToken, refreshToken }) => {
      await setUser(user, accessToken, refreshToken);
      // Redirige al dashboard principal tras login exitoso
      router.replace('/(app)/(tabs)');
    },
  });
}

// ─────────────────────────────────────────────
// Hook: useLogout
// ─────────────────────────────────────────────

export function useLogout() {
  const { logout } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      // Intenta invalidar el token en el servidor (no crítico si falla)
      try {
        await apiClient.post('/auth/logout', {});
      } catch {
        // Continuamos con el logout local aunque falle la petición
      }
      await logout();
    },

    onSuccess: () => {
      router.replace('/(auth)/login');
    },
  });
}
