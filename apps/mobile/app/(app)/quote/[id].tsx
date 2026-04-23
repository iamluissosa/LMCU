import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Share } from 'react-native';
import { Text, useTheme, Surface, Button, ActivityIndicator, Divider, Appbar, Portal, Dialog, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuoteDetail, useUpdateQuoteStatus, type QuoteStatus } from '@/hooks/useQuotes';
import { spacing, borderRadius, semanticColors } from '@/theme';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Calendar, User, Tag, ArrowLeft, Send, CheckCircle, XCircle, Share2, Mail } from 'lucide-react-native';

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: semanticColors.pending },
  SENT: { label: 'Enviada', color: '#3b82f6' }, // Azul para enviada
  APPROVED: { label: 'Aprobada', color: semanticColors.approved },
  ACCEPTED: { label: 'Aceptada', color: semanticColors.approved },
  REJECTED: { label: 'Rechazada', color: semanticColors.expense },
  EXPIRED: { label: 'Expirada', color: semanticColors.warning },
  CANCELLED: { label: 'Cancelada', color: semanticColors.expense },
};

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const { data: quote, isLoading, isError, refetch } = useQuoteDetail(id);
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateQuoteStatus();

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const handleShare = async () => {
    if (!quote) return;
    try {
      // En una implementación real esto compartiría la URL al PDF de la cotización
      await Share.share({
        message: `Cotización ${quote.reference} de LMCU ERP.\nTotal: ${formatCurrency(quote.total)}\nValida hasta: ${format(new Date(quote.validUntil), 'dd/MM/yyyy')}`,
        title: `Cotización ${quote.reference}`
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleChangeStatus = (status: QuoteStatus, notes?: string) => {
    if (!quote) return;
    updateStatus(
      { id: quote.id, status, notes },
      {
        onSuccess: () => {
          Alert.alert('Éxito', `El estado ha sido actualizado a ${STATUS_CONFIG[status].label}`);
          if (cancelModalVisible) setCancelModalVisible(false);
        },
        onError: (err) => {
          Alert.alert('Error', 'No se pudo actualizar el estado de la cotización.');
          console.error(err);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !quote) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, marginBottom: spacing.md }}>
          Error al cargar los detalles de la cotización
        </Text>
        <Button mode="contained" onPress={() => refetch()}>Reintentar</Button>
        <Button mode="text" onPress={() => router.back()} style={{ marginTop: spacing.sm }}>
          Volver
        </Button>
      </View>
    );
  }

  const rawStatus = (quote.status || 'DRAFT').toUpperCase() as QuoteStatus;
  const statusInfo = STATUS_CONFIG[rawStatus] || STATUS_CONFIG['DRAFT'];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header Personalizado */}
        <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title={`Cotización ${quote.reference}`} titleStyle={styles.headerTitle} />
          <Appbar.Action icon={() => <Share2 size={24} color={theme.colors.onSurface} />} onPress={handleShare} />
        </Appbar.Header>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Card Principal - Info General */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.refText, { color: theme.colors.onSurface }]}>{quote.reference}</Text>
                <Text style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}>
                  Creada el {format(new Date(quote.createdAt), 'dd MMM yyyy', { locale: es })}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}15` }]}>
                <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.infoRow}>
              <User size={20} color={theme.colors.onSurfaceVariant} style={styles.infoIcon} />
              <View>
                <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Cliente</Text>
                <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>{quote.clientName}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Calendar size={20} color={theme.colors.onSurfaceVariant} style={styles.infoIcon} />
              <View>
                <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Válida hasta</Text>
                <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                  {format(new Date(quote.validUntil), 'dd de MMMM yyyy', { locale: es })}
                </Text>
              </View>
            </View>
          </Surface>

          {/* Listado de Items */}
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Conceptos Cotizados</Text>
          {quote.items?.map((item, index) => (
            <Surface key={item.id || index.toString()} style={[styles.itemCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
              <View style={styles.itemHeader}>
                <Text style={[styles.itemName, { color: theme.colors.onSurface }]}>{item.productName}</Text>
                <Text style={[styles.itemTotal, { color: theme.colors.onSurface }]}>{formatCurrency(item.subtotal)}</Text>
              </View>
              <View style={styles.itemDetails}>
                <Text style={[styles.itemDetailText, { color: theme.colors.onSurfaceVariant }]}>
                  {item.quantity} x {formatCurrency(item.unitPrice)}
                </Text>
                {item.discount > 0 && (
                  <Text style={[styles.itemDiscount, { color: semanticColors.expense }]}>
                    - {formatCurrency(item.discount)} dcto.
                  </Text>
                )}
              </View>
            </Surface>
          ))}

          {/* Resumen de Totales */}
          <Surface style={[styles.totalsCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.colors.onSurfaceVariant }]}>Subtotal</Text>
              <Text style={[styles.totalValue, { color: theme.colors.onSurface }]}>{formatCurrency(quote.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.colors.onSurfaceVariant }]}>Impuestos</Text>
              <Text style={[styles.totalValue, { color: theme.colors.onSurface }]}>{formatCurrency(quote.taxAmount)}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={[styles.grandTotalLabel, { color: theme.colors.onSurface }]}>Total Final</Text>
              <Text style={[styles.grandTotalValue, { color: theme.colors.primary }]}>{formatCurrency(quote.total)}</Text>
            </View>
          </Surface>

          {/* Notas u Observaciones */}
          {quote.notes ? (
             <Surface style={[styles.notesCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
               <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant, marginBottom: spacing.xs }]}>Observaciones</Text>
               <Text style={{ color: theme.colors.onSurface, fontSize: 14 }}>{quote.notes}</Text>
             </Surface>
          ) : null}

          {/* Área de Acciones (Bottom Padding) */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Floating Action Buttons */}
        <Surface style={[styles.actionContainer, { backgroundColor: theme.colors.surface }]} elevation={4}>
          {rawStatus === 'DRAFT' && (
            <Button
              mode="contained"
              icon={() => <Send size={18} color="#fff" />}
              style={styles.actionBtn}
              loading={isUpdating}
              disabled={isUpdating}
              onPress={() => handleChangeStatus('SENT')}
            >
              Marcar como Enviada
            </Button>
          )}

          {rawStatus === 'SENT' && (
             <View style={styles.actionRow}>
                <Button
                  mode="outlined"
                  icon={() => <XCircle size={18} color={theme.colors.error} />}
                  style={[styles.flexBtn, { borderColor: theme.colors.error }]}
                  textColor={theme.colors.error}
                  disabled={isUpdating}
                  onPress={() => setCancelModalVisible(true)}
                >
                  Rechazar
                </Button>
                <View style={{ width: spacing.md }} />
                <Button
                  mode="contained"
                  buttonColor={semanticColors.approved}
                  icon={() => <CheckCircle size={18} color="#fff" />}
                  style={styles.flexBtn}
                  loading={isUpdating}
                  disabled={isUpdating}
                  onPress={() => handleChangeStatus('ACCEPTED')}
                >
                  Aceptar
                </Button>
             </View>
          )}

          {['APPROVED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(rawStatus) && (
            <Button
               mode="contained-tonal"
               icon={() => <Mail size={18} color={theme.colors.primary} />}
               style={styles.actionBtn}
               onPress={handleShare}
            >
              Reenviar a Cliente
            </Button>
          )}
        </Surface>

        {/* Diálogo de Cancelación/Rechazo */}
        <Portal>
          <Dialog visible={cancelModalVisible} onDismiss={() => setCancelModalVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
            <Dialog.Title>Rechazar Cotización</Dialog.Title>
            <Dialog.Content>
              <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.md }}>
                Por favor, indica el motivo del rechazo para mantener el registro.
              </Text>
              <TextInput
                mode="outlined"
                label="Motivo (Opcional)"
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={3}
                style={{ backgroundColor: theme.colors.background }}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setCancelModalVisible(false)} textColor={theme.colors.onSurfaceVariant}>Cancelar</Button>
              <Button onPress={() => handleChangeStatus('REJECTED', cancelReason)} textColor={theme.colors.error} loading={isUpdating}>
                Confirmar Rechazo
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  refText: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  dateText: { fontSize: 13 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  divider: { marginVertical: spacing.md },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoIcon: { marginRight: spacing.md },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 15, fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.md, marginTop: spacing.sm },
  itemCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  itemName: { fontSize: 15, fontWeight: '600', flex: 1, paddingRight: spacing.sm },
  itemTotal: { fontSize: 15, fontWeight: '700' },
  itemDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  itemDetailText: { fontSize: 13 },
  itemDiscount: { fontSize: 12, fontWeight: '600' },

  totalsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 15, fontWeight: '600' },
  grandTotalLabel: { fontSize: 16, fontWeight: '800' },
  grandTotalValue: { fontSize: 22, fontWeight: '800' },

  notesCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  actionBtn: { borderRadius: borderRadius.full },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  flexBtn: { flex: 1, borderRadius: borderRadius.full },
});
