import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import { TRUCK_MAP_ENABLED } from '@/features/driver/lib/mapEnvironment';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  BLOCK_TONE,
  CircleButton,
  ColorBlock,
  EmptyState,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
} from '@/components/ui';
import { useRouteStore } from '@/store/routeStore';
import { getFleetLocation } from '@/features/fleet/services/fleetApi';
import type { FleetLocation } from '@/features/fleet/types';
import { ApiError } from '@/lib/api';
import { C, H, R, S, T } from '@/lib/theme';

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
  const insets = useSafeAreaInsets();
  const { route } = useRouteStore();
  const plate = route?.truckPlate ?? null;
  const repartoLabel = route?.routeCode ? `Reparto ${route.routeCode}` : 'Sin reparto';

  const [data, setData] = useState<FleetLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

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

  const status = data ? vehicleStatus(data) : null;
  const stale = data ? minutesSince(data.gpsDateTime) >= STALE_MIN : false;

  const headerSub = !plate
    ? 'Ubicación en tiempo real'
    : refreshing
      ? 'Actualizando ubicación...'
      : `Actualizado ${relativeShort(updatedAt)}`;
  const blockTone = stale ? 'orange' : 'green';
  const blockColors = BLOCK_TONE[blockTone];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Mi camión"
        subtitle={headerSub}
        right={plate ? <CircleButton icon="refresh" onPress={() => load(true)} accessibilityLabel="Actualizar ubicación" /> : undefined}
      />

      <ScrollView contentContainerStyle={styles.body}>
        {!plate && (
          <EmptyState
            icon="alert-circle-outline"
            title="Sin patente cargada"
            hint="Tu reparto no tiene una patente asignada. Contactá al administrador para poder ubicar el camión."
          />
        )}

        {plate && loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={C.navy} />
            <Text style={styles.loadingText}>Ubicando tu camión...</Text>
          </View>
        )}

        {plate && !loading && error && !data && (
          <>
            <EmptyState icon="cloud-offline-outline" title="No se pudo ubicar" hint={error} />
            <View style={styles.retryWrap}>
              <SecondaryButton title="Reintentar" icon="refresh" onPress={() => load()} />
            </View>
          </>
        )}

        {plate && data && status && (
          <>
            <ColorBlock tone={blockTone} style={styles.block}>
              <View style={styles.blockTop}>
                <View style={styles.plate} accessibilityLabel={`Patente ${data.licensePlate}`}>
                  <Text style={styles.plateLabel}>PATENTE</Text>
                  <Text style={styles.plateText}>{data.licensePlate}</Text>
                </View>
                <View style={styles.engine}>
                  <Ionicons name="power" size={18} color={C.navy} />
                  <Text style={styles.engineText}>{status.text}</Text>
                </View>
              </View>
              <Text style={[styles.blockTitle, { color: blockColors.fg }]} accessibilityRole="header">
                {stale ? 'Ubicación desactualizada' : 'GPS activo'}
              </Text>
              <Text style={[styles.blockSub, { color: blockColors.fgSub }]}>
                Último reporte del GPS: {formatSignal(data.gpsDateTime)}
              </Text>
            </ColorBlock>

            <View style={styles.card}>
              {/* Static preview: the map is centered on the truck, so the pin is drawn over its center
                  instead of as a marker (lite mode can't render custom marker views). */}
              {TRUCK_MAP_ENABLED && (
                <Pressable style={styles.map} onPress={openInMaps} accessibilityRole="button" accessibilityLabel="Abrir la ubicación del camión en el mapa">
                  <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <MapView
                      style={StyleSheet.absoluteFill}
                      liteMode
                      toolbarEnabled={false}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      rotateEnabled={false}
                      pitchEnabled={false}
                      region={{ latitude: data.lat, longitude: data.lng, latitudeDelta: MAP_DELTA, longitudeDelta: MAP_DELTA }}
                    />
                  </View>
                  <View style={styles.pin} pointerEvents="none">
                    <MaterialCommunityIcons name="truck" size={20} color={C.white} />
                  </View>
                  <View style={styles.mapExpand} pointerEvents="none">
                    <Ionicons name="expand-outline" size={20} color={C.navy} />
                  </View>
                </Pressable>
              )}
              <View style={styles.address}>
                <Ionicons name="location-outline" size={22} color={C.blue} />
                <Text style={styles.addressText}>{data.address || 'Ubicación del camión'}</Text>
              </View>
              <View style={styles.mapBtn}>
                <PrimaryButton title="Abrir en el mapa" icon="navigate-outline" onPress={openInMaps} />
              </View>
            </View>

            <View style={[styles.card, styles.details]}>
              <DetailRow label="Conductor" value={repartoLabel} />
              <DetailRow label="Coordenadas" value={`${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`} last />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.drow, !last && styles.drowDivider]}>
      <Text style={styles.drowK}>{label}</Text>
      <Text style={styles.drowV}>{value}</Text>
    </View>
  );
}

const PIN = 56;
const MAP_HEIGHT = 180;
/** About a dozen blocks around the truck: enough to recognise the area. */
const MAP_DELTA = 0.008;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  body: { paddingHorizontal: S.gutter, paddingBottom: S.lg, gap: S.md, flexGrow: 1 },
  loading: { alignItems: 'center', paddingVertical: S.xxxl, gap: S.md },
  loadingText: { ...T.body, color: C.ink2 },
  retryWrap: { alignSelf: 'center' },

  block: { gap: S.sm, padding: S.xl },
  blockTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md, marginBottom: S.sm },
  plate: {
    alignItems: 'center',
    paddingVertical: S.xs,
    paddingHorizontal: S.lg,
    borderRadius: R.md,
    borderWidth: 3,
    borderColor: C.navy,
    backgroundColor: C.white,
  },
  plateLabel: { ...T.systemTag, color: C.ink2 },
  plateText: { ...T.screenTitle, fontSize: 26, letterSpacing: 2.5, color: C.navy },
  engine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    flexShrink: 1,
    minHeight: 36,
    paddingHorizontal: S.md + 2,
    borderRadius: R.full,
    backgroundColor: C.pillOnGreen,
  },
  engineText: { ...T.label, color: C.navy, flexShrink: 1 },
  blockTitle: { ...T.blockTitle, fontSize: 28, lineHeight: 34 },
  blockSub: { ...T.label },

  card: { borderRadius: R.card, backgroundColor: C.white, overflow: 'hidden' },
  map: { height: MAP_HEIGHT, backgroundColor: C.blueLight, alignItems: 'center', justifyContent: 'center' },
  pin: {
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    borderWidth: 4,
    borderColor: C.white,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapExpand: {
    position: 'absolute',
    top: S.md,
    right: S.md,
    width: H.touch,
    height: H.touch,
    borderRadius: H.touch / 2,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  address: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingTop: S.lg },
  addressText: { ...T.data, color: C.navy, flex: 1 },
  mapBtn: { padding: S.lg },

  details: { paddingHorizontal: S.xl },
  drow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md, minHeight: 56 },
  drowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  drowK: { ...T.body, color: C.ink2 },
  drowV: { ...T.data, color: C.navy, fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
});
