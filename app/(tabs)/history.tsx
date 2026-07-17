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

export default function HistoryScreen() {
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
