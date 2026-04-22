import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, useTheme, Surface, List, Switch, Divider, Avatar, Button } from 'react-native-paper';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuth';
import { spacing, borderRadius } from '@/theme';
import { LogOut, Shield, Bell, Moon, Info, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { useColorScheme } from 'react-native';

export default function SettingsScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const colorScheme = useColorScheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
      ],
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Perfil del usuario */}
      <Surface
        style={[styles.profileCard, { backgroundColor: theme.colors.primary }]}
        elevation={0}
      >
        <Avatar.Text
          size={64}
          label={initials}
          style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
          labelStyle={{ color: '#ffffff', fontWeight: '700' }}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? '—'}</Text>
          <View style={styles.rolePill}>
            <Shield size={12} color="#ffffff" />
            <Text style={styles.roleLabel}>{user?.role ?? '—'}</Text>
          </View>
        </View>
      </Surface>

      {/* Sección: Preferencias */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
          PREFERENCIAS
        </Text>
        <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]} elevation={0}>
          <List.Item
            title="Notificaciones"
            description="Alertas de cotizaciones y comisiones"
            titleStyle={{ color: theme.colors.onSurface, fontSize: 14 }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
            left={() => (
              <View style={[styles.listIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Bell size={18} color={theme.colors.primary} />
              </View>
            )}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                color={theme.colors.primary}
              />
            )}
          />
          <Divider style={{ backgroundColor: theme.colors.outline }} />
          <List.Item
            title="Modo oscuro"
            description={colorScheme === 'dark' ? 'Activado (sistema)' : 'Desactivado (sistema)'}
            titleStyle={{ color: theme.colors.onSurface, fontSize: 14 }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
            left={() => (
              <View style={[styles.listIcon, { backgroundColor: `${theme.colors.secondary}20` }]}>
                <Moon size={18} color={theme.colors.secondary} />
              </View>
            )}
            right={() => <ChevronRight size={16} color={theme.colors.onSurfaceVariant} />}
          />
        </Surface>
      </View>

      {/* Sección: Información */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
          INFORMACIÓN
        </Text>
        <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]} elevation={0}>
          <List.Item
            title="Versión de la aplicación"
            description="v1.0.0 (Fase 1 - Android)"
            titleStyle={{ color: theme.colors.onSurface, fontSize: 14 }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
            left={() => (
              <View style={[styles.listIcon, { backgroundColor: `${theme.colors.secondary}20` }]}>
                <Info size={18} color={theme.colors.secondary} />
              </View>
            )}
          />
          <Divider style={{ backgroundColor: theme.colors.outline }} />
          <List.Item
            title="Permisos activos"
            description={user?.permissions.join(', ') ?? 'Sin permisos especiales'}
            descriptionNumberOfLines={2}
            titleStyle={{ color: theme.colors.onSurface, fontSize: 14 }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
            left={() => (
              <View style={[styles.listIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Shield size={18} color={theme.colors.primary} />
              </View>
            )}
          />
        </Surface>
      </View>

      {/* Botón de logout */}
      <View style={styles.section}>
        <Button
          mode="outlined"
          onPress={handleLogout}
          loading={isLoggingOut}
          disabled={isLoggingOut}
          textColor={theme.colors.error}
          style={[styles.logoutButton, { borderColor: theme.colors.error }]}
          contentStyle={{ height: 48 }}
          icon={() => <LogOut size={18} color={theme.colors.error} />}
          labelStyle={{ fontWeight: '600' }}
        >
          {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    borderRadius: 0,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  roleLabel: { fontSize: 11, color: '#ffffff', fontWeight: '700' },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: spacing.sm },
  sectionCard: { borderRadius: borderRadius.md, borderWidth: 1, overflow: 'hidden' },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    alignSelf: 'center',
  },
  logoutButton: { borderRadius: borderRadius.md },
});
