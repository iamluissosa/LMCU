import { Redirect, Tabs } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from 'react-native-paper';
import { View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, DollarSign, FileText, Settings } from 'lucide-react-native';

/**
 * Guard de rutas protegidas.
 * Si el usuario NO está autenticado, redirige al login.
 * 
 * Usa useSafeAreaInsets() para posicionar el tab bar por encima
 * de la barra de navegación del sistema (gesture bar en Android).
 */
export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Altura base del tab bar + el inset inferior del sistema
  const TAB_BAR_BASE_HEIGHT = 60;
  const bottomInset = insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
          elevation: 0,
          height: TAB_BAR_BASE_HEIGHT + bottomInset,
          paddingBottom: bottomInset + 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="(tabs)/index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/commissions"
        options={{
          title: 'Comisiones',
          tabBarIcon: ({ color, size }) => (
            <DollarSign color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/quotes"
        options={{
          title: 'Cotizaciones',
          tabBarIcon: ({ color, size }) => (
            <FileText color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
