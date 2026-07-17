import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S, F, W } from '@/lib/theme';

type ErrorMessageProps = {
  message?: string | null;
};

/** Banner de error compacto con ícono. No renderiza nada si no hay mensaje. */
export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="alert-circle" size={18} color={C.danger} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.dangerLight,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  text: {
    flex: 1,
    color: C.danger,
    fontSize: F.sm + 1,
    fontWeight: W.semibold,
  },
});
