import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getStockControl, approveStockControl } from '@/features/stock-controls/services/stockControlApi';
import { useRouteStore } from '@/store/routeStore';
import { StatusOverlay, type OverlayStatus, type OverlayAction } from '@/components/ui';
import type { StockControl } from '@/features/stock-controls/types';
import { C, R, Shdw } from '@/lib/theme';

export default function ApprovalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { setPendingCount, pendingCount } = useRouteStore();

  const [control, setControl] = useState<StockControl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [overlay, setOverlay] = useState<{
    visible: boolean;
    status: OverlayStatus;
    title?: string;
    message?: string;
    actions?: OverlayAction[];
  }>({ visible: false, status: 'loading' });

  useEffect(() => {
    async function load() {
      try {
        const ctrl = await getStockControl(id);
        setControl(ctrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar el control');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function doApprove() {
    if (!control) return;
    setApproving(true);
    setOverlay({ visible: true, status: 'loading', title: 'Registrando conformidad...' });
    try {
      await approveStockControl(control.id);
      setPendingCount(Math.max(0, pendingCount - 1));
      setOverlay({
        visible: true,
        status: 'success',
        title: '¡Control aceptado!',
        message:
          'El camión puede continuar. ¿Querés cargar un pedido de descartables ahora y evitar hacerlo a mano después?',
        actions: [
          {
            label: 'Sí, hacer pedido',
            icon: 'cart',
            variant: 'primary',
            onPress: () => {
              setOverlay((o) => ({ ...o, visible: false }));
              router.replace('/create-order');
            },
          },
          {
            label: 'No, ir al inicio',
            variant: 'secondary',
            onPress: () => {
              setOverlay((o) => ({ ...o, visible: false }));
              router.back();
            },
          },
        ],
      });
    } catch (e) {
      setApproving(false);
      setOverlay({
        visible: true,
        status: 'error',
        title: 'No se pudo aprobar',
        message: e instanceof Error ? e.message : 'Intentá de nuevo',
      });
    }
  }

  function handleApprove() {
    if (!control) return;
    Alert.alert(
      'Aprobar control',
      `¿Confirmás la aprobación del control de ${control.branchName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aprobar', style: 'default', onPress: doApprove },
      ],
    );
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Control Pendiente' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </>
    );
  }

  if (error || !control) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Control no encontrado'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const isExit = control.type === 'EXIT';
  const [cy, cm, cd] = control.controlDate.split('-');
  const dateFormatted = `${cd}/${cm}/${cy}`;
  const isApprovable = control.status === 'PENDING_DRIVER_APPROVAL';

  return (
    <>
      <Stack.Screen options={{ title: isExit ? 'Control de Salida' : 'Control de Entrada' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Banner tipo */}
        <View style={[styles.typeBanner, isExit ? styles.exitBanner : styles.entryBanner]}>
          <Text style={styles.typeBannerText}>
            {isExit ? '↗ Control de Salida' : '↙ Control de Entrada'}
          </Text>
          <View style={styles.pendingPill}>
            <Text style={styles.pendingPillText}>Pendiente de aprobación</Text>
          </View>
        </View>

        {/* Info del control */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={C.textMuted} />
            <Text style={styles.infoLabel}>Sucursal</Text>
            <Text style={styles.infoValue}>{control.branchName}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="car-outline" size={16} color={C.textMuted} />
            <Text style={styles.infoLabel}>Reparto</Text>
            <Text style={styles.infoValue}>{control.routeCode}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={C.textMuted} />
            <Text style={styles.infoLabel}>Fecha</Text>
            <Text style={styles.infoValue}>{dateFormatted}</Text>
          </View>
          {control.truckOrdered && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={C.entry} />
                <Text style={[styles.infoLabel, { color: C.entry }]}>Camión ordenado</Text>
              </View>
            </>
          )}
        </View>

        {/* Observaciones */}
        {control.observations ? (
          <View style={styles.obsBox}>
            <Text style={styles.obsLabel}>Observaciones</Text>
            <Text style={styles.obsText}>{control.observations}</Text>
          </View>
        ) : null}

        {/* Productos */}
        <Text style={styles.sectionTitle}>
          Productos ({control.items.length})
        </Text>

        {control.items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemCode}>{item.productCode}</Text>
            </View>
            <View style={styles.itemQtys}>
              <View style={styles.qtyBlock}>
                <Text style={styles.qtyLabel}>Total</Text>
                <Text style={styles.qtyVal}>{item.totalQuantity}</Text>
              </View>
              <View style={styles.qtyBlock}>
                <Text style={styles.qtyLabel}>Llenos</Text>
                <Text style={styles.qtyVal}>{item.fullQuantity}</Text>
              </View>
              <View style={styles.qtyBlock}>
                <Text style={styles.qtyLabel}>Recambios</Text>
                <Text style={styles.qtyVal}>{item.exchangeQuantity}</Text>
              </View>
              {item.differenceQuantity != null && (
                <View style={styles.qtyBlock}>
                  <Text style={styles.qtyLabel}>Diferencia</Text>
                  <Text style={[
                    styles.qtyVal,
                    { color: item.differenceQuantity !== 0 ? C.danger : C.entry },
                  ]}>
                    {item.differenceQuantity}
                  </Text>
                </View>
              )}
            </View>
            {item.observations ? (
              <Text style={styles.itemObs}>{item.observations}</Text>
            ) : null}
          </View>
        ))}

        {/* Botón aprobar */}
        {isApprovable && (
          <TouchableOpacity
            style={[styles.approveBtn, approving && styles.approveBtnDisabled]}
            onPress={handleApprove}
            disabled={approving}
            activeOpacity={0.85}
          >
            {approving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                <Text style={styles.approveBtnText}>Aprobar control</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <StatusOverlay
        visible={overlay.visible}
        status={overlay.status}
        title={overlay.title}
        message={overlay.message}
        actions={overlay.actions}
        onDismiss={() => {
          setOverlay((o) => ({ ...o, visible: false }));
          setApproving(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: C.bg,
  },
  errorText: { color: C.danger, fontSize: 15, textAlign: 'center', marginBottom: 14 },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: C.primary,
    borderRadius: R.md,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  typeBanner: {
    borderRadius: R.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  exitBanner: { backgroundColor: C.exit },
  entryBanner: { backgroundColor: C.entry },
  typeBannerText: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  pendingPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: R.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  infoBox: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingHorizontal: 16,
    ...Shdw.card,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  infoLabel: { fontSize: 14, color: C.textMuted, width: 80 },
  infoValue: { fontSize: 15, fontWeight: '600', color: C.text, flex: 1 },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: -16 },

  obsBox: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 14,
    gap: 4,
    ...Shdw.card,
  },
  obsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  obsText: { fontSize: 14, color: C.text },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 2,
  },

  itemCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 14,
    gap: 8,
    ...Shdw.card,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: { fontSize: 15, fontWeight: '600', color: C.text, flex: 1 },
  itemCode: { fontSize: 12, color: C.textMuted },
  itemQtys: { flexDirection: 'row', gap: 16 },
  qtyBlock: { alignItems: 'center', minWidth: 52 },
  qtyLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  qtyVal: { fontSize: 18, fontWeight: '700', color: C.text, marginTop: 2 },
  itemObs: { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },

  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.entry,
    borderRadius: R.lg,
    paddingVertical: 17,
    marginTop: 8,
    ...Shdw.float,
  },
  approveBtnDisabled: { opacity: 0.55 },
  approveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
