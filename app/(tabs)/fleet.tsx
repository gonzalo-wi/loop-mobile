import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
  LayoutAnimation,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { HeroHeader } from '@/components/HeroHeader';
import { useRouteStore } from '@/store/routeStore';
import { getFleetLocation } from '@/features/fleet/services/fleetApi';
import type { FleetLocation } from '@/features/fleet/types';
import { ApiError } from '@/lib/api';
import { C, R, F, W, Shdw } from '@/lib/theme';

const REFRESH_MS = 20000; // refresco "en vivo" (>10s para no saturar Powerfleet)
const STALE_MIN = 15; // a partir de acá la ubicación se considera desactualizada

function errorMessage(e: unknown): string {
  const status = e instanceof ApiError ? e.status : undefined;
  if (status === 404) {
    return 'No se encontró el camión en el sistema de flota. La patente puede estar mal cargada o el GPS del vehículo está inactivo.';
  }
  if (status === 502) {
    return 'No se pudo conectar con el sistema de flota. Probá de nuevo en unos segundos.';
  }
  return e instanceof Error ? e.message : 'No se pudo obtener la ubicación.';
}

function minutesSince(iso: string): number {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return Infinity;
  return Math.floor((Date.now() - d) / 60000);
}

/** "Hoy, 07:37" si es del día; si no "20/07, 07:37". */
function formatSignal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const today = new Date();
  const sameDay =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (sameDay) return `Hoy, ${hh}:${mi}`;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}, ${hh}:${mi}`;
}

function relativeShort(date: Date | null): string {
  if (!date) return '';
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 45) return 'hace unos segundos';
  if (s < 90) return 'hace 1 min';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  return `hace ${Math.floor(s / 3600)} h`;
}

type StatusTone = 'neutral' | 'ok' | 'warn';
function vehicleStatus(loc: FleetLocation): { text: string; tone: StatusTone } {
  if (!loc.engineOn) return { text: 'Motor apagado', tone: 'neutral' };
  if (loc.speed > 0) return { text: `En movimiento · ${loc.speed} km/h`, tone: 'ok' };
  return { text: 'Detenido · motor encendido', tone: 'warn' };
}

export default function FleetScreen() {
  const { route } = useRouteStore();
  const plate = route?.truckPlate ?? null;
  const repartoLabel = route?.routeCode ? `Reparto ${route.routeCode}` : 'Sin reparto';

  const [data, setData] = useState<FleetLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!plate) {
        setLoading(false);
        return;
      }
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const loc = await getFleetLocation(plate);
        setData(loc);
        setUpdatedAt(new Date());
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [plate],
  );

  useFocusEffect(
    useCallback(() => {
      if (!plate) {
        setLoading(false);
        return;
      }
      load();
      const id = setInterval(() => load(true), REFRESH_MS);
      return () => clearInterval(id);
    }, [plate, load]),
  );

  function openInMaps() {
    if (!data) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lng}`;
    Linking.openURL(url).catch(() => setError('No se pudo abrir la app de mapas.'));
  }

  function toggleDetails() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }

  const status = data ? vehicleStatus(data) : null;
  const stale = data ? minutesSince(data.gpsDateTime) >= STALE_MIN : false;

  const headerSub = !plate
    ? 'Ubicación en tiempo real'
    : refreshing
      ? 'Actualizando ubicación...'
      : `${plate} · Actualizado ${relativeShort(updatedAt)}`;

  return (
    <View style={styles.screen}>
      <HeroHeader
        title="Mi camión"
        subtitle={headerSub}
        rightAction={plate ? { icon: 'refresh', onPress: () => load(true) } : undefined}
      />

      <ScrollView contentContainerStyle={styles.body}>
        {/* Sin patente */}
        {!plate && (
          <View style={styles.stateBox}>
            <View style={[styles.stateIcon, { backgroundColor: C.warningLight }]}>
              <Ionicons name="alert-circle-outline" size={38} color={C.warning} />
            </View>
            <Text style={styles.stateTitle}>Sin patente cargada</Text>
            <Text style={styles.stateSub}>
              Tu reparto no tiene una patente asignada. Contactá al administrador para poder ubicar el camión.
            </Text>
          </View>
        )}

        {/* Cargando */}
        {plate && loading && (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.loadingText}>Ubicando tu camión...</Text>
          </View>
        )}

        {/* Error */}
        {plate && !loading && error && !data && (
          <View style={styles.stateBox}>
            <View style={[styles.stateIcon, { backgroundColor: C.dangerLight }]}>
              <Ionicons name="cloud-offline-outline" size={38} color={C.danger} />
            </View>
            <Text style={styles.stateTitle}>No se pudo ubicar</Text>
            <Text style={styles.stateSub}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => load()} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Resultado */}
        {plate && data && status && (
          <>
            <View style={styles.card}>
              {/* Patente + GPS */}
              <View style={styles.vehTop}>
                <View>
                  <Text style={styles.plateLabel}>Patente</Text>
                  <Text style={styles.plate}>{data.licensePlate}</Text>
                </View>
                <View style={styles.gpsRow}>
                  <View style={[styles.dot, { backgroundColor: stale ? C.warning : C.success }]} />
                  <Text style={[styles.gpsText, stale && { color: C.warning }]}>
                    {stale ? 'Desactualizado' : 'GPS activo'}
                  </Text>
                </View>
              </View>

              {/* Estado (neutral por defecto) */}
              <View style={styles.badgeRow}>
                <StatusBadge tone={status.tone} text={status.text} />
              </View>

              {/* Mapa */}
              <TouchableOpacity style={styles.map} activeOpacity={0.9} onPress={openInMaps}>
                <View style={styles.mapBg} />
                <View style={[styles.street, { top: '30%' }]} />
                <View style={[styles.street, { top: '62%' }]} />
                <View style={[styles.streetV, { left: '26%' }]} />
                <View style={[styles.streetV, { left: '64%' }]} />
                <View style={styles.pinWrap}>
                  <View style={styles.pin}>
                    <MaterialCommunityIcons name="truck" size={17} color="#fff" />
                  </View>
                  <View style={styles.pinStem} />
                </View>
                <View style={styles.mapExpand}>
                  <Ionicons name="expand-outline" size={16} color={C.textSub} />
                </View>
                <View style={styles.mapAddr}>
                  <Ionicons name="location" size={15} color={C.primary} />
                  <Text style={styles.mapAddrText} numberOfLines={1}>{data.address || 'Ubicación del camión'}</Text>
                </View>
              </TouchableOpacity>

              {/* Meta */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={15} color={C.textMuted} />
                  <Text style={styles.metaText}>Última señal <Text style={styles.metaStrong}>{formatSignal(data.gpsDateTime)}</Text></Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="truck-outline" size={15} color={C.textMuted} />
                  <Text style={styles.metaStrong}>{repartoLabel}</Text>
                </View>
              </View>

              {stale && (
                <View style={styles.staleBanner}>
                  <Ionicons name="alert-circle-outline" size={16} color={C.warning} />
                  <Text style={styles.staleText}>Ubicación desactualizada · último reporte {formatSignal(data.gpsDateTime)}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.mapBtn} onPress={openInMaps} activeOpacity={0.9}>
                <Ionicons name="navigate" size={19} color="#fff" />
                <Text style={styles.mapBtnText}>Abrir mapa</Text>
              </TouchableOpacity>
            </View>

            {/* Detalles del vehículo (plegable) */}
            <View style={styles.card}>
              <TouchableOpacity style={styles.expHead} onPress={toggleDetails} activeOpacity={0.7}>
                <View style={styles.expLeadIc}>
                  <Ionicons name="clipboard-outline" size={18} color={C.textSub} />
                </View>
                <Text style={styles.expTitle}>Detalles del vehículo</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={C.textMuted} />
              </TouchableOpacity>

              {expanded && (
                <View style={styles.expList}>
                  <DetailRow icon="truck-outline" label="Conductor" value={repartoLabel} />
                  <DetailRow icon="time-outline" label="Último reporte GPS" value={formatSignal(data.gpsDateTime)} />
                  <DetailRow icon="power" label="Estado del motor" value={data.engineOn ? 'Encendido' : 'Apagado'} />
                  <DetailRow
                    icon="location-outline"
                    label="Coordenadas"
                    value={`${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`}
                    coords
                    last
                  />
                </View>
              )}
            </View>

            <View style={styles.autoLine}>
              <Ionicons name="sync-outline" size={14} color={C.textMuted} />
              <Text style={styles.autoText}>
                Actualización automática · {refreshing ? 'actualizando...' : relativeShort(updatedAt)}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatusBadge({ tone, text }: { tone: StatusTone; text: string }) {
  const map = {
    neutral: { bg: C.surfaceSunken, fg: C.textSub, dot: C.textMuted },
    ok: { bg: C.successLight, fg: C.success, dot: C.success },
    warn: { bg: C.warningLight, fg: C.warning, dot: C.warning },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <View style={[styles.dot, { backgroundColor: map.dot }]} />
      <Text style={[styles.badgeText, { color: map.fg }]}>{text}</Text>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  coords,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap | 'truck-outline';
  label: string;
  value: string;
  coords?: boolean;
  last?: boolean;
}) {
  const Icon = icon === 'truck-outline' ? MaterialCommunityIcons : Ionicons;
  return (
    <View style={[styles.drow, last && styles.drowLast]}>
      <View style={styles.drowK}>
        <Icon name={icon as never} size={16} color={C.textMuted} />
        <Text style={styles.drowKText}>{label}</Text>
      </View>
      <Text style={[styles.drowV, coords && styles.drowCoords]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: { padding: 16, gap: 12 },

  stateBox: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 24, gap: 10 },
  stateIcon: {
    width: 78, height: 78, borderRadius: R.full,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  stateTitle: { fontSize: F.lg, fontWeight: W.extra, color: C.text },
  stateSub: { fontSize: F.base, color: C.textMuted, textAlign: 'center', lineHeight: 21 },
  loadingText: { marginTop: 12, color: C.textMuted, fontSize: F.base },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: C.primary, borderRadius: R.md, paddingHorizontal: 22, paddingVertical: 12,
  },
  retryText: { color: '#fff', fontSize: F.md, fontWeight: W.bold },

  card: {
    backgroundColor: C.surface, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: C.border, ...Shdw.card,
  },

  vehTop: { flexDirection: 'row', alignItems: 'flex-start' },
  plateLabel: {
    fontSize: 11, fontWeight: W.extra, letterSpacing: 0.8,
    textTransform: 'uppercase', color: C.textMuted, marginBottom: 4,
  },
  plate: { fontSize: 22, fontWeight: W.extra, color: C.text, letterSpacing: 1 },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto', marginTop: 4 },
  gpsText: { fontSize: 12, fontWeight: W.bold, color: C.textSub },
  dot: { width: 7, height: 7, borderRadius: 999 },

  badgeRow: { flexDirection: 'row', marginTop: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6,
  },
  badgeText: { fontSize: 12.5, fontWeight: W.extra },

  // Mapa
  map: {
    height: 158, borderRadius: 15, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border, marginTop: 14, backgroundColor: '#E9EFF4',
  },
  mapBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#EAF0F5' },
  street: { position: 'absolute', left: 0, right: 0, height: 9, backgroundColor: '#FFFFFF', opacity: 0.9 },
  streetV: { position: 'absolute', top: 0, bottom: 0, width: 9, backgroundColor: '#FFFFFF', opacity: 0.9 },
  pinWrap: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  pin: {
    width: 34, height: 34, borderRadius: 999, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff',
    ...Shdw.float,
  },
  pinStem: { width: 2, height: 8, backgroundColor: '#fff', marginTop: -1, borderRadius: 2 },
  mapExpand: {
    position: 'absolute', right: 10, top: 10, width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', ...Shdw.xs,
  },
  mapAddr: {
    position: 'absolute', left: 10, right: 10, bottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 11, paddingHorizontal: 11, paddingVertical: 8, ...Shdw.xs,
  },
  mapAddrText: { flex: 1, fontSize: 13, fontWeight: W.bold, color: C.text },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12.5, color: C.textSub, fontWeight: W.semibold },
  metaStrong: { fontSize: 12.5, color: C.text, fontWeight: W.bold },

  staleBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: C.warningLight, borderRadius: R.md, padding: 11,
  },
  staleText: { flex: 1, fontSize: 12.5, color: C.warning, fontWeight: W.semibold },

  mapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    backgroundColor: C.primary, borderRadius: R.lg, height: 50, marginTop: 14,
  },
  mapBtnText: { color: '#fff', fontSize: F.md, fontWeight: W.extra },

  // Detalles plegables
  expHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  expLeadIc: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: C.surfaceSunken,
    alignItems: 'center', justifyContent: 'center',
  },
  expTitle: { flex: 1, fontSize: 14.5, fontWeight: W.bold, color: C.text },
  expList: { marginTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  drow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  drowLast: { borderBottomWidth: 0 },
  drowK: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  drowKText: { fontSize: 13, color: C.textMuted, fontWeight: W.semibold },
  drowV: { fontSize: 13.5, color: C.text, fontWeight: W.bold, textAlign: 'right' },
  drowCoords: { fontSize: 12, color: C.textSub, fontWeight: W.semibold },

  autoLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 2 },
  autoText: { fontSize: 12, color: C.textMuted, fontWeight: W.medium },
});
