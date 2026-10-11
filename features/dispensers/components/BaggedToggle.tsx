import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, F, W } from '@/lib/theme';

type Props = {
  code: string;
  bagged: boolean;
  /** Sin `onPress` se muestra solo como etiqueta (lectura). */
  onPress?: () => void;
};

/** Marca "Embolsado" de una serie en una descarga. Cian para no confundirse con los estados de validación. */
export function BaggedToggle({ code, bagged, onPress }: Props) {
  const content = (
    <>
      <Ionicons name={bagged ? 'bag-check' : 'bag-outline'} size={13} color={bagged ? C.surface : C.textMuted} />
      {/* Sin marcar va solo el ícono, para no apretar la fila en pantallas angostas. */}
      {bagged && <Text style={[styles.text, styles.textOn]}>Embolsado</Text>}
    </>
  );

  if (!onPress) {
    return bagged ? <View style={[styles.pill, styles.pillOn]}>{content}</View> : null;
  }

  return (
    <TouchableOpacity
      style={[styles.pill, bagged && styles.pillOn]}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: bagged }}
      accessibilityLabel={`Embolsado ${code}`}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: C.surface,
  },
  pillOn: { backgroundColor: C.accent, borderColor: C.accent },
  text: { fontSize: F.xs, fontWeight: W.bold, color: C.textMuted },
  textOn: { color: C.surface },
});
