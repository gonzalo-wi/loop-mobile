import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDispenserMovements } from '@/features/dispensers/services/dispenserApi';
import { HeroHeader } from '@/components/HeroHeader';
import type {
  DispenserMovement,
  DispenserMovementType,
  DispenserMovementStatus,
} from '@/features/dispensers/types';
import { C, R, S, F, W, Shdw } from '@/lib/theme';

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const STATUS_INFO: Record<
  DispenserMovementStatus,
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  REGISTERED: { label: 'Enviando…', color: C.warning, bg: C.warningLight, icon: 'sync-outline' },
  SENT_TO_AGUAS: { label: 'Enviado', color: C.entry, bg: C.entryLight, icon: 'checkmark-circle' },
  AGUAS_ERROR: { label: 'Error', color: C.danger, bg: C.dangerLight, icon: 'alert-circle' },
  CANCELLED: { label: 'Cancelado', color: C.textMuted, bg: C.inputBg, icon: 'close-circle' },
};

function MovementCard({ mov, onPress }: { mov: DispenserMovement; onPress: () => void }) {
  const status = STATUS_INFO[mov.status] ?? STATUS_INFO.REGISTERED;
  const isCancelled = mov.status === 'CANCELLED';

  return (
    <TouchableOpacity
      style={[styles.card, isCancelled && styles.cardCancelled]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.routeBadge}>
          <Text style={styles.routeBadgeText}>R{mov.routeCode}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardCount}>
            {mov.serials.length} dispenser{mov.serials.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {mov.technician} · {formatTime(mov.createdAt)}
          </Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon} size={13} color={status.color} />
          <Text style={[styles.statusChipText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function DispenserMovementsScreen() {
  const router = useRouter();
  const [movements, setMovements] = useState<DispenserMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DispenserMovementType>('LOAD');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const today = getTodayDate();
      const { movements: data } = await getDispenserMovements({ from: today, to: today, size: 100 });
      setMovements(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar movimientos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Carga al entrar/volver (ej: tras corregir) + polling para el estado de Aguas.
  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(() => load(true), 15_000);
      return () => clearInterval(interval);
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const loadMovements = movements.filter((m) => m.type === 'LOAD');
  const unloadMovements = movements.filter((m) => m.type === 'UNLOAD');
  const visible = filter === 'LOAD' ? loadMovements : unloadMovements;

  const today = getTodayDate().split('-').reverse().join('/');

  return (
    <View style={styles.screen}>
      <HeroHeader
        title="Movimientos"
        subtitle={`Hoy · ${today}`}
        onBack={() => router.back()}
      />

      {/* Filtro Cargas / Descargas */}
      <View style={styles.segment}>
        {([
          { key: 'LOAD' as const, label: 'Cargas', icon: 'arrow-up' as const, count: loadMovements.length, color: C.exit },
          { key: 'UNLOAD' as const, label: 'Descargas', icon: 'arrow-down' as const, count: unloadMovements.length, color: C.entry },
        ]).map((opt) => {
          const active = filter === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.segmentPill, active && { backgroundColor: opt.color }]}
              onPress={() => setFilter(opt.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={opt.icon} size={15} color={active ? '#fff' : C.textSub} />
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
              <View style={[styles.segmentBadge, active && styles.segmentBadgeActive]}>
                <Text style={[styles.segmentBadgeText, active && styles.segmentBadgeTextActive]}>
                  {opt.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

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
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MovementCard
              mov={item}
              onPress={() => router.push(`/dispenser-movement-detail?id=${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name={filter === 'LOAD' ? 'arrow-up' : 'arrow-down'}
                  size={34}
                  color={C.textMuted}
                />
              </View>
              <Text style={styles.emptyTitle}>
                Sin {filter === 'LOAD' ? 'cargas' : 'descargas'} hoy
              </Text>
              <Text style={styles.emptySub}>Los movimientos que registres aparecerán acá</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: C.danger, fontSize: F.base, textAlign: 'center', marginBottom: 14 },
  retryBtn: { paddingHorizontal: 22, paddingVertical: 10, backgroundColor: C.primary, borderRadius: R.md },
  retryText: { color: '#fff', fontSize: F.base, fontWeight: W.bold },

  segment: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    backgroundColor: C.inputBg,
    borderRadius: R.lg,
    padding: 4,
    gap: 4,
  },
  segmentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: R.md,
  },
  segmentText: { fontSize: F.base, fontWeight: W.semibold, color: C.textSub },
  segmentTextActive: { color: '#fff', fontWeight: W.extra },
  segmentBadge: {
    backgroundColor: C.border,
    borderRadius: R.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: 'center',
  },
  segmentBadgeActive: { backgroundColor: 'rgba(255,255,255,0.28)' },
  segmentBadgeText: { fontSize: F.xs, fontWeight: W.extra, color: C.textSub },
  segmentBadgeTextActive: { color: '#fff' },

  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 14,
    ...Shdw.card,
  },
  cardCancelled: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeBadge: {
    backgroundColor: C.primaryLight,
    borderRadius: R.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 46,
    alignItems: 'center',
  },
  routeBadgeText: { fontSize: F.md, fontWeight: W.extra, color: C.primary },
  cardInfo: { flex: 1 },
  cardCount: { fontSize: F.md, fontWeight: W.extra, color: C.text },
  cardMeta: { fontSize: F.sm, color: C.textMuted, fontWeight: W.medium, marginTop: 2 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: R.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusChipText: { fontSize: F.xs + 1, fontWeight: W.bold },

  emptyState: { alignItems: 'center', paddingTop: 56 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: R.full,
    backgroundColor: C.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: W.extra, color: C.textSub },
  emptySub: { fontSize: F.sm, color: C.textMuted, marginTop: 6, textAlign: 'center' },
});
