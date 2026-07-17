import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  AppState,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useRouteStore } from '@/store/routeStore';
import { getStockControls } from '@/features/stock-controls/services/stockControlApi';
import { HeroHeader } from '@/components/HeroHeader';
import type { StockControl } from '@/features/stock-controls/types';
import { C, R, Shdw } from '@/lib/theme';

// ─── Controller home ──────────────────────────────────────────────────────────

function ControllerHome() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const canDispensers = user?.role === 'ADMIN' || user?.role === 'CARGADOR_DISPENSERS';

  return (
    <View style={styles.screen}>
      <HeroHeader
        title={`Hola, ${user?.name?.split(' ')[0] ?? ''}`}
        subtitle={user?.role}
        rightAction={{ label: 'Salir', icon: 'log-out-outline', onPress: logout }}
      />

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Nuevo control</Text>

        <TouchableOpacity
          style={styles.controlCard}
          onPress={() => router.push('/new-control?type=EXIT')}
          activeOpacity={0.85}
        >
          <View style={[styles.iconBlock, styles.iconBlockExit]}>
            <Ionicons name="arrow-up" size={24} color={C.exit} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Control de Salida</Text>
            <Text style={styles.cardSub}>Mercadería que sale del depósito</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlCard}
          onPress={() => router.push('/new-control?type=ENTRY')}
          activeOpacity={0.85}
        >
          <View style={[styles.iconBlock, styles.iconBlockEntry]}>
            <Ionicons name="arrow-down" size={24} color={C.entry} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Control de Entrada</Text>
            <Text style={styles.cardSub}>Mercadería que retorna al depósito</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
        </TouchableOpacity>

        {canDispensers && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Dispensers</Text>
            <TouchableOpacity
              style={styles.controlCard}
              onPress={() => router.push('/dispensers')}
              activeOpacity={0.85}
            >
              <View style={[styles.iconBlock, { backgroundColor: C.accentLight }]}>
                <Ionicons name="cube" size={24} color={C.accent} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Carga / Descarga</Text>
                <Text style={styles.cardSub}>Escanear dispensers del camión</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Pending approval card ────────────────────────────────────────────────────

function PendingCard({
  control,
  onPress,
}: {
  control: StockControl;
  onPress: () => void;
}) {
  const [cd, cm, cy] = control.controlDate.split('-').reverse();
  const date = `${cd}/${cm}/${cy}`;
  const isExit = control.type === 'EXIT';

  return (
    <TouchableOpacity
      style={styles.pendingCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.pendingAccent, { backgroundColor: isExit ? C.exit : C.entry }]} />
      <View style={styles.pendingContent}>
        <View style={styles.pendingCardTop}>
          <View style={[styles.typeChip, isExit ? styles.typeChipExit : styles.typeChipEntry]}>
            <Ionicons
              name={isExit ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={isExit ? C.exit : C.entry}
            />
            <Text style={[styles.typeChipText, { color: isExit ? C.exit : C.entry }]}>
              {isExit ? 'Salida' : 'Entrada'}
            </Text>
          </View>
          <Text style={styles.pendingDate}>{date}</Text>
        </View>

        <Text style={styles.pendingBranch}>{control.branchName}</Text>
        <Text style={styles.pendingRoute}>Reparto {control.routeCode}</Text>

        <View style={styles.pendingFooter}>
          <Text style={styles.pendingItems}>{control.items.length} productos</Text>
          <View style={styles.reviewBtn}>
            <Text style={styles.reviewBtnText}>Revisar y aprobar</Text>
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Driver home ─────────────────────────────────────────────────────────────

function DriverHome() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { route, setPendingCount } = useRouteStore();

  const [controls, setControls] = useState<StockControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!route) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await getStockControls({
        routeId: route.routeId,
        status: 'PENDING_DRIVER_APPROVAL',
        size: 50,
      });
      setControls(result.controls);
      setPendingCount(result.controls.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar pendientes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route, setPendingCount]);

  // Recarga al entrar/volver a la pantalla (ej: tras aprobar un control).
  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load(true);
    });
    return () => sub.remove();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  return (
    <View style={styles.screen}>
      <HeroHeader
        title={`Hola, ${user?.name?.split(' ')[0] ?? ''}`}
        subtitle={route ? `Reparto ${route.routeCode} · ${route.branchName}` : 'REPARTIDOR'}
        rightAction={{ label: 'Salir', icon: 'log-out-outline', onPress: logout }}
      >
        {!loading && !error && (
          <View style={styles.heroStat}>
            <View style={styles.heroStatIcon}>
              <Ionicons
                name={controls.length > 0 ? 'alert-circle' : 'checkmark-circle'}
                size={20}
                color="#fff"
              />
            </View>
            <Text style={styles.heroStatText}>
              {controls.length > 0
                ? `${controls.length} control${controls.length !== 1 ? 'es' : ''} esperando tu aprobación`
                : 'No hay controles pendientes'}
            </Text>
          </View>
        )}
      </HeroHeader>

      <FlatList
        data={controls}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.driverList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
        ListHeaderComponent={
          <View>
            {!route && (
              <View style={styles.noRouteBanner}>
                <Ionicons name="warning-outline" size={20} color={C.warning} />
                <Text style={styles.noRouteText}>Sin reparto asignado. Contactá al administrador.</Text>
              </View>
            )}

            {loading && (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={C.primary} />
              </View>
            )}

            {error && !loading && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => load()} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            )}

            {!loading && !error && controls.length > 0 && (
              <Text style={styles.sectionTitle}>Controles pendientes</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <PendingCard
            control={item}
            onPress={() => router.push(`/approval-detail?id=${item.id}`)}
          />
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="checkmark-done" size={42} color={C.entry} />
              </View>
              <Text style={styles.emptyTitle}>Todo al día</Text>
              <Text style={styles.emptySub}>No hay controles pendientes de aprobación</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuthStore();
  return user?.role === 'REPARTIDOR' ? <DriverHome /> : <ControllerHome />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: { paddingHorizontal: 16, paddingTop: 22 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 4,
  },

  // Controller cards
  controlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 16,
    marginBottom: 12,
    ...Shdw.card,
  },
  iconBlock: {
    width: 52,
    height: 52,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconBlockExit: { backgroundColor: C.exitLight },
  iconBlockEntry: { backgroundColor: C.entryLight },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  cardSub: { fontSize: 13, color: C.textMuted, marginTop: 3 },

  // Hero stat (driver)
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  heroStatIcon: {
    width: 32,
    height: 32,
    borderRadius: R.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatText: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },

  // Driver list
  driverList: { padding: 16, flexGrow: 1 },

  noRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.warningLight,
    borderRadius: R.md,
    padding: 14,
    marginBottom: 16,
  },
  noRouteText: { flex: 1, fontSize: 14, color: C.warning, fontWeight: '600' },

  centered: { paddingVertical: 50, alignItems: 'center' },
  errorBox: { alignItems: 'center', paddingVertical: 28 },
  errorText: { color: C.danger, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  retryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: C.primary,
    borderRadius: R.md,
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Pending card
  pendingCard: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    marginBottom: 12,
    overflow: 'hidden',
    ...Shdw.card,
  },
  pendingAccent: { width: 5 },
  pendingContent: { flex: 1, padding: 15, gap: 6 },
  pendingCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: R.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeChipExit: { backgroundColor: C.exitLight },
  typeChipEntry: { backgroundColor: C.entryLight },
  typeChipText: { fontSize: 12, fontWeight: '800' },
  pendingDate: { fontSize: 13, color: C.textMuted, flex: 1, textAlign: 'right', fontWeight: '600' },
  pendingBranch: { fontSize: 17, fontWeight: '800', color: C.text },
  pendingRoute: { fontSize: 13, color: C.textSub, fontWeight: '500' },
  pendingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  pendingItems: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.primary,
    borderRadius: R.full,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 8,
  },
  reviewBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 56 },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: R.full,
    backgroundColor: C.entryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.textSub },
  emptySub: { fontSize: 14, color: C.textMuted, marginTop: 6, textAlign: 'center' },
});
