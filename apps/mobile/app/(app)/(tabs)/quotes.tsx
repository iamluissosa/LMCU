import { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  Chip,
  ActivityIndicator,
  Searchbar,
  Badge,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuotes, type QuoteStatus, type QuoteListItem } from '@/hooks/useQuotes';
import { spacing, borderRadius, semanticColors } from '@/theme';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, ChevronRight, Clock, CheckCircle, XCircle, Send } from 'lucide-react-native';

// ─────────────────────────────────────────────
// Configuración visual de status
// ─────────────────────────────────────────────

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: semanticColors.pending },
  SENT: { label: 'Enviada', color: '#3b82f6' },
  APPROVED: { label: 'Aprobada', color: semanticColors.approved },
  REJECTED: { label: 'Rechazada', color: semanticColors.expense },
  EXPIRED: { label: 'Expirada', color: semanticColors.warning },
};

// ─────────────────────────────────────────────
// Componente: QuoteItem
// ─────────────────────────────────────────────

function QuoteItem({ item }: { item: QuoteListItem }) {
  const theme = useTheme();
  const router = useRouter();
  const config = STATUS_CONFIG[item.status];
  const isExpiringSoon = new Date(item.validUntil) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  return (
    <Pressable
      onPress={() => router.push(`/(app)/quote/${item.id}`)}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <Surface
        style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
        elevation={0}
      >
        <View style={styles.itemRow}>
          {/* Ícono de estado */}
          <View style={[styles.statusIcon, { backgroundColor: `${config.color}15` }]}>
            <FileText size={20} color={config.color} />
          </View>

          {/* Info principal */}
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <View style={styles.refRow}>
              <Text style={[styles.reference, { color: theme.colors.onSurface }]}>
                {item.reference}
              </Text>
              {isExpiringSoon && item.status === 'SENT' && (
                <Badge style={{ backgroundColor: semanticColors.warning, fontSize: 9 }}>
                  ¡Vence pronto!
                </Badge>
              )}
            </View>
            <Text style={[styles.clientName, { color: theme.colors.onSurfaceVariant }]}>
              {item.clientName}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.statusPill, { backgroundColor: `${config.color}20` }]}>
                <Text style={[styles.statusText, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
              <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
                {format(new Date(item.createdAt), 'dd MMM', { locale: es })}
              </Text>
            </View>
          </View>

          {/* Monto y chevron */}
          <View style={styles.amountColumn}>
            <Text style={[styles.amount, { color: theme.colors.onSurface }]}>
              {formatCurrency(item.total)}
            </Text>
            <ChevronRight size={16} color={theme.colors.onSurfaceVariant} style={{ alignSelf: 'flex-end' }} />
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}

// ─────────────────────────────────────────────
// Pantalla: Cotizaciones
// ─────────────────────────────────────────────

const STATUS_FILTERS: Array<{ label: string; value: QuoteStatus | 'ALL' }> = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Pendientes', value: 'SENT' },
  { label: 'Aprobadas', value: 'APPROVED' },
  { label: 'Borradores', value: 'DRAFT' },
  { label: 'Rechazadas', value: 'REJECTED' },
];

export default function QuotesScreen() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<QuoteStatus | 'ALL'>('ALL');

  const { data, isLoading, isError, refetch, isRefetching } = useQuotes({
    status: activeFilter !== 'ALL' ? activeFilter : undefined,
  });

  const filteredItems = (data?.items ?? []).filter((q) =>
    searchQuery
      ? q.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.clientName.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Estadísticas rápidas */}
      <View style={[styles.statsBar, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{data?.total ?? 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statDivider]} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {data?.items.filter((q) => q.status === 'SENT').length ?? 0}
          </Text>
          <Text style={styles.statLabel}>En revisión</Text>
        </View>
        <View style={[styles.statDivider]} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {data?.items.filter((q) => q.status === 'APPROVED').length ?? 0}
          </Text>
          <Text style={styles.statLabel}>Aprobadas</Text>
        </View>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar por referencia o cliente..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchbar, { backgroundColor: theme.colors.surfaceVariant }]}
          inputStyle={{ fontSize: 14 }}
          iconColor={theme.colors.onSurfaceVariant}
        />
      </View>

      {/* Chips de filtro */}
      <View>
        <FlatList
          data={STATUS_FILTERS}
          horizontal
          keyExtractor={(f) => f.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          renderItem={({ item: f }) => (
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
          )}
        />
      </View>

      {/* Lista */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={{ color: theme.colors.onSurface }}>Error al cargar cotizaciones</Text>
          <Text style={{ color: theme.colors.primary, marginTop: spacing.sm }} onPress={() => refetch()}>
            Reintentar
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <QuoteItem item={item} />}
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
              <FileText size={48} color={theme.colors.onSurfaceVariant} />
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.md }}>
                No se encontraron cotizaciones
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
  statsBar: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: spacing.md },
  searchContainer: { padding: spacing.md, paddingBottom: spacing.xs },
  searchbar: { elevation: 0, borderRadius: borderRadius.md },
  filtersContainer: {
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
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reference: { fontSize: 14, fontWeight: '700' },
  clientName: { fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 11 },
  amountColumn: { alignItems: 'flex-end', gap: spacing.xs },
  amount: { fontSize: 15, fontWeight: '800' },
});
