import { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, R, Shdw } from '@/lib/theme';

type HeroHeaderProps = {
  title: string;
  subtitle?: string;
  /** Color de fondo. Default: primary de marca. */
  color?: string;
  /** Botón de retroceso a la izquierda. */
  onBack?: () => void;
  /** Acción a la derecha (ej: botón Salir). */
  rightAction?: { label?: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void };
  /** Contenido extra debajo del título (métricas, chips, etc.). */
  children?: ReactNode;
};

export function HeroHeader({
  title,
  subtitle,
  color = C.primary,
  onBack,
  rightAction,
  children,
}: HeroHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: color, paddingTop: insets.top + 12 },
        Shdw.header,
      ]}
    >
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color={C.onHeader} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>

        {rightAction ? (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.rightBtn} activeOpacity={0.7}>
            {rightAction.icon ? (
              <Ionicons name={rightAction.icon} size={16} color={C.onHeader} />
            ) : null}
            {rightAction.label ? (
              <Text style={styles.rightLabel}>{rightAction.label}</Text>
            ) : null}
          </TouchableOpacity>
        ) : null}
      </View>

      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: R.xl,
    borderBottomRightRadius: R.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    marginLeft: -6,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.onHeader,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: C.onHeaderMuted,
    fontWeight: '600',
    marginTop: 3,
  },
  rightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.full,
  },
  rightLabel: {
    color: C.onHeader,
    fontSize: 14,
    fontWeight: '700',
  },
  children: {
    marginTop: 18,
  },
});
