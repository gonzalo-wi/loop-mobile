import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStockControl, approveStockControl } from '@/features/stock-controls/services/stockControlApi';
import { useRouteStore } from '@/store/routeStore';
import {
  BLOCK_TONE,
  BottomBar,
  ColorBlock,
  EmptyState,
  Pill,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
  StatusOverlay,
  type OverlayStatus,
  type OverlayAction,
} from '@/components/ui';
import type { StockControl } from '@/features/stock-controls/types';
import { C, H, R, S, T } from '@/lib/theme';
import { isoDateToDisplay } from '@/lib/dateFormat';

function InfoRow({
  icon, label, value, first,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; first?: boolean }) {
  return (
    <View style={[styles.infoRow, !first && styles.rowDivider]}>
      <Ionicons name={icon} size={H.icon} color={C.ink2} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function QtyBox({ label, value, color = C.navy }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.qty} accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.qtyNum, { color }]}>{value}</Text>
      <Text style={styles.qtyLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function ApprovalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const header = (title: string, subtitle?: string) => (
    <ScreenHeader title={title} subtitle={subtitle} onBack={() => router.back()} />
  );

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {header('Control pendiente')}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      </View>
    );
  }

  if (error || !control) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {header('Control pendiente')}
        <View style={styles.centered}>
          <EmptyState
            icon="alert-circle-outline"
            title="No se pudo abrir el control"
            hint={error ?? 'Control no encontrado'}
          />
          <View style={styles.retryWrap}>
            <SecondaryButton title="Volver" icon="chevron-back" onPress={() => router.back()} />
          </View>
        </View>
      </View>
    );
  }

  const isExit = control.type === 'EXIT';
  const tone = isExit ? 'blue' : 'green';
  const colors = BLOCK_TONE[tone];
  const dateFormatted = isoDateToDisplay(control.controlDate);
  const isApprovable = control.status === 'PENDING_DRIVER_APPROVAL';
  const typeTitle = isExit ? 'Control de Salida' : 'Control de Entrada';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {header(typeTitle, control.branchName)}

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: (isApprovable ? BOTTOM_BAR_SPACE : S.xxl) + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Direction block: EXIT = blue, ENTRY = green */}
        <ColorBlock tone={tone} style={styles.block}>
          <Text style={[styles.blockTitle, { color: colors.fg }]} accessibilityRole="header">
            {isExit ? '↗ Control de Salida' : '↙ Control de Entrada'}
          </Text>
          <Pill label="Pendiente de aprobación" tone={isExit ? 'onBlue' : 'onGreen'} />
        </ColorBlock>

        {/* Control info */}
        <View style={styles.card}>
          <InfoRow icon="location-outline" label="Sucursal" value={control.branchName} first />
          <InfoRow icon="car-outline" label="Reparto" value={control.routeCode} />
          <InfoRow icon="calendar-outline" label="Fecha" value={dateFormatted} />
          {control.truckOrdered && (
            <View style={[styles.infoRow, styles.rowDivider]}>
              <Ionicons name="checkmark-circle-outline" size={H.icon} color={C.greenDot} />
              <Text style={styles.truckText}>Camión ordenado</Text>
            </View>
          )}
        </View>

        {/* Observations */}
        {control.observations ? (
          <View style={styles.card}>
            <Text style={styles.obsLabel}>Observaciones</Text>
            <Text style={styles.obsText}>{control.observations}</Text>
          </View>
        ) : null}

        {/* Products */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Productos</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{control.items.length}</Text>
          </View>
        </View>

        {control.items.map((item) => (
          <View key={item.id} style={styles.item}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemCode}>{item.productCode}</Text>
            </View>
            <View style={styles.itemQtys}>
              <QtyBox label="Total" value={item.totalQuantity} />
              <QtyBox label="Llenos" value={item.fullQuantity} />
              <QtyBox label="Recambios" value={item.exchangeQuantity} />
              {item.differenceQuantity != null && (
                <QtyBox
                  label="Diferencia"
                  value={item.differenceQuantity}
                  color={item.differenceQuantity !== 0 ? C.redText : C.greenDot}
                />
              )}
            </View>
            {item.observations ? (
              <Text style={styles.itemObs}>{item.observations}</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>

      {isApprovable && (
        <BottomBar>
          <View style={styles.flex}>
            <PrimaryButton
              title="Aprobar control"
              icon="checkmark-circle-outline"
              onPress={handleApprove}
              loading={approving}
            />
          </View>
        </BottomBar>
      )}

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
    </View>
  );
}

// Primary button + the bottom bar's vertical padding, so the last product isn't hidden.
const BOTTOM_BAR_SPACE = H.primaryButton + S.md * 2 + S.lg;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: S.gutter, gap: S.md },
  centered: { flex: 1, justifyContent: 'center', padding: S.gutter, gap: S.lg },
  retryWrap: { alignSelf: 'center' },

  block: { gap: S.lg, padding: S.xl },
  blockTitle: { ...T.blockTitle },

  card: { paddingHorizontal: S.xl, paddingVertical: S.xs, borderRadius: R.card, backgroundColor: C.white },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 56 },
  rowDivider: { borderTopWidth: 1, borderTopColor: C.line },
  infoLabel: { ...T.body, color: C.ink2, width: 84 },
  infoValue: { ...T.data, color: C.navy, flex: 1 },
  truckText: { ...T.label, color: C.greenDot, flex: 1 },

  obsLabel: { ...T.label, color: C.ink2, paddingTop: S.md },
  obsText: { ...T.body, color: C.navy, paddingBottom: S.md },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.sm },
  sectionTitle: { ...T.section, color: C.navy },
  countPill: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: S.sm,
    borderRadius: 12,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: { ...T.secondary, fontFamily: T.button.fontFamily, color: C.white, fontVariant: ['tabular-nums'] },

  item: {
    gap: S.md,
    padding: S.lg,
    paddingLeft: S.xl,
    borderRadius: R.card,
    backgroundColor: C.white,
  },
  itemHeader: { gap: 2 },
  itemName: { ...T.data, color: C.navy },
  itemCode: { ...T.secondary, fontFamily: T.body.fontFamily, color: C.ink2 },
  itemQtys: { flexDirection: 'row', gap: S.sm },
  qty: {
    flex: 1,
    paddingVertical: S.sm,
    paddingHorizontal: S.xs,
    borderRadius: R.row,
    backgroundColor: C.cream,
    alignItems: 'center',
  },
  qtyNum: { ...T.screenTitle, fontVariant: ['tabular-nums'] },
  qtyLabel: { ...T.secondary, color: C.ink2 },
  itemObs: { ...T.secondary, fontFamily: T.body.fontFamily, color: C.ink2 },
});
