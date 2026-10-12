import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPendingArrivals } from '@/features/stock-controls/services/stockControlApi';
import { BLOCK_TONE, ColorBlock, EmptyState, ScreenHeader, SecondaryButton } from '@/components/ui';
import { getArrivalsProgress } from '@/features/stock-controls/lib/arrivalsProgress';
import type { PendingArrivals, PendingRoute } from '@/features/stock-controls/types';
import { C, R, S, T } from '@/lib/theme';

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ProgressBlock({ data, percent, done }: { data: PendingArrivals; percent: number; done: boolean }) {
  const tone = done ? 'green' : 'orange';
  const colors = BLOCK_TONE[tone];
  return (
    <ColorBlock tone={tone} style={styles.progressBlock}>
      <Text style={[styles.progressTitle, { color: colors.fg }]}>
        {done ? 'Todos los repartos llegaron' : `${data.pending} en ruta`}
      </Text>
      <View style={styles.counters}>
        {[
          { value: data.arrived, label: 'Llegaron' },
          { value: data.pending, label: 'Pendientes' },
          { value: data.totalExpected, label: 'Total' },
        ].map((c) => (
          <View key={c.label} style={styles.counter}>
            <Text style={[styles.counterValue, { color: colors.fg }]}>{c.value}</Text>
            <Text style={[styles.counterLabel, { color: colors.fgSub }]}>{c.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.track} accessibilityLabel={`${percent}% completado`}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <Text style={[styles.percent, { color: colors.fgSub }]}>{percent}% completado</Text>
    </ColorBlock>
  );
}

function PendingRouteRow({ route }: { route: PendingRoute }) {
  return (
    <View style={styles.row}>
      <View style={styles.routeBadge}>
        <Text style={styles.routeText}>R{route.routeCode}</Text>
      </View>
      <Text style={styles.branch}>{route.branchName}</Text>
      <View style={styles.onRoute}>
        <View style={styles.onRouteDot} />
        <Text style={styles.onRouteText}>En ruta</Text>
      </View>
    </View>
  );
}

export default function ArrivalsScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<PendingArrivals | null>(null);
  // Starts loading so the first frame doesn't flash the empty state.
  const [loading, setLoading] = useState(true);
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
  const progress = data ? getArrivalsProgress(data) : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="En ruta" subtitle={`Repartos pendientes · ${today}`} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <EmptyState icon="cloud-offline-outline" title="No se pudo cargar" hint={error} />
          <View style={styles.retryWrap}>
            <SecondaryButton title="Reintentar" icon="refresh" onPress={() => load()} />
          </View>
        </View>
      ) : (
        <FlatList
          data={progress?.state === 'empty' ? [] : data?.pendingRoutes ?? []}
          keyExtractor={(item) => item.routeId}
          renderItem={({ item }) => <PendingRouteRow route={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />
          }
          ListHeaderComponent={
            data && progress && progress.state !== 'empty' ? (
              <ProgressBlock data={data} percent={progress.percent} done={progress.state === 'allArrived'} />
            ) : null
          }
          ListEmptyComponent={
            progress?.state === 'allArrived' ? null : (
              <EmptyState
                icon="bus-outline"
                title="No hay repartos en ruta"
                hint="Cuando salga un reparto, lo vas a ver acá con su avance."
                style={styles.empty}
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  list: { paddingHorizontal: S.gutter, paddingBottom: S.lg, gap: S.sm, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', padding: S.gutter, gap: S.lg },
  retryWrap: { alignSelf: 'center' },
  empty: { flex: 1, marginTop: S.xs },

  progressBlock: { marginTop: S.xs, marginBottom: S.xs },
  progressTitle: { ...T.blockTitle, fontSize: 28, lineHeight: 34 },
  counters: { flexDirection: 'row', gap: S.md },
  counter: { flex: 1 },
  counterValue: { ...T.screenTitle, fontVariant: ['tabular-nums'] },
  counterLabel: { ...T.secondary },
  track: { height: 8, borderRadius: R.full, backgroundColor: C.pillOnGreen, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: R.full, backgroundColor: C.navy },
  percent: { ...T.secondary, textAlign: 'right' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    minHeight: 64,
    paddingHorizontal: S.md + 2,
    borderRadius: R.row,
    backgroundColor: C.white,
  },
  routeBadge: {
    minWidth: 48,
    height: 40,
    paddingHorizontal: S.sm,
    borderRadius: R.md,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeText: { ...T.label, fontFamily: T.button.fontFamily, color: C.navy, fontVariant: ['tabular-nums'] },
  branch: { ...T.data, color: C.navy, flex: 1 },
  onRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs + 2,
    height: 32,
    paddingHorizontal: S.md,
    borderRadius: R.full,
    backgroundColor: C.orangeSoft,
  },
  onRouteDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.orange },
  onRouteText: { ...T.secondary, fontFamily: T.label.fontFamily, color: C.orangeText },
});
