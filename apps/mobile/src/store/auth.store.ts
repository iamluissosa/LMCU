import { create } from 'zustand';
import { TokenStorage } from '@/lib/api-client';

// ─────────────────────────────────────────────
// Tipos del dominio de autenticación
// ─────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'SELLER' | 'VIEWER';
  permissions: string[];
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Acciones
  setUser: (user: AuthUser, accessToken: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  rehydrate: () => Promise<void>;
}

/**
 * Store de autenticación.
 * - NO usa persist middleware para datos sensibles; la fuente de verdad es SecureStore.
 * - El estado en memoria (user, isAuthenticated) se rehidrata al iniciar la app.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: async (user, accessToken, refreshToken) => {
    await TokenStorage.setTokens(accessToken, refreshToken);
    await TokenStorage.setUserData(user);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await TokenStorage.clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  rehydrate: async () => {
    try {
      const [token, user] = await Promise.all([
        TokenStorage.getAccessToken(),
        TokenStorage.getUserData<AuthUser>(),
      ]);

      if (token && user) {
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      // Si SecureStore falla, aseguramos un estado limpio
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

// Selector de conveniencia para permisos
export const useHasPermission = (permission: string): boolean => {
  return useAuthStore(
    (state) => state.user?.permissions.includes(permission) ?? false,
  );
};
