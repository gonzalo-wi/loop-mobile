import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPendingArrivals } from '@/features/stock-controls/services/stockControlApi';
import { HeroHeader } from '@/components/HeroHeader';
import type { PendingArrivals, PendingRoute } from '@/features/stock-controls/types';
import { C, R, S, F, W, Shdw } from '@/lib/theme';

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function StatsBar({ data }: { data: PendingArrivals }) {
  const allArrived = data.pending === 0;
  const progressPct = data.totalExpected > 0 ? data.arrived / data.totalExpected : 1;

  return (
    <View style={stats.container}>
      <View style={stats.counters}>
        {/* Llegaron */}
        <View style={[stats.chip, stats.chipArrived]}>
          <Ionicons name="checkmark-circle" size={18} color="rgba(255,255,255,0.8)" />
          <View>
            <Text style={[stats.chipNum, { color: '#fff' }]}>{data.arrived}</Text>
            <Text style={stats.chipLabel}>Llegaron</Text>
          </View>
        </View>

        {/* Divisor */}
        <View style={stats.divider} />

        {/* Pendientes */}
        <View style={[stats.chip, allArrived ? stats.chipArrived : stats.chipPending]}>
          <Ionicons
            name={allArrived ? 'checkmark-done-circle' : 'time'}
            size={18}
            color="rgba(255,255,255,0.8)"
          />
          <View>
            <Text style={[stats.chipNum, { color: '#fff' }]}>{data.pending}</Text>
            <Text style={stats.chipLabel}>Pendientes</Text>
          </View>
        </View>

        {/* Divisor */}
        <View style={stats.divider} />

        {/* Total */}
        <View style={stats.chip}>
          <Ionicons name="layers-outline" size={18} color={C.onHeaderMuted} />
          <View>
            <Text style={[stats.chipNum, { color: '#fff' }]}>{data.totalExpected}</Text>
            <Text style={stats.chipLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Barra de progreso */}
      <View style={stats.progressTrack}>
        <View style={[stats.progressFill, { width: `${Math.round(progressPct * 100)}%` as `${number}%` }]} />
      </View>
      <Text style={stats.progressLabel}>
        {Math.round(progressPct * 100)}% completado
      </Text>
    </View>
  );
}

function PendingRouteCard({ route }: { route: PendingRoute }) {
  return (
    <View style={card.container}>
      <View style={card.accent} />
      <View style={card.content}>
        <View style={card.top}>
          <View style={card.routeBadge}>
            <Text style={card.routeCode}>R{route.routeCode}</Text>
          </View>
          <Text style={card.branchName}>{route.branchName}</Text>
          <View style={card.statusChip}>
            <View style={card.statusDot} />
            <Text style={card.statusText}>En ruta</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function ArrivalsScreen() {
  const [data, setData] = useState<PendingArrivals | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await getPendingArrivals();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh cada 60 segundos
    const interval = setInterval(() => load(true), 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getPendingArrivals();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const today = getTodayDate().split('-').reverse().join('/');
  const allArrived = data !== null && data.pending === 0;

  return (
    <View style={styles.screen}>
      <HeroHeader
        title="En ruta"
        subtitle={`Repartos pendientes · ${today}`}
        color={allArrived ? C.entry : C.primary}
      >
        {data && <StatsBar data={data} />}
      </HeroHeader>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data?.pendingRoutes ?? []}
          keyExtractor={(item) => item.routeId}
          renderItem={({ item }) => <PendingRouteCard route={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
          ListHeaderComponent={
            data && allArrived ? (
              <View style={styles.allArrivedBanner}>
                <Ionicons name="checkmark-done-circle" size={22} color={C.entry} />
                <Text style={styles.allArrivedText}>Todos los repartos llegaron</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !allArrived ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="car-outline" size={38} color={C.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>Sin datos</Text>
                <Text style={styles.emptySub}>No hay repartos registrados para hoy</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

// ─── Estilos pantalla ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: C.danger, fontSize: F.base, textAlign: 'center', marginBottom: 14 },
  retryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: C.primary,
    borderRadius: R.md,
  },
  retryText: { color: '#fff', fontSize: F.base, fontWeight: W.bold },
  allArrivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.entryLight,
    borderRadius: R.lg,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(15,169,104,0.2)',
  },
  allArrivedText: { fontSize: F.base, fontWeight: W.bold, color: C.entry },
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
  emptyTitle: { fontSize: 17, fontWeight: W.extra, color: C.textSub },
  emptySub: { fontSize: F.sm, color: C.textMuted, marginTop: 6, textAlign: 'center' },
});

// ─── Estilos stats bar ───────────────────────────────────────────────────────

const stats = StyleSheet.create({
  container: { gap: S.sm },
  counters: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: R.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 0,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipArrived: {},
  chipPending: {},
  chipNum: {
    fontSize: F.lg,
    fontWeight: W.extra,
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  chipLabel: {
    fontSize: F.xs,
    color: C.onHeaderMuted,
    fontWeight: W.semibold,
    lineHeight: 14,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
  },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: R.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.entry,
    borderRadius: R.full,
  },
  progressLabel: {
    fontSize: F.xs,
    color: C.onHeaderMuted,
    fontWeight: W.semibold,
    textAlign: 'right',
  },
});

// ─── Estilos card de reparto ─────────────────────────────────────────────────

const card = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    overflow: 'hidden',
    ...Shdw.card,
  },
  accent: {
    width: 5,
    backgroundColor: C.warning,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeBadge: {
    backgroundColor: C.primaryLight,
    borderRadius: R.sm,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  routeCode: {
    fontSize: F.sm,
    fontWeight: W.extra,
    color: C.primary,
    letterSpacing: 0.2,
  },
  branchName: {
    flex: 1,
    fontSize: F.md,
    fontWeight: W.bold,
    color: C.text,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.warningLight,
    borderRadius: R.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.warning,
  },
  statusText: {
    fontSize: F.xs,
    fontWeight: W.bold,
    color: C.warning,
  },
});
