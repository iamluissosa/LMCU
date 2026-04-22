import { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  Chip,
  ActivityIndicator,
  Searchbar,
  Divider,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCommissions, type CommissionStatus, type Commission } from '@/hooks/useCommissions';
import { useAuthStore } from '@/store/auth.store';
import { spacing, borderRadius, semanticColors } from '@/theme';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react-native';

// ─────────────────────────────────────────────
// Utilidades de status
// ─────────────────────────────────────────────

const STATUS_CONFIG: Record<CommissionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pendiente', color: semanticColors.pending, icon: <Clock size={14} color={semanticColors.pending} /> },
  APPROVED: { label: 'Aprobada', color: semanticColors.approved, icon: <CheckCircle size={14} color={semanticColors.approved} /> },
  PAID: { label: 'Pagada', color: semanticColors.revenue, icon: <DollarSign size={14} color={semanticColors.revenue} /> },
  REJECTED: { label: 'Rechazada', color: semanticColors.expense, icon: <XCircle size={14} color={semanticColors.expense} /> },
};

// ─────────────────────────────────────────────
// Componente: CommissionItem
// ─────────────────────────────────────────────

function CommissionItem({ item }: { item: Commission }) {
  const theme = useTheme();
  const config = STATUS_CONFIG[item.status];

  return (
    <Surface
      style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
      elevation={0}
    >
      <View style={styles.itemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemReference, { color: theme.colors.onSurface }]}>
            {item.saleReference}
          </Text>
          <Text style={[styles.itemSeller, { color: theme.colors.onSurfaceVariant }]}>
            {item.sellerName}
          </Text>
        </View>
        <View>
          <Text style={[styles.itemAmount, { color: theme.colors.onSurface }]}>
            {formatCurrency(item.amount)}
          </Text>
          <Text style={[styles.itemPercent, { color: theme.colors.onSurfaceVariant }]}>
            {item.percentage}% comisión
          </Text>
        </View>
      </View>

      <Divider style={{ marginVertical: spacing.xs, backgroundColor: theme.colors.outline }} />

      <View style={styles.itemFooter}>
        <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
          {config.icon}
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
        <Text style={[styles.itemDate, { color: theme.colors.onSurfaceVariant }]}>
          {format(new Date(item.createdAt), 'dd MMM yyyy', { locale: es })}
        </Text>
      </View>
    </Surface>
  );
}

// ─────────────────────────────────────────────
// Pantalla: Comisiones
// ─────────────────────────────────────────────

const STATUS_FILTERS: Array<{ label: string; value: CommissionStatus | 'ALL' }> = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'Aprobadas', value: 'APPROVED' },
  { label: 'Pagadas', value: 'PAID' },
];

export default function CommissionsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CommissionStatus | 'ALL'>('ALL');

  const isVendedor = user?.role === 'SELLER';

  const { data, isLoading, isError, refetch, isRefetching } = useCommissions({
    status: activeFilter !== 'ALL' ? activeFilter : undefined,
    // Si es vendedor, sólo muestra sus propias comisiones
    sellerId: isVendedor ? user?.id : undefined,
  });

  const filteredItems = (data?.items ?? []).filter((c) =>
    searchQuery
      ? c.saleReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.sellerName.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header con resumen */}
      <View style={[styles.summaryBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline, paddingTop: insets.top + spacing.md }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>
            {formatCurrency(data?.totalEarned ?? 0)}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
            Total ganado
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: theme.colors.outline }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: semanticColors.approved }]}>
            {formatCurrency(data?.totalPaid ?? 0)}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
            Pagado
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: theme.colors.outline }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: semanticColors.commission }]}>
            {formatCurrency(data?.totalPending ?? 0)}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
            Pendiente
          </Text>
        </View>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar por referencia o vendedor..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchbar, { backgroundColor: theme.colors.surfaceVariant }]}
          inputStyle={{ fontSize: 14 }}
          iconColor={theme.colors.onSurfaceVariant}
        />
      </View>

      {/* Chips de filtro */}
      <View style={styles.filtersContainer}>
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.value}
            selected={activeFilter === f.value}
            onPress={() => setActiveFilter(f.value)}
            style={[
              styles.filterChip,
              activeFilter === f.value && { backgroundColor: theme.colors.primaryContainer },
            ]}
            textStyle={{
              fontSize: 12,
              color: activeFilter === f.value ? theme.colors.primary : theme.colors.onSurfaceVariant,
            }}
            compact
          >
            {f.label}
          </Chip>
        ))}
      </View>

      {/* Lista */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={{ color: theme.colors.onSurface }}>Error al cargar comisiones</Text>
          <Text style={{ color: theme.colors.primary, marginTop: spacing.sm }} onPress={() => refetch()}>
            Reintentar
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CommissionItem item={item} />}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <DollarSign size={48} color={theme.colors.onSurfaceVariant} />
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.md }}>
                No se encontraron comisiones
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  summaryBar: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '800' },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  summaryDivider: { width: 1, marginHorizontal: spacing.md },
  searchContainer: { padding: spacing.md, paddingBottom: spacing.xs },
  searchbar: { elevation: 0, borderRadius: borderRadius.md },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  filterChip: { borderRadius: borderRadius.full },
  itemCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  itemReference: { fontSize: 14, fontWeight: '700' },
  itemSeller: { fontSize: 12, marginTop: 2 },
  itemAmount: { fontSize: 16, fontWeight: '800', textAlign: 'right' },
  itemPercent: { fontSize: 11, textAlign: 'right' },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  itemDate: { fontSize: 11 },
});
