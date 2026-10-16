import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import {
  fleetErrorMessage,
  formatSignal,
  isLocationStale,
  relativeShort,
  truckMapUrls,
  vehicleStatus,
} from '@/features/fleet/lib/fleetStatus';
import { ApiError } from '@/lib/api';
import { C, H, R, S, T, FIT_ONE_LINE } from '@/lib/theme';

const REFRESH_MS = 20000; // refresco "en vivo" (>10s para no saturar Powerfleet)

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
        const status = e instanceof ApiError ? e.status : undefined;
        setError(fleetErrorMessage(status, e instanceof Error ? e.message : undefined));
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

  async function openInMaps() {
    if (!data) return;
    const urls = truckMapUrls(data.lat, data.lng, Platform.OS, data.licensePlate);
    for (const url of urls) {
      try {
        await Linking.openURL(url);
        return;
      } catch (e) {
        console.warn(`Could not open map link ${url}`, e);
      }
    }
    setError('No se pudo abrir la app de mapas.');
  }

  const now = new Date();
  const status = data ? vehicleStatus(data) : null;
  const stale = data ? isLocationStale(data.gpsDateTime, now) : false;

  const headerSub = !plate
    ? 'Ubicación en tiempo real'
    : refreshing
      ? 'Actualizando ubicación...'
      : `Actualizado ${relativeShort(updatedAt, now)}`;
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
                  <Text style={styles.plateText} {...FIT_ONE_LINE}>{data.licensePlate}</Text>
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
                Último reporte del GPS: {formatSignal(data.gpsDateTime, now)}
              </Text>
            </ColorBlock>

            <View style={styles.card}>
              {/* Drawn map: tapping it opens Google Maps on the truck's coordinates. */}
              <Pressable style={styles.map} onPress={openInMaps} accessibilityRole="button" accessibilityLabel="Abrir la ubicación del camión en el mapa">
                <View style={[styles.street, { top: '35%' }]} />
                <View style={[styles.street, { top: '80%' }]} />
                <View style={[styles.streetV, { left: '20%' }]} />
                <View style={[styles.streetV, { left: '70%' }]} />
                <View style={styles.pin}>
                  <MaterialCommunityIcons name="truck" size={20} color={C.white} />
                </View>
                <View style={styles.mapExpand}>
                  <Ionicons name="expand-outline" size={20} color={C.navy} />
                </View>
              </Pressable>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  body: { paddingHorizontal: S.gutter, paddingBottom: S.lg, gap: S.md, flexGrow: 1 },
  loading: { alignItems: 'center', paddingVertical: S.xxxl, gap: S.md },
  loadingText: { ...T.body, color: C.ink2 },
  retryWrap: { alignSelf: 'center' },

  block: { gap: S.sm, padding: S.xl },
  blockTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md, marginBottom: S.sm },
  plate: {
    flexShrink: 1,
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
  map: { height: 150, backgroundColor: C.blueLight, alignItems: 'center', justifyContent: 'center' },
  street: { position: 'absolute', left: 0, right: 0, height: 16, backgroundColor: C.white },
  streetV: { position: 'absolute', top: 0, bottom: 0, width: 16, backgroundColor: C.white },
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
