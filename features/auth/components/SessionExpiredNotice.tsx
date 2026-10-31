import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, H, R, S, T } from '@/lib/theme';

/** Login-screen notice when the previous session ended because it expired (at midnight or on a 401). */
export function SessionExpiredNotice() {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="time-outline" size={H.iconInPill} color={C.orangeText} />
      <Text style={styles.text}>Tu sesión venció. Volvé a ingresar.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.warningLight,
    borderRadius: R.cell,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
  },
  text: {
    ...T.label,
    flex: 1,
    color: C.orangeText,
  },
});
