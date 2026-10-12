import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, H, R, S, T } from '@/lib/theme';

type ErrorMessageProps = {
  message?: string | null;
};

/** Banner de error compacto con ícono. No renderiza nada si no hay mensaje. */
export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={H.iconInPill} color={C.redText} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.redSoft,
    borderRadius: R.cell,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
  },
  text: {
    ...T.label,
    flex: 1,
    color: C.redText,
  },
});
