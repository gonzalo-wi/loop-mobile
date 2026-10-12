import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getStockControls } from '@/features/stock-controls/services/stockControlApi';
import { EmptyState, Pill, ScreenHeader, SecondaryButton, SegmentedControl } from '@/components/ui';
import { ControlStatusChip } from '@/features/stock-controls/components/ControlStatusChip';
import { useAuthStore } from '@/store/authStore';
import { useRouteStore } from '@/store/routeStore';
import type { StockControl } from '@/features/stock-controls/types';
import { C, R, S, T } from '@/lib/theme';

const TYPE_LABELS: Record<string, string> = {
  EXIT: 'Salida',
  ENTRY: 'Entrada',
};

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

function ControlCard({
  control,
  onPress,
}: {
  control: StockControl;
  onPress: () => void;
}) {
  const isExit = control.type === 'EXIT';
  const isEditable = control.status === 'CONTROLLED';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Control de ${TYPE_LABELS[control.type] ?? control.type}, reparto ${control.routeCode}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <Pill
          label={TYPE_LABELS[control.type] ?? control.type}
          icon={isExit ? 'arrow-up' : 'arrow-down'}
          tone={isExit ? 'blue' : 'green'}
        />
        <Text style={styles.cardRoute}>Reparto {control.routeCode}</Text>
        <Text style={styles.cardTime}>{formatTime(control.createdAt)}</Text>
      </View>

      <Text style={styles.cardBranch}>{control.branchName}</Text>

      <View style={styles.cardBottom}>
        <ControlStatusChip status={control.status} />
        <Text style={styles.cardItems}>{control.items.length} productos</Text>
        {isEditable && (
          <View style={styles.editHint}>
            <Text style={styles.editHintText}>Editar</Text>
            <Ionicons name="chevron-forward" size={16} color={C.blueText} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

type FilterType = 'ALL' | 'EXIT' | 'ENTRY';

function ControllerHistory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [controls, setControls] = useState<StockControl[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = getTodayDate();
      const result = await getStockControls({ from: today, to: today, size: 50 });
      setControls(result.controls);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const today = getTodayDate();
      const result = await getStockControls({ from: today, to: today, size: 50 });
      setControls(result.controls);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar historial');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filtered = filter === 'ALL' ? controls : controls.filter((c) => c.type === filter);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Historial" subtitle={`Hoy · ${getTodayDate().split('-').reverse().join('/')}`} />
      <View style={styles.segment}>
        <SegmentedControl
          tone="onCream"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ALL', label: 'Todos', activeColor: C.navy },
            { value: 'EXIT', label: 'Salidas', icon: 'arrow-up', activeColor: C.blue },
            { value: 'ENTRY', label: 'Entradas', icon: 'arrow-down', activeColor: C.greenDot },
          ]}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <EmptyState icon="cloud-offline-outline" title="No se pudo cargar el historial" hint={error} />
          <View style={styles.retryWrap}>
            <SecondaryButton title="Reintentar" icon="refresh" onPress={load} />
          </View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ControlCard
              control={item}
              onPress={() => router.push(`/edit-control?id=${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title="Sin controles hoy"
              hint="Los controles de salida y entrada que hagas van a aparecer acá."
              style={styles.empty}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  pressed: { opacity: 0.85 },
  segment: { paddingHorizontal: S.gutter, paddingBottom: S.md },
  list: { paddingHorizontal: S.gutter, paddingBottom: S.lg, gap: S.sm + 2, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', padding: S.gutter, gap: S.lg },
  retryWrap: { alignSelf: 'center' },
  empty: { flex: 1 },

  card: { gap: S.sm + 2, padding: S.lg, borderRadius: R.card, backgroundColor: C.white },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: S.md - 2 },
  cardRoute: { ...T.data, color: C.navy, flex: 1 },
  cardTime: { ...T.secondary, color: C.ink2, fontVariant: ['tabular-nums'] },
  cardBranch: { ...T.body, color: C.ink2 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: S.md - 2 },
  cardItems: { ...T.secondary, color: C.ink2, flex: 1 },
  editHint: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  editHintText: { ...T.label, color: C.blueText },
});

// ─── Driver history: la semana pasada, para el mismo día de reparto ─────────────

const DAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DAYS_ABBR = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function ddmm(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
/** Próximo día de reparto: mañana; si cae domingo, lunes (igual que el default de salida). */
function nextDeliveryDate(): Date {
  const d = addDays(new Date(), 1);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}

function SalidaCard({
  control, featured, onPress,
}: { control: StockControl; featured?: boolean; onPress: () => void }) {
  const d = parseYMD(control.controlDate);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Control de salida del ${ddmm(d)}`}
      style={({ pressed }) => [dStyles.card, featured && dStyles.cardFeatured, pressed && styles.pressed]}
    >
      <View style={[dStyles.dateBox, featured && dStyles.dateBoxFeatured]}>
        <Text style={[dStyles.dateWd, featured && dStyles.onFeatured]}>{DAYS_ABBR[d.getDay()]}</Text>
        <Text style={[dStyles.dateNum, featured && dStyles.onFeatured]}>{String(d.getDate()).padStart(2, '0')}</Text>
      </View>
      <View style={dStyles.mid}>
        <Text style={dStyles.cardTitle}>Control de salida</Text>
        <Text style={dStyles.cardMeta}>{ddmm(d)} · {control.items.length} productos</Text>
        <ControlStatusChip status={control.status} />
      </View>
      <Ionicons name="chevron-forward" size={20} color={C.ink2} />
    </Pressable>
  );
}

function DriverHistory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { route } = useRouteStore();

  const [controls, setControls] = useState<StockControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastWeek = addDays(nextDeliveryDate(), -7);
  const lastWeekYmd = ymd(lastWeek);

  const load = useCallback(async () => {
    if (!route) { setLoading(false); return; }
    setError(null);
    try {
      const delivery = nextDeliveryDate();
      const from = ymd(addDays(delivery, -21));
      const to = ymd(delivery);
      const res = await getStockControls({ routeId: route.routeId, type: 'EXIT', from, to, size: 100 });
      const sorted = [...res.controls].sort((a, b) => b.controlDate.localeCompare(a.controlDate));
      setControls(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar tu historial');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const featured = controls.find((c) => c.controlDate === lastWeekYmd) ?? null;
  const others = controls.filter((c) => c.id !== featured?.id);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Historial" subtitle="Tus controles de salida" />

      {!route ? (
        <View style={styles.centered}>
          <EmptyState icon="warning-outline" title="Sin reparto asignado" hint="Contactá al administrador." />
        </View>
      ) : loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={C.navy} /></View>
      ) : error ? (
        <View style={styles.centered}>
          <EmptyState icon="cloud-offline-outline" title="No se pudo cargar tu historial" hint={error} />
          <View style={styles.retryWrap}>
            <SecondaryButton title="Reintentar" icon="refresh" onPress={load} />
          </View>
        </View>
      ) : (
        <FlatList
          data={others}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SalidaCard control={item} onPress={() => router.push(`/edit-control?id=${item.id}`)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}
          ListHeaderComponent={
            <View style={dStyles.header}>
              <View style={dStyles.explain}>
                <Ionicons name="calendar-outline" size={20} color={C.blueText} />
                <Text style={dStyles.explainText}>
                  Mirá lo que cargaste el <Text style={dStyles.explainStrong}>{DAYS_LONG[lastWeek.getDay()]} pasado ({ddmm(lastWeek)})</Text>, para el mismo día que vas a repartir.
                </Text>
              </View>

              <Text style={dStyles.label} accessibilityRole="header">La semana pasada</Text>
              {featured ? (
                <SalidaCard control={featured} featured onPress={() => router.push(`/edit-control?id=${featured.id}`)} />
              ) : (
                <View style={dStyles.emptyFeatured}>
                  <Ionicons name="document-outline" size={22} color={C.ink2} />
                  <Text style={dStyles.emptyFeaturedText}>
                    No cargaste un control de salida para el {DAYS_LONG[lastWeek.getDay()]} {ddmm(lastWeek)}.
                  </Text>
                </View>
              )}

              {others.length > 0 && (
                <Text style={[dStyles.label, dStyles.labelSpaced]} accessibilityRole="header">Salidas anteriores</Text>
              )}
            </View>
          }
          ListEmptyComponent={
            !featured ? (
              <EmptyState
                icon="time-outline"
                title="Sin salidas recientes"
                hint="Tus controles de salida aparecerán acá"
                style={styles.empty}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const { user } = useAuthStore();
  return user?.role === 'REPARTIDOR' ? <DriverHistory /> : <ControllerHistory />;
}

const DATE_BOX = 56;

const dStyles = StyleSheet.create({
  header: { gap: S.sm + 2, marginBottom: S.xs },
  explain: {
    flexDirection: 'row', alignItems: 'flex-start', gap: S.md - 2,
    backgroundColor: C.blueLight, borderRadius: R.field, padding: S.lg,
  },
  explainText: { ...T.body, flex: 1, color: C.navy },
  explainStrong: { fontFamily: T.button.fontFamily, color: C.blueText },
  label: { ...T.section, color: C.navy, marginTop: S.xs },
  labelSpaced: { marginTop: S.md },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    backgroundColor: C.white, borderRadius: R.card, padding: S.md,
    borderWidth: 2, borderColor: C.white,
  },
  cardFeatured: { borderColor: C.blue },
  dateBox: {
    width: DATE_BOX, height: DATE_BOX, borderRadius: R.md + 4, backgroundColor: C.cream,
    alignItems: 'center', justifyContent: 'center',
  },
  dateBoxFeatured: { backgroundColor: C.blue },
  dateWd: { ...T.systemTag, color: C.ink2 },
  dateNum: { ...T.screenTitle, color: C.navy, fontVariant: ['tabular-nums'] },
  onFeatured: { color: C.white },
  mid: { flex: 1, gap: S.xs },
  cardTitle: { ...T.data, color: C.navy },
  cardMeta: { ...T.secondary, color: C.ink2, fontVariant: ['tabular-nums'] },
  emptyFeatured: {
    flexDirection: 'row', alignItems: 'center', gap: S.md - 2,
    backgroundColor: C.white, borderRadius: R.card, padding: S.lg,
  },
  emptyFeaturedText: { ...T.secondary, flex: 1, color: C.ink2 },
});
