import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeroHeader } from '@/components/HeroHeader';
import { useRouteStore } from '@/store/routeStore';
import { getFleetLocation } from '@/features/fleet/services/fleetApi';
import type { FleetLocation } from '@/features/fleet/types';
import { ApiError } from '@/lib/api';
import { C, R, F, W, Shdw } from '@/lib/theme';

const REFRESH_MS = 20000; // refresco "en vivo" (>10s para no saturar Powerfleet)

/** Mensaje de error amigable según el status del backend. */
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

/** "2026-07-16T18:20:00" → "16/07 18:20". */
function formatGps(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

function movementLabel(loc: FleetLocation): { text: string; icon: keyof typeof Ionicons.glyphMap; color: string } {
  if (!loc.engineOn) return { text: 'Motor apagado', icon: 'power', color: C.textMuted };
  if (loc.speed > 0) return { text: `En movimiento · ${loc.speed} km/h`, icon: 'navigate', color: C.entry };
  return { text: 'Detenido · motor encendido', icon: 'pause-circle', color: C.warning };
}

export default function FleetScreen() {
  const { route } = useRouteStore();
  const plate = route?.truckPlate ?? null;

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

  // Carga + refresco automático solo mientras el tab está enfocado.
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

  const move = data ? movementLabel(data) : null;

  return (
    <View style={styles.screen}>
      <HeroHeader
        title="Buscar mi camión"
        subtitle={plate ? `Patente ${plate}` : 'Ubicación en tiempo real'}
        rightAction={plate ? { icon: 'refresh', onPress: () => load(true) } : undefined}
      />

      <ScrollView contentContainerStyle={styles.body}>
        {/* Sin patente cargada */}
        {!plate && (
          <View style={styles.stateBox}>
            <View style={[styles.stateIcon, { backgroundColor: C.warningLight }]}>
              <Ionicons name="alert-circle-outline" size={40} color={C.warning} />
            </View>
            <Text style={styles.stateTitle}>Sin patente cargada</Text>
            <Text style={styles.stateSub}>
              Tu reparto no tiene una patente asignada. Contactá al administrador para poder ubicar el camión.
            </Text>
          </View>
        )}

        {/* Cargando (primera vez) */}
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
              <Ionicons name="cloud-offline-outline" size={40} color={C.danger} />
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
        {plate && data && move && (
          <>
            {/* Estado del camión */}
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <View style={[styles.statusIcon, { backgroundColor: move.color }]}>
                  <Ionicons name={move.icon} size={26} color="#fff" />
                </View>
                <View style={styles.statusText}>
                  <Text style={[styles.statusLabel, { color: move.color }]}>{move.text}</Text>
                  <Text style={styles.plate}>{data.licensePlate}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <InfoRow icon="location-outline" label="Dirección" value={data.address || '—'} />
              <InfoRow icon="person-outline" label="Conductor" value={data.driver || '—'} />
              <InfoRow
                icon="time-outline"
                label="Último reporte GPS"
                value={formatGps(data.gpsDateTime)}
              />
              <InfoRow
                icon="pin-outline"
                label="Coordenadas"
                value={`${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`}
                last
              />
            </View>

            {/* Ver en el mapa */}
            <TouchableOpacity style={styles.mapBtn} onPress={openInMaps} activeOpacity={0.9}>
              <Ionicons name="map" size={20} color="#fff" />
              <Text style={styles.mapBtnText}>Ver en el mapa</Text>
            </TouchableOpacity>

            {/* Estado del refresco */}
            <View style={styles.refreshInfo}>
              {refreshing ? (
                <>
                  <ActivityIndicator size="small" color={C.textMuted} />
                  <Text style={styles.refreshText}>Actualizando...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sync-outline" size={14} color={C.textMuted} />
                  <Text style={styles.refreshText}>
                    Se actualiza solo
                    {updatedAt ? ` · última ${String(updatedAt.getHours()).padStart(2, '0')}:${String(updatedAt.getMinutes()).padStart(2, '0')}:${String(updatedAt.getSeconds()).padStart(2, '0')}` : ''}
                  </Text>
                </>
              )}
            </View>

            {/* Error de un refresco silencioso (ya hay datos previos en pantalla) */}
            {error && (
              <View style={styles.softError}>
                <Ionicons name="warning-outline" size={16} color={C.warning} />
                <Text style={styles.softErrorText}>{error}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Ionicons name={icon} size={18} color={C.textMuted} style={styles.infoIcon} />
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: { padding: 16, gap: 12 },

  // Estados (sin patente / cargando / error)
  stateBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 },
  stateIcon: {
    width: 80,
    height: 80,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stateTitle: { fontSize: F.lg, fontWeight: W.extra, color: C.text },
  stateSub: { fontSize: F.base, color: C.textMuted, textAlign: 'center', lineHeight: 21 },
  loadingText: { marginTop: 12, color: C.textMuted, fontSize: F.base },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: C.primary,
    borderRadius: R.md,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  retryText: { color: '#fff', fontSize: F.md, fontWeight: W.bold },

  // Card resultado
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 16,
    ...Shdw.card,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: { flex: 1 },
  statusLabel: { fontSize: F.md, fontWeight: W.extra },
  plate: { fontSize: F.xl, fontWeight: W.extra, color: C.text, letterSpacing: 1, marginTop: 2 },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoRowLast: { paddingBottom: 0, marginBottom: 0, borderBottomWidth: 0 },
  infoIcon: { marginTop: 2 },
  infoBody: { flex: 1 },
  infoLabel: {
    fontSize: F.xs,
    color: C.textMuted,
    fontWeight: W.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  infoValue: { fontSize: F.base, color: C.text, fontWeight: W.semibold, lineHeight: 20 },

  // Ver en el mapa
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.primary,
    borderRadius: R.lg,
    paddingVertical: 16,
    ...Shdw.card,
  },
  mapBtnText: { color: '#fff', fontSize: F.md, fontWeight: W.extra },

  refreshInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  refreshText: { fontSize: F.sm, color: C.textMuted, fontWeight: W.medium },

  softError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.warningLight,
    borderRadius: R.md,
    padding: 12,
  },
  softErrorText: { flex: 1, fontSize: F.sm, color: C.warning, fontWeight: W.semibold },
});
