import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
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
import { HeroHeader } from '@/components/HeroHeader';
import { AppLogoBadge, BLOCK_TONE, Pill } from '@/components/ui';
import type { StockControl } from '@/features/stock-controls/types';
import { C, R, S, T, Shdw } from '@/lib/theme';

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
}: { value: number; label: string; icon: keyof typeof Ionicons.glyphMap; tone: 'neutral' | 'warn' | 'ok' | 'blue' }) {
  const map = {
    neutral: { bg: C.surfaceSunken, fg: C.textSub },
    warn: { bg: C.warningLight, fg: C.warning },
    ok: { bg: C.successLight, fg: C.success },
    blue: { bg: C.primaryLight, fg: C.primary },
  }[tone];
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIc, { backgroundColor: map.bg }]}>
        <Ionicons name={icon} size={17} color={map.fg} />
      </View>
      <View>
        <Text style={styles.tileNum}>{value}</Text>
        <Text style={styles.tileLb}>{label}</Text>
      </View>
    </View>
  );
}

function PendingCard({ control, onPress }: { control: StockControl; onPress: () => void }) {
  const isExit = control.type === 'EXIT';
  const [y, m, d] = control.controlDate.split('-');
  return (
    <TouchableOpacity style={styles.pend} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.pendAccent, { backgroundColor: isExit ? C.exit : C.entry }]} />
      <View style={styles.pendBody}>
        <View style={styles.pendTop}>
          <View style={[styles.miniBadge, { backgroundColor: isExit ? C.exitLight : C.entryLight }]}>
            <Ionicons name={isExit ? 'arrow-up' : 'arrow-down'} size={12} color={isExit ? C.exit : C.entry} />
            <Text style={[styles.miniBadgeText, { color: isExit ? C.exit : C.entry }]}>{isExit ? 'Salida' : 'Entrada'}</Text>
          </View>
          <Text style={styles.pendDate}>{`${d}/${m}/${y}`}</Text>
        </View>
        <Text style={styles.pendBranch}>{control.branchName}</Text>
        <Text style={styles.pendRoute}>Reparto {control.routeCode}</Text>
        <View style={styles.pendFoot}>
          <Text style={styles.pendItems}>{control.items.length} productos</Text>
          <View style={styles.pendCta}>
            <Text style={styles.pendCtaText}>Revisar</Text>
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Driver home ───────────────────────────────────────────────────────────────

function DriverHome() {
  const router = useRouter();
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

  return (
    <View style={styles.screen}>
      <HeroHeader
        title={`Hola, ${firstName(user?.name)}`}
        subtitle={route ? `Reparto ${route.routeCode} · ${route.branchName}` : 'REPARTIDOR'}
        rightAction={{ label: 'Salir', icon: 'log-out-outline', onPress: logout }}
      />

      <ScrollView
        contentContainerStyle={styles.driverBody}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {!route && (
          <View style={styles.noRouteBanner}>
            <Ionicons name="warning-outline" size={20} color={C.warning} />
            <Text style={styles.noRouteText}>Sin reparto asignado. Contactá al administrador.</Text>
          </View>
        )}

        {loading && (
          <View style={styles.centered}><ActivityIndicator size="large" color={C.primary} /></View>
        )}

        {error && !loading && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => load()} style={styles.retryBtn}><Text style={styles.retryText}>Reintentar</Text></TouchableOpacity>
          </View>
        )}

        {route && !loading && !error && (
          <>
            {/* Estado principal */}
            {hasPending ? (
              <View style={styles.highlight}>
                <View style={styles.highlightIc}>
                  <Ionicons name="clipboard-outline" size={22} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.highlightTt}>
                    {pending.length} control{pending.length !== 1 ? 'es' : ''} pendiente{pending.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.highlightDs}>Esperan tu revisión y aprobación</Text>
                </View>
              </View>
            ) : (
              <View style={styles.statusCard}>
                <View style={styles.statusIc}><Ionicons name="checkmark" size={24} color={C.success} /></View>
                <View>
                  <Text style={styles.statusTt}>Todo al día</Text>
                  <Text style={styles.statusDs}>No tenés controles pendientes</Text>
                </View>
              </View>
            )}

            {/* Pendientes de aprobación */}
            {hasPending && (
              <View style={styles.sec}>
                <Text style={styles.label}>Pendientes de aprobación</Text>
                {pending.map((c) => (
                  <PendingCard key={c.id} control={c} onPress={() => router.push(`/approval-detail?id=${c.id}`)} />
                ))}
              </View>
            )}

            {/* Resumen de hoy */}
            <View style={styles.sec}>
              <Text style={styles.label}>Resumen de hoy</Text>
              <View style={styles.stats}>
                <SummaryTile value={pending.length} label="Pendientes" icon="time-outline" tone={hasPending ? 'warn' : 'neutral'} />
                <SummaryTile value={completed} label="Completados" icon="checkmark" tone="ok" />
                <SummaryTile value={today.length} label="Controles hoy" icon="documents-outline" tone="blue" />
              </View>
            </View>

            {/* Última actividad */}
            {lastActivity && (
              <View style={styles.sec}>
                <Text style={styles.label}>Última actividad</Text>
                <TouchableOpacity
                  style={styles.act}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/edit-control?id=${lastActivity.id}`)}
                >
                  <View style={[styles.actIc, { backgroundColor: lastActivity.type === 'EXIT' ? C.exitLight : C.entryLight }]}>
                    <Ionicons name={lastActivity.type === 'EXIT' ? 'arrow-up' : 'arrow-down'} size={20} color={lastActivity.type === 'EXIT' ? C.exit : C.entry} />
                  </View>
                  <View style={styles.actMid}>
                    <Text style={styles.actTt}>Control de {lastActivity.type === 'EXIT' ? 'salida' : 'entrada'}</Text>
                    <Text style={styles.actMt}>
                      {route.truckPlate ? `${route.truckPlate} · ` : ''}Hoy {formatTime(lastActivity.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.actR}>
                    {DONE_STATUSES.has(lastActivity.status) && (
                      <View style={styles.okBadge}>
                        <Ionicons name="checkmark" size={12} color={C.success} />
                        <Text style={styles.okBadgeText}>Completado</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={20} color={C.textFaint} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Acciones secundarias (cuando no hay pendientes, para no dejar hueco) */}
            {!hasPending && (
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.85} onPress={() => router.push('/history')}>
                  <Ionicons name="time-outline" size={18} color={C.primary} />
                  <Text style={styles.ghostBtnText}>Ver historial</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.85} onPress={() => router.push('/orders')}>
                  <Ionicons name="cart-outline" size={18} color={C.primary} />
                  <Text style={styles.ghostBtnText}>Ver pedidos</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuthStore();
  return user?.role === 'REPARTIDOR' ? <DriverHome /> : <ControllerHome />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  driverBody: { padding: 16, gap: 16 },

  label: {
    fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.9, marginBottom: 2, marginLeft: 2,
  },
  sec: { gap: 9 },


  // Estado
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15,
    backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, ...Shdw.card,
  },
  statusIc: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.successLight, alignItems: 'center', justifyContent: 'center' },
  statusTt: { fontSize: 16, fontWeight: '800', color: C.text },
  statusDs: { fontSize: 13, color: C.textMuted, marginTop: 1 },

  highlight: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    borderRadius: 18, backgroundColor: C.primaryLight, borderWidth: 1, borderColor: '#DBE4FF',
  },
  highlightIc: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...Shdw.xs },
  highlightTt: { fontSize: 15, fontWeight: '800', color: C.text },
  highlightDs: { fontSize: 12.5, color: C.textSub, marginTop: 1 },

  // Tiles
  stats: { flexDirection: 'row', gap: 9 },
  tile: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    padding: 13, gap: 8, ...Shdw.card,
  },
  tileIc: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tileNum: { fontSize: 22, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'], lineHeight: 24 },
  tileLb: { fontSize: 11.5, color: C.textMuted, fontWeight: '600' },

  // Pending
  pend: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...Shdw.card },
  pendAccent: { width: 4 },
  pendBody: { flex: 1, padding: 13 },
  pendTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  miniBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  miniBadgeText: { fontSize: 12, fontWeight: '800' },
  pendDate: { marginLeft: 'auto', fontSize: 12, color: C.textMuted, fontWeight: '600', fontVariant: ['tabular-nums'] },
  pendBranch: { fontSize: 16, fontWeight: '800', color: C.text },
  pendRoute: { fontSize: 12.5, color: C.textSub, marginTop: 1 },
  pendFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 },
  pendItems: { fontSize: 12.5, color: C.textMuted, fontWeight: '600' },
  pendCta: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.primary, borderRadius: 999, paddingLeft: 13, paddingRight: 10, paddingVertical: 7 },
  pendCtaText: { fontSize: 12.5, color: '#fff', fontWeight: '800' },

  // Activity
  act: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, ...Shdw.card },
  actIc: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actMid: { flex: 1 },
  actTt: { fontSize: 14.5, fontWeight: '700', color: C.text },
  actMt: { fontSize: 12.5, color: C.textMuted, marginTop: 2, fontVariant: ['tabular-nums'] },
  actR: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  okBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.successLight, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  okBadgeText: { fontSize: 12, fontWeight: '800', color: C.success },

  // Secondary buttons
  btnRow: { flexDirection: 'row', gap: 9 },
  ghostBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 46, borderRadius: 13, backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderStrong,
  },
  ghostBtnText: { color: C.primary, fontSize: 13.5, fontWeight: '800' },

  // Banners / states
  noRouteBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.warningLight, borderRadius: R.md, padding: 14 },
  noRouteText: { flex: 1, fontSize: 14, color: C.warning, fontWeight: '600' },
  centered: { paddingVertical: 50, alignItems: 'center' },
  errorBox: { alignItems: 'center', paddingVertical: 28 },
  errorText: { color: C.danger, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  retryBtn: { paddingHorizontal: 22, paddingVertical: 10, backgroundColor: C.primary, borderRadius: R.md },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
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
