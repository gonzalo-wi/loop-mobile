import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, H, R, S, T } from '@/lib/theme';

type Props = {
  code: string;
  bagged: boolean;
  /** Sin `onPress` se muestra solo como etiqueta (lectura). */
  onPress?: () => void;
};

/** "Embolsado" mark of a serial in an unload. Blue so it doesn't read as a validation status. */
export function BaggedToggle({ code, bagged, onPress }: Props) {
  const content = (
    <>
      <Ionicons name={bagged ? 'bag-check' : 'bag-outline'} size={13} color={bagged ? C.white : C.ink2} />
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
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
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
    gap: S.xs,
    height: 32,
    minWidth: H.touch,
    justifyContent: 'center',
    paddingHorizontal: S.sm + 2,
    borderRadius: R.full,
    backgroundColor: C.cream,
  },
  pillOn: { backgroundColor: C.blue },
  text: { ...T.secondary, fontFamily: T.label.fontFamily, fontSize: 12, lineHeight: 16, color: C.ink2 },
  textOn: { color: C.white },
});
