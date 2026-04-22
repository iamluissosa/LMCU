import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { Text, useTheme, Surface, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '@/store/auth.store';
import { useDashboardMetrics } from '@/hooks/useDashboard';
import { spacing, borderRadius, semanticColors } from '@/theme';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Users,
  BarChart2,
} from 'lucide-react-native';

// ─────────────────────────────────────────────
// Componente: MetricCard
// ─────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  icon: React.ReactNode;
  accentColor: string;
}

function MetricCard({ title, value, subtitle, trend, icon, accentColor }: MetricCardProps) {
  const theme = useTheme();
  const isPositiveTrend = trend !== undefined && trend >= 0;

  return (
    <Surface
      style={[
        styles.metricCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
      elevation={0}
    >
      {/* Acento de color en el borde izquierdo */}
      <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurfaceVariant }]}>
            {title}
          </Text>
          <View style={[styles.iconContainer, { backgroundColor: `${accentColor}20` }]}>
            {icon}
          </View>
        </View>

        <Text style={[styles.cardValue, { color: theme.colors.onSurface }]}>
          {value}
        </Text>

        {subtitle && (
          <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {subtitle}
          </Text>
        )}

        {trend !== undefined && (
          <View style={styles.trendContainer}>
            {isPositiveTrend ? (
              <TrendingUp size={14} color={semanticColors.revenue} />
            ) : (
              <TrendingDown size={14} color={semanticColors.expense} />
            )}
            <Text
              style={[
                styles.trendText,
                { color: isPositiveTrend ? semanticColors.revenue : semanticColors.expense },
              ]}
            >
              {formatPercent(Math.abs(trend))} vs. mes anterior
            </Text>
          </View>
        )}
      </View>
    </Surface>
  );
}

// ─────────────────────────────────────────────
// Pantalla: Dashboard
// ─────────────────────────────────────────────

export default function DashboardScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { data, isLoading, isError, refetch, isRefetching } = useDashboardMetrics();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: spacing.md, color: theme.colors.onSurfaceVariant }}>
          Cargando métricas...
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <BarChart2 size={48} color={theme.colors.onSurfaceVariant} />
        <Text style={{ marginTop: spacing.md, color: theme.colors.onSurface, fontWeight: '600' }}>
          No se pudieron cargar las métricas
        </Text>
        <Text
          style={{ color: theme.colors.primary, marginTop: spacing.sm }}
          onPress={() => refetch()}
        >
          Reintentar
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: spacing.xxl }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.colors.onSurfaceVariant }]}>
            {greeting()},
          </Text>
          <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
            {user?.name?.split(' ')[0] ?? 'Usuario'} 👋
          </Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text style={[styles.roleText, { color: theme.colors.primary }]}>
            {user?.role ?? ''}
          </Text>
        </View>
      </View>

      {/* Sección: Ventas */}
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        📊 Resumen de Ventas
      </Text>

      <View style={styles.metricsGrid}>
        <MetricCard
          title="Ingresos Totales"
          value={formatCurrency(data?.sales.totalRevenue ?? 0)}
          trend={data?.sales.growthPercent}
          icon={<DollarSign size={18} color={semanticColors.revenue} />}
          accentColor={semanticColors.revenue}
        />
        <MetricCard
          title="Total de Ventas"
          value={String(data?.sales.totalSales ?? 0)}
          subtitle={`${data?.sales.pendingCount ?? 0} pendientes`}
          icon={<BarChart2 size={18} color={theme.colors.primary} />}
          accentColor={theme.colors.primary}
        />
      </View>

      {/* Sección: Comisiones */}
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        💰 Comisiones
      </Text>

      <View style={styles.metricsGrid}>
        <MetricCard
          title="Comisiones Totales"
          value={formatCurrency(data?.commissions.totalAmount ?? 0)}
          subtitle={`${data?.commissions.sellersCount ?? 0} vendedores`}
          icon={<DollarSign size={18} color={semanticColors.commission} />}
          accentColor={semanticColors.commission}
        />
        <MetricCard
          title="Pendiente de Pago"
          value={formatCurrency(data?.commissions.pendingAmount ?? 0)}
          icon={<Users size={18} color={semanticColors.warning} />}
          accentColor={semanticColors.warning}
        />
      </View>

      {/* Sección: Cotizaciones */}
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        📋 Cotizaciones
      </Text>

      <View style={styles.metricsGrid}>
        <MetricCard
          title="Tasa de Conversión"
          value={formatPercent(data?.quotes.conversionRate ?? 0)}
          subtitle={`${data?.quotes.approvedCount ?? 0} aprobadas`}
          icon={<TrendingUp size={18} color={semanticColors.approved} />}
          accentColor={semanticColors.approved}
        />
        <MetricCard
          title="En Revisión"
          value={String(data?.quotes.pendingCount ?? 0)}
          icon={<FileText size={18} color={theme.colors.secondary} />}
          accentColor={theme.colors.secondary}
        />
      </View>

      {/* Top Vendedores */}
      {(data?.topSellers?.length ?? 0) > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            🏆 Top Vendedores
          </Text>
          <Surface
            style={[
              styles.topSellersCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}
            elevation={0}
          >
            {data!.topSellers.map((seller, index) => (
              <View
                key={seller.id}
                style={[
                  styles.sellerRow,
                  index < data!.topSellers.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.outline,
                  },
                ]}
              >
                <View style={[styles.rankBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>
                    #{index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.onSurface, fontWeight: '600', fontSize: 14 }}>
                    {seller.name}
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                    Comisión: {formatCurrency(seller.commission)}
                  </Text>
                </View>
                <Text style={{ color: semanticColors.revenue, fontWeight: '700', fontSize: 14 }}>
                  {formatCurrency(seller.revenue)}
                </Text>
              </View>
            ))}
          </Surface>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    paddingTop: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: 14,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  metricCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.xs / 2,
  },
  cardSubtitle: {
    fontSize: 11,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs / 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  topSellersCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
