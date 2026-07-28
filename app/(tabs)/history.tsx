import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getStockControls } from '@/features/stock-controls/services/stockControlApi';
import { HeroHeader } from '@/components/HeroHeader';
import { useAuthStore } from '@/store/authStore';
import { useRouteStore } from '@/store/routeStore';
import type { StockControl } from '@/features/stock-controls/types';
import { C, R, Shdw } from '@/lib/theme';

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  CONTROLLED: { label: 'Controlado', color: '#2563EB', bgColor: '#EBF2FF' },
  PENDING_DRIVER_APPROVAL: { label: 'Pendiente', color: '#D97706', bgColor: '#FEF3C7' },
  ACCEPTED_BY_DRIVER: { label: 'Aprobado', color: '#059669', bgColor: '#D1FAE5' },
  REJECTED_BY_DRIVER: { label: 'Rechazado', color: '#DC2626', bgColor: '#FEF2F2' },
  WITH_DIFFERENCES: { label: 'Con diferencias', color: '#D97706', bgColor: '#FEF3C7' },
  SENT_TO_AGUAS: { label: 'Enviado a Aguas', color: '#6D28D9', bgColor: '#EDE9FE' },
  AGUAS_ERROR: { label: 'Error Aguas', color: '#DC2626', bgColor: '#FEF2F2' },
  CANCELLED: { label: 'Cancelado', color: '#6B7280', bgColor: '#F3F4F6' },
};

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
  const status = STATUS_LABELS[control.status] ?? { label: control.status, color: C.textSub, bgColor: C.inputBg };
  const isExit = control.type === 'EXIT';
  const isEditable = control.status === 'CONTROLLED';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardAccent, { backgroundColor: isExit ? C.exit : C.entry }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={[styles.typeChip, isExit ? styles.typeChipExit : styles.typeChipEntry]}>
            <Ionicons
              name={isExit ? 'arrow-up' : 'arrow-down'}
              size={11}
              color={isExit ? C.exit : C.entry}
            />
            <Text style={[styles.typeChipText, { color: isExit ? C.exit : C.entry }]}>
              {TYPE_LABELS[control.type] ?? control.type}
            </Text>
          </View>
          <Text style={styles.cardRoute}>Reparto {control.routeCode}</Text>
          <Text style={styles.cardTime}>{formatTime(control.createdAt)}</Text>
        </View>

        <Text style={styles.cardBranch}>{control.branchName}</Text>

        <View style={styles.cardBottom}>
          <View style={[styles.statusChip, { backgroundColor: status.bgColor }]}>
            <Text style={[styles.statusChipText, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={styles.cardItems}>{control.items.length} productos</Text>
          {isEditable && (
            <View style={styles.editHint}>
              <Text style={styles.editHintText}>Editar</Text>
              <Ionicons name="chevron-forward" size={13} color={C.primary} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

type FilterType = 'ALL' | 'EXIT' | 'ENTRY';

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'EXIT', label: 'Salidas' },
  { key: 'ENTRY', label: 'Entradas' },
];

function SegmentedFilter({
  value,
  onChange,
}: {
  value: FilterType;
  onChange: (v: FilterType) => void;
}) {
  return (
    <View style={filterStyles.container}>
      {FILTER_OPTIONS.map((opt) => {
        const isActive = value === opt.key;
        const accentColor =
          opt.key === 'EXIT' ? C.exit : opt.key === 'ENTRY' ? C.entry : C.primary;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[
              filterStyles.pill,
              isActive && { backgroundColor: accentColor },
            ]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.75}
          >
            {opt.key === 'EXIT' && (
              <Ionicons
                name="arrow-up"
                size={12}
                color={isActive ? '#fff' : C.exit}
                style={filterStyles.pillIcon}
              />
            )}
            {opt.key === 'ENTRY' && (
              <Ionicons
                name="arrow-down"
                size={12}
                color={isActive ? '#fff' : C.entry}
                style={filterStyles.pillIcon}
              />
            )}
            <Text
              style={[
                filterStyles.pillText,
                { color: isActive ? '#fff' : C.textSub },
                isActive && filterStyles.pillTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ControllerHistory() {
  const router = useRouter();
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
    <View style={styles.screen}>
      <HeroHeader title="Historial" subtitle={`Hoy · ${getTodayDate().split('-').reverse().join('/')}`} />
      <SegmentedFilter value={filter} onChange={setFilter} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="time-outline" size={40} color={C.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Sin controles hoy</Text>
              <Text style={styles.emptySub}>Los controles realizados aparecerán aquí</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    overflow: 'hidden',
    ...Shdw.card,
  },
  cardAccent: { width: 5 },
  cardContent: { flex: 1, padding: 15, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: R.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  typeChipExit: { backgroundColor: C.exitLight },
  typeChipEntry: { backgroundColor: C.entryLight },
  typeChipText: { fontSize: 11, fontWeight: '800' },
  cardRoute: { fontSize: 14, fontWeight: '700', color: C.textSub, flex: 1 },
  cardTime: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  cardBranch: { fontSize: 16, fontWeight: '800', color: C.text },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  statusChip: { borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusChipText: { fontSize: 12, fontWeight: '700' },
  cardItems: { fontSize: 12, color: C.textMuted, flex: 1, fontWeight: '600' },
  editHint: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  editHintText: { fontSize: 12, color: C.primary, fontWeight: '700' },
  errorText: { color: C.danger, fontSize: 15, textAlign: 'center', marginBottom: 14 },
  retryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: C.primary,
    borderRadius: R.md,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: R.full,
    backgroundColor: C.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.textSub },
  emptySub: { fontSize: 14, color: C.textMuted, marginTop: 6, textAlign: 'center' },
});

const filterStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    backgroundColor: C.inputBg,
    borderRadius: R.lg,
    padding: 4,
    gap: 2,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: R.md,
    gap: 4,
  },
  pillIcon: { marginRight: 1 },
  pillText: { fontSize: 13, fontWeight: '600' },
  pillTextActive: { fontWeight: '800' },
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
  const status = STATUS_LABELS[control.status] ?? { label: control.status, color: C.textSub, bgColor: C.inputBg };
  return (
    <TouchableOpacity style={[dStyles.card, featured && dStyles.cardFeatured]} onPress={onPress} activeOpacity={0.85}>
      <View style={[dStyles.dateBox, featured && dStyles.dateBoxFeatured]}>
        <Text style={[dStyles.dateWd, featured && dStyles.onFeatured]}>{DAYS_ABBR[d.getDay()]}</Text>
        <Text style={[dStyles.dateNum, featured && dStyles.onFeatured]}>{String(d.getDate()).padStart(2, '0')}</Text>
      </View>
      <View style={dStyles.mid}>
        <Text style={dStyles.cardTitle}>Control de salida</Text>
        <Text style={dStyles.cardMeta}>{ddmm(d)} · {control.items.length} productos</Text>
        <View style={[dStyles.statusChip, { backgroundColor: status.bgColor }]}>
          <Text style={[dStyles.statusChipText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={C.textFaint} />
    </TouchableOpacity>
  );
}

function DriverHistory() {
  const router = useRouter();
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
    <View style={styles.screen}>
      <HeroHeader title="Historial" subtitle="Tus controles de salida" />

      {!route ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Sin reparto asignado</Text>
          <Text style={styles.emptySub}>Contactá al administrador.</Text>
        </View>
      ) : loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}><Text style={styles.retryText}>Reintentar</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={others}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SalidaCard control={item} onPress={() => router.push(`/edit-control?id=${item.id}`)} />
          )}
          contentContainerStyle={dStyles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListHeaderComponent={
            <View style={dStyles.header}>
              <View style={dStyles.explain}>
                <Ionicons name="calendar-outline" size={16} color={C.primary} />
                <Text style={dStyles.explainText}>
                  Mirá lo que cargaste el <Text style={dStyles.explainStrong}>{DAYS_LONG[lastWeek.getDay()]} pasado ({ddmm(lastWeek)})</Text>, para el mismo día que vas a repartir.
                </Text>
              </View>

              <Text style={dStyles.label}>La semana pasada</Text>
              {featured ? (
                <SalidaCard control={featured} featured onPress={() => router.push(`/edit-control?id=${featured.id}`)} />
              ) : (
                <View style={dStyles.emptyFeatured}>
                  <Ionicons name="document-outline" size={22} color={C.textMuted} />
                  <Text style={dStyles.emptyFeaturedText}>
                    No cargaste un control de salida para el {DAYS_LONG[lastWeek.getDay()]} {ddmm(lastWeek)}.
                  </Text>
                </View>
              )}

              {others.length > 0 && <Text style={[dStyles.label, { marginTop: 20 }]}>Salidas anteriores</Text>}
            </View>
          }
          ListEmptyComponent={
            !featured ? (
              <View style={dStyles.emptyAll}>
                <View style={styles.emptyIcon}><Ionicons name="time-outline" size={38} color={C.textMuted} /></View>
                <Text style={styles.emptyTitle}>Sin salidas recientes</Text>
                <Text style={styles.emptySub}>Tus controles de salida aparecerán acá</Text>
              </View>
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

const dStyles = StyleSheet.create({
  list: { padding: 16, gap: 10, flexGrow: 1 },
  header: { gap: 10 },
  explain: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 9,
    backgroundColor: C.primaryLight, borderRadius: R.md, padding: 13, marginBottom: 4,
  },
  explainText: { flex: 1, fontSize: 13, color: C.textSub, fontWeight: '600', lineHeight: 19 },
  explainStrong: { color: C.primary, fontWeight: '800' },
  label: {
    fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.9, marginLeft: 2,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    padding: 12, ...Shdw.card,
  },
  cardFeatured: { borderColor: C.primary, borderWidth: 1.5 },
  dateBox: {
    width: 54, height: 54, borderRadius: 13, backgroundColor: C.surfaceSunken,
    alignItems: 'center', justifyContent: 'center',
  },
  dateBoxFeatured: { backgroundColor: C.primary },
  dateWd: { fontSize: 10, fontWeight: '800', color: C.textMuted, letterSpacing: 0.5 },
  dateNum: { fontSize: 20, fontWeight: '800', color: C.text, lineHeight: 22 },
  onFeatured: { color: '#fff' },
  mid: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  cardMeta: { fontSize: 12.5, color: C.textMuted, fontWeight: '600' },
  statusChip: { alignSelf: 'flex-start', borderRadius: R.full, paddingHorizontal: 9, paddingVertical: 3, marginTop: 2 },
  statusChipText: { fontSize: 11.5, fontWeight: '700' },
  emptyFeatured: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    borderStyle: 'dashed', padding: 15,
  },
  emptyFeaturedText: { flex: 1, fontSize: 13, color: C.textMuted, fontWeight: '600', lineHeight: 18 },
  emptyAll: { alignItems: 'center', paddingTop: 40 },
});
