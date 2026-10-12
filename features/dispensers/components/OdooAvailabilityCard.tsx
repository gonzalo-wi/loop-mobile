import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SystemTag } from '@/components/ui';
import { C, H, S, T } from '@/lib/theme';
import type { OdooEquipment } from '../types';

const SAMPLE_SIZE = 6;

type OdooAvailabilityCardProps = {
  equipment: OdooEquipment[];
  loading: boolean;
  /** At least one answer arrived; later loads keep it on screen. */
  loaded: boolean;
  error: string | null;
  onRetry: () => void;
};

/** Informative card with the equipment Odoo has ready to load (LOAD only). Never blocks the work. */
export function OdooAvailabilityCard({ equipment, loading, loaded, error, onRetry }: OdooAvailabilityCardProps) {
  const firstLoad = loading && !loaded;
  const refreshing = loading && loaded;
  const count = equipment.length;

  let text: string;
  if (firstLoad) text = 'Consultando Odoo…';
  else if (error) text = 'No se pudo consultar Odoo (no bloquea la carga)';
  else if (count === 0) text = 'Sin equipos disponibles por ahora';
  else text = `${count} equipo${count !== 1 ? 's' : ''} listo${count !== 1 ? 's' : ''} para cargar`;

  const sample = !firstLoad && !error && count > 0
    ? `${equipment.slice(0, SAMPLE_SIZE).map((e) => e.serie).join(' · ')}${count > SAMPLE_SIZE ? ' …' : ''}`
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SystemTag system="odoo" />
        <Text style={[styles.text, (firstLoad || !!error || count === 0) && styles.textMuted]}>{text}</Text>
        {firstLoad || refreshing ? (
          <ActivityIndicator size="small" color={C.odoo} accessibilityLabel="Actualizando" />
        ) : error ? (
          <Pressable onPress={onRetry} accessibilityRole="button" style={styles.retry}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        ) : null}
      </View>
      {sample ? <Text style={styles.sample}>{sample}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 60,
    justifyContent: 'center',
    gap: S.xs,
    paddingVertical: S.sm + 2,
    paddingLeft: S.lg,
    paddingRight: S.md + 2,
    borderRadius: 24,
    backgroundColor: C.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
  },
  text: {
    ...T.label,
    color: C.navy,
    flex: 1,
  },
  textMuted: {
    color: C.ink2,
  },
  sample: {
    ...T.secondary,
    fontSize: 12,
    lineHeight: 16,
    color: C.ink2,
    fontVariant: ['tabular-nums'],
  },
  retry: {
    height: H.touch,
    paddingHorizontal: S.md,
    borderRadius: H.touch / 2,
    justifyContent: 'center',
    backgroundColor: C.cream,
  },
  retryText: {
    ...T.label,
    color: C.navy,
  },
});
