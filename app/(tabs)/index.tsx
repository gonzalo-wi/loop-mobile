import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  AppState,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useRouteStore } from '@/store/routeStore';
import { getStockControls } from '@/features/stock-controls/services/stockControlApi';
import { canAccessDispensers } from '@/features/dispensers/lib/access';
import { AppLogoBadge, BLOCK_TONE, ColorBlock, EmptyState, Pill, SecondaryButton } from '@/components/ui';
import type { StockControl } from '@/features/stock-controls/types';
import { C, H, R, S, T } from '@/lib/theme';

const DONE_STATUSES = new Set(['ACCEPTED_BY_DRIVER', 'SENT_TO_AGUAS']);

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function firstName(name?: string): string {
  return name?.trim().split(' ')[0] ?? '';
}

// ─── Controller home ───────────────────────────────────────────────────────────

/** Barcode bars drawn in the Dispensers block (decorative). */
const BARCODE_BARS = [3, 7, 2, 9, 3, 5, 2, 8, 3, 6];

function DirectionTile({
  type, onPress,
}: { type: 'EXIT' | 'ENTRY'; onPress: () => void }) {
  const isExit = type === 'EXIT';
  const tone = BLOCK_TONE[isExit ? 'blue' : 'green'];
  const word = isExit ? 'Salida' : 'Entrada';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Control de ${word}`}
      style={({ pressed }) => [home.tile, { backgroundColor: tone.bg }, pressed && home.pressed]}
    >
      <View style={[home.tileIcon, { backgroundColor: isExit ? C.white : C.navy }]}>
        <Ionicons
          name={isExit ? 'arrow-up' : 'arrow-down'}
          size={26}
          color={isExit ? C.blue : C.green}
          style={home.tileIconGlyph}
        />
      </View>
      <View>
        <Text style={[home.tileKicker, { color: tone.fgSub }]}>Control de</Text>
        <Text style={[home.tileWord, { color: tone.fg }]} numberOfLines={1} adjustsFontSizeToFit>
          {word}
        </Text>
        <Text style={[home.tileHint, { color: tone.fgSub }]}>
          {isExit ? 'Mercadería que sale del depósito' : 'Mercadería que retorna al depósito'}
        </Text>
      </View>
    </Pressable>
  );
}

function DispensersTile({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Dispensers, carga y descarga"
      style={({ pressed }) => [home.dispensers, pressed && home.pressed]}
    >
      <View style={home.barcode} pointerEvents="none">
        {BARCODE_BARS.map((w, i) => (
          <View key={i} style={[home.bar, { width: w }]} />
        ))}
      </View>
      <View style={home.dispensersTag}>
        <Text style={home.dispensersTagText}>DISPENSERS</Text>
      </View>
      <View style={home.dispensersFoot}>
        <View style={home.dispensersText}>
          <Text style={home.dispensersTitle}>Carga / Descarga</Text>
          <Text style={home.dispensersHint}>Escanear dispensers del camión</Text>
        </View>
        <View style={home.dispensersArrow}>
          <Ionicons name="arrow-forward" size={26} color={C.navy} />
        </View>
      </View>
    </Pressable>
  );
}

function ControllerHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const canDispensers = canAccessDispensers(user?.role);

  return (
    <ScrollView
      style={home.screen}
      contentContainerStyle={[home.content, { paddingTop: insets.top + S.lg }]}
    >
      <View style={home.header}>
        <AppLogoBadge />
        <View style={home.headerText}>
          <Text style={home.hello} accessibilityRole="header">{`Hola, ${firstName(user?.name)}`}</Text>
          {user?.role ? <Text style={home.role}>{user.role.toUpperCase()}</Text> : null}
        </View>
        <Pill label="Salir" icon="log-out-outline" onPress={logout} />
      </View>

      <View style={home.grid}>
        <View style={home.tiles}>
          <DirectionTile type="EXIT" onPress={() => router.push('/new-control?type=EXIT')} />
          <DirectionTile type="ENTRY" onPress={() => router.push('/new-control?type=ENTRY')} />
        </View>
        {canDispensers && <DispensersTile onPress={() => router.push('/dispensers')} />}
      </View>
    </ScrollView>
  );
}

// ─── Componentes de la home del repartidor ─────────────────────────────────────

function SummaryTile({
  value, label, icon, tone,
}: { value: number; label: string; icon: keyof typeof Ionicons.glyphMap; tone: 'neutral' | 'warn' | 'ok' }) {
  const bg = { neutral: C.cream, warn: C.orangeSoft, ok: C.greenSoft }[tone];
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={C.navy} />
      </View>
      <Text style={styles.tileNum}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function PendingCard({ control, onPress }: { control: StockControl; onPress: () => void }) {
  const isExit = control.type === 'EXIT';
  const [y, m, d] = control.controlDate.split('-');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Revisar control de ${isExit ? 'salida' : 'entrada'}, reparto ${control.routeCode}`}
      style={({ pressed }) => [styles.pend, pressed && home.pressed]}
    >
      <View style={styles.pendTop}>
        <Pill label={isExit ? 'Salida' : 'Entrada'} icon={isExit ? 'arrow-up' : 'arrow-down'} tone={isExit ? 'blue' : 'green'} />
        <Text style={styles.pendDate}>{`${d}/${m}/${y}`}</Text>
      </View>
      <View>
        <Text style={styles.pendBranch}>{control.branchName}</Text>
        <Text style={styles.pendRoute}>Reparto {control.routeCode}</Text>
      </View>
      <View style={styles.pendFoot}>
        <Text style={styles.pendItems}>{control.items.length} productos</Text>
        <View style={styles.pendCta}>
          <Text style={styles.pendCtaText}>Revisar</Text>
          <Ionicons name="chevron-forward" size={16} color={C.white} />
        </View>
      </View>
    </Pressable>
  );
}

// ─── Driver home ───────────────────────────────────────────────────────────────

function DriverHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const { route, setPendingCount } = useRouteStore();

  const [pending, setPending] = useState<StockControl[]>([]);
  const [today, setToday] = useState<StockControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!route) { setLoading(false); return; }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const t = todayStr();
      const [p, d] = await Promise.all([
        getStockControls({ routeId: route.routeId, status: 'PENDING_DRIVER_APPROVAL', size: 50 }),
        getStockControls({ routeId: route.routeId, from: t, to: t, size: 50 }),
      ]);
      setPending(p.controls);
      setPendingCount(p.controls.length);
      setToday(d.controls);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar tu día');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route, setPendingCount]);

  useFocusEffect(useCallback(() => { load(true); }, [load]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') load(true); });
    return () => sub.remove();
  }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, [load]);

  const completed = today.filter((c) => DONE_STATUSES.has(c.status)).length;
  const lastActivity = today.length
    ? [...today].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0]
    : null;
  const hasPending = pending.length > 0;
  const statusTone = BLOCK_TONE[hasPending ? 'orange' : 'green'];

  return (
    <ScrollView
      style={home.screen}
      contentContainerStyle={[home.content, { paddingTop: insets.top + S.lg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}
    >
      <View style={home.header}>
        <AppLogoBadge />
        <View style={home.headerText}>
          <Text style={home.hello} accessibilityRole="header">{`Hola, ${firstName(user?.name)}`}</Text>
          <Text style={styles.routeLine}>
            {route ? `Reparto ${route.routeCode} · ${route.branchName}` : 'REPARTIDOR'}
          </Text>
        </View>
        <Pill label="Salir" icon="log-out-outline" onPress={logout} />
      </View>

      {!route && (
        <EmptyState icon="warning-outline" title="Sin reparto asignado" hint="Contactá al administrador." />
      )}

      {loading && (
        <View style={styles.centered}><ActivityIndicator size="large" color={C.navy} /></View>
      )}

      {error && !loading && (
        <View style={styles.errorWrap}>
          <EmptyState icon="cloud-offline-outline" title="No se pudo cargar tu día" hint={error} />
          <View style={styles.retryWrap}>
            <SecondaryButton title="Reintentar" icon="refresh" onPress={() => load()} />
          </View>
        </View>
      )}

      {route && !loading && !error && (
        <>
          {/* Estado principal: verde al día, naranja con controles por revisar */}
          <ColorBlock tone={hasPending ? 'orange' : 'green'} style={styles.status}>
            <View style={styles.statusIcon}>
              <Ionicons name={hasPending ? 'clipboard-outline' : 'checkmark'} size={30} color={hasPending ? C.orange : C.green} />
            </View>
            <View>
              <Text style={[styles.statusTitle, { color: statusTone.fg }]}>
                {hasPending
                  ? `${pending.length} control${pending.length !== 1 ? 'es' : ''} pendiente${pending.length !== 1 ? 's' : ''}`
                  : 'Todo al día'}
              </Text>
              <Text style={[styles.statusSub, { color: statusTone.fgSub }]}>
                {hasPending ? 'Esperan tu revisión y aprobación' : 'No tenés controles pendientes'}
              </Text>
            </View>
          </ColorBlock>

          {hasPending && (
            <View style={styles.sec}>
              <Text style={styles.secTitle} accessibilityRole="header">Pendientes de aprobación</Text>
              {pending.map((c) => (
                <PendingCard key={c.id} control={c} onPress={() => router.push(`/approval-detail?id=${c.id}`)} />
              ))}
            </View>
          )}

          <View style={styles.sec}>
            <Text style={styles.secTitle} accessibilityRole="header">Resumen de hoy</Text>
            <View style={styles.tiles}>
              <SummaryTile value={pending.length} label="Pendientes" icon="time-outline" tone={hasPending ? 'warn' : 'neutral'} />
              <SummaryTile value={completed} label="Completados" icon="checkmark" tone="ok" />
              <SummaryTile value={today.length} label="Controles hoy" icon="document-text-outline" tone="neutral" />
            </View>
          </View>

          {lastActivity && (
            <View style={styles.sec}>
              <Text style={styles.secTitle} accessibilityRole="header">Última actividad</Text>
              <Pressable
                style={({ pressed }) => [styles.act, pressed && home.pressed]}
                onPress={() => router.push(`/edit-control?id=${lastActivity.id}`)}
                accessibilityRole="button"
              >
                <View style={[styles.actIcon, { backgroundColor: lastActivity.type === 'EXIT' ? C.blueLight : C.greenSoft }]}>
                  <Ionicons
                    name={lastActivity.type === 'EXIT' ? 'arrow-up' : 'arrow-down'}
                    size={22}
                    color={lastActivity.type === 'EXIT' ? C.blueText : C.greenDot}
                  />
                </View>
                <View style={styles.actMid}>
                  <Text style={styles.actTitle}>Control de {lastActivity.type === 'EXIT' ? 'salida' : 'entrada'}</Text>
                  <Text style={styles.actMeta}>
                    {route.truckPlate ? `${route.truckPlate} · ` : ''}Hoy {formatTime(lastActivity.createdAt)}
                  </Text>
                </View>
                {DONE_STATUSES.has(lastActivity.status) && (
                  <View style={styles.okBadge}>
                    <Ionicons name="checkmark" size={14} color={C.navy} />
                    <Text style={styles.okBadgeText}>Completado</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={C.ink2} />
              </Pressable>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { user } = useAuthStore();
  return user?.role === 'REPARTIDOR' ? <DriverHome /> : <ControllerHome />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const STATUS_ICON = 64;

const styles = StyleSheet.create({
  routeLine: { ...T.secondary, color: C.ink2 },
  centered: { paddingVertical: S.xxxl, alignItems: 'center' },
  errorWrap: { gap: S.lg },
  retryWrap: { alignSelf: 'center' },

  status: { gap: S.xl, padding: S.xl },
  statusIcon: {
    width: STATUS_ICON,
    height: STATUS_ICON,
    borderRadius: STATUS_ICON / 2,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { ...T.blockTitle, fontSize: 32, lineHeight: 38 },
  statusSub: { ...T.label, fontSize: T.body.fontSize },

  sec: { gap: S.md },
  secTitle: { ...T.section, color: C.navy },

  tiles: { flexDirection: 'row', gap: S.sm },
  tile: { flex: 1, gap: S.xs, padding: S.lg, borderRadius: R.card, backgroundColor: C.white },
  tileIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: S.sm },
  tileNum: { ...T.blockTitle, color: C.navy, fontVariant: ['tabular-nums'] },
  tileLabel: { ...T.label, fontFamily: T.secondary.fontFamily, color: C.ink2 },

  pend: { gap: S.md, padding: S.lg, borderRadius: R.card, backgroundColor: C.white },
  pendTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pendDate: { ...T.secondary, color: C.ink2, fontVariant: ['tabular-nums'] },
  pendBranch: { ...T.section, color: C.navy },
  pendRoute: { ...T.secondary, color: C.ink2 },
  pendFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pendItems: { ...T.secondary, color: C.ink2 },
  pendCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    height: H.touch,
    paddingLeft: S.lg,
    paddingRight: S.md,
    borderRadius: H.touch / 2,
    backgroundColor: C.navy,
  },
  pendCtaText: { ...T.label, color: C.white },

  act: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md + 2, borderRadius: R.card, backgroundColor: C.white },
  actIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  actMid: { flex: 1, gap: 2 },
  actTitle: { ...T.data, color: C.navy },
  actMeta: { ...T.secondary, color: C.ink2, fontVariant: ['tabular-nums'] },
  okBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    height: 28,
    paddingHorizontal: S.md - 2,
    borderRadius: 14,
    backgroundColor: C.greenSoft,
  },
  okBadgeText: { ...T.secondary, fontFamily: T.label.fontFamily, color: C.navy },
});

const TILE_HEIGHT = 250;
const DISPENSERS_HEIGHT = 190;
const TILE_ICON = 56;

const home = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  content: { paddingHorizontal: S.gutterWide, paddingBottom: S.xxl, gap: S.xxl - 4 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },

  header: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  headerText: { flex: 1 },
  hello: { ...T.screenTitle, color: C.navy },
  role: { ...T.secondary, fontFamily: T.label.fontFamily, fontSize: 12, lineHeight: 16, letterSpacing: 0.96, color: C.ink2 },

  grid: { gap: S.md },
  tiles: { flexDirection: 'row', gap: S.md },
  tile: {
    flex: 1,
    height: TILE_HEIGHT,
    padding: S.xl,
    borderRadius: R.block,
    justifyContent: 'space-between',
  },
  tileIcon: {
    width: TILE_ICON,
    height: TILE_ICON,
    borderRadius: TILE_ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Diagonal arrows like the mockup (out goes up-right, in goes down-left).
  tileIconGlyph: { transform: [{ rotate: '45deg' }] },
  tileKicker: { ...T.label, fontFamily: T.secondary.fontFamily },
  tileWord: { ...T.tabTitle },
  tileHint: { ...T.secondary, fontFamily: T.body.fontFamily, marginTop: S.xs + 2 },

  dispensers: {
    height: DISPENSERS_HEIGHT,
    padding: S.xl,
    borderRadius: R.block,
    backgroundColor: C.navy,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  barcode: { position: 'absolute', top: S.xl, right: S.xl, height: TILE_ICON, flexDirection: 'row', gap: 5 },
  bar: { borderRadius: 2, backgroundColor: C.onNavyDeco },
  dispensersTag: {
    alignSelf: 'flex-start',
    paddingVertical: S.xs + 2,
    paddingHorizontal: S.md,
    borderRadius: R.full,
    backgroundColor: C.onNavyTagBg,
  },
  dispensersTagText: { ...T.secondary, fontFamily: T.label.fontFamily, fontSize: 12, lineHeight: 16, letterSpacing: 0.96, color: C.onNavyTag },
  dispensersFoot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: S.md },
  dispensersText: { flex: 1, gap: 2 },
  dispensersTitle: { ...T.blockTitle, fontSize: 28, lineHeight: 34, color: C.white },
  dispensersHint: { ...T.label, fontFamily: T.body.fontFamily, color: C.onNavyMuted },
  dispensersArrow: {
    width: TILE_ICON,
    height: TILE_ICON,
    borderRadius: TILE_ICON / 2,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
