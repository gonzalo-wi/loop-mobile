import { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDispenserMovements } from '@/features/dispensers/services/dispenserApi';
import { EmptyState, ScreenHeader, SecondaryButton, SegmentedControl } from '@/components/ui';
import { MovementCard } from '@/features/dispensers/components/MovementCard';
import type { DispenserMovement, DispenserMovementType } from '@/features/dispensers/types';
import { C, S } from '@/lib/theme';
import { isoDateToDisplay } from '@/lib/dateFormat';

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function DispenserMovementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [movements, setMovements] = useState<DispenserMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DispenserMovementType>('LOAD');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      // Se filtra por fecha de registro (createdAt), no por la fecha del movimiento: una carga se
      // registra hoy pero se fecha para el próximo día de reparto, así que igual debe verse hoy.
      const today = getTodayDate();
      const { movements: data } = await getDispenserMovements({
        createdFrom: today,
        createdTo: today,
        size: 100,
      });
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

  const today = isoDateToDisplay(getTodayDate());

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Movimientos" subtitle={`Hoy · ${today}`} onBack={() => router.back()} />

      <View style={styles.segment}>
        <SegmentedControl
          tone="onCream"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'LOAD', label: 'Cargas', icon: 'arrow-up', activeColor: C.blue, badge: loadMovements.length },
            { value: 'UNLOAD', label: 'Descargas', icon: 'arrow-down', activeColor: C.greenDot, badge: unloadMovements.length },
          ]}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <EmptyState icon="cloud-offline-outline" title="No se pudieron cargar los movimientos" hint={error} />
          <View style={styles.retryWrap}>
            <SecondaryButton title="Reintentar" icon="refresh" onPress={() => load()} />
          </View>
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
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + S.xxl }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={filter === 'LOAD' ? 'arrow-up' : 'arrow-down'}
              title={`Sin ${filter === 'LOAD' ? 'cargas' : 'descargas'} hoy`}
              hint="Los movimientos que registres aparecerán acá"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  segment: { paddingHorizontal: S.gutter, paddingTop: S.xs, paddingBottom: S.md },
  list: { paddingHorizontal: S.gutter, gap: S.sm + 2, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', padding: S.gutter, gap: S.lg },
  retryWrap: { alignSelf: 'center' },
});
