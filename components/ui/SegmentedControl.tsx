import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, H, S, T } from '@/lib/theme';

export type SegmentOption<V extends string> = {
  value: V;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Fill of the active option when the rail sits on cream (follows direction → color). */
  activeColor?: string;
  /** Count shown in a small white circle next to the label. */
  badge?: number;
};

type SegmentedControlProps<V extends string> = {
  options: readonly SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /**
   * 'onBlue'/'onGreen': darkened rail inside a color block, active is a white pill.
   * 'onCream': light rail on the page background, active is filled with its activeColor.
   */
  tone?: 'onBlue' | 'onGreen' | 'onCream';
};

const RAIL = {
  onBlue: C.pillOnBlue,
  onGreen: C.pillOnGreen,
  onCream: C.railOnCream,
} as const;

export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  tone = 'onCream',
}: SegmentedControlProps<V>) {
  const isOnCream = tone === 'onCream';
  const inactiveColor = tone === 'onBlue' ? C.white : C.navy;
  const segmentHeight = isOnCream ? H.circleButton : H.pill;

  return (
    <View style={[styles.rail, { backgroundColor: RAIL[tone], borderRadius: segmentHeight / 2 + 4 }]} accessibilityRole="tablist">
      {options.map((opt) => {
        const active = opt.value === value;
        const activeBg = isOnCream ? opt.activeColor ?? C.navy : C.white;
        const activeFg = isOnCream ? C.white : tone === 'onBlue' ? C.blueText : C.navy;
        const color = active ? activeFg : inactiveColor;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.badge !== undefined ? `${opt.label}, ${opt.badge}` : opt.label}
            style={[
              styles.segment,
              { height: segmentHeight, borderRadius: segmentHeight / 2 },
              active && { backgroundColor: activeBg },
            ]}
          >
            {opt.icon ? <Ionicons name={opt.icon} size={H.iconInPill - 2} color={color} /> : null}
            <Text style={[styles.text, active && styles.textActive, { color }]}>{opt.label}</Text>
            {opt.badge !== undefined ? (
              <View style={styles.badge}>
                <Text style={[styles.badgeText, { color: active && isOnCream ? activeBg : C.navy }]}>
                  {opt.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    padding: S.xs,
    gap: S.xs,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
  },
  text: {
    ...T.label,
    fontSize: T.body.fontSize,
  },
  textActive: {
    fontFamily: T.button.fontFamily,
  },
  badge: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: S.xs + 2,
    borderRadius: 13,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...T.secondary,
    fontFamily: T.button.fontFamily,
    fontVariant: ['tabular-nums'],
  },
});
