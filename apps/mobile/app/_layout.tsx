import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { DarkTheme, LightTheme } from '@/theme';

// ─────────────────────────────────────────────
// QueryClient global con configuración de reintentos
// ─────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reintenta hasta 2 veces (no 3) para reducir latencia en errores reales
      retry: (failureCount, error: any) => {
        // No reintenta en 401/403 - son errores de auth, no de red
        if (error?.statusCode === 401 || error?.statusCode === 403) return false;
        return failureCount < 2;
      },
      staleTime: 60 * 1000, // 1 minuto por defecto
    },
    mutations: {
      retry: 0,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { rehydrate, isLoading } = useAuthStore();

  // Rehidrata la sesión desde SecureStore al iniciar la app
  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  const paperTheme = colorScheme === 'dark' ? DarkTheme : LightTheme;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={paperTheme}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            {/* Grupo de rutas de autenticación */}
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            {/* Grupo de rutas protegidas de la app */}
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
