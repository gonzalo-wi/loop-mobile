import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ColorBlock, Pill, SegmentedControl, type SegmentOption } from '@/components/ui';
import { C, H, R, S, T } from '@/lib/theme';
import type { DispenserMovementType } from '../types';

const TYPE_OPTIONS: readonly SegmentOption<DispenserMovementType>[] = [
  { value: 'LOAD', label: 'Carga', icon: 'arrow-up' },
  { value: 'UNLOAD', label: 'Descarga', icon: 'arrow-down' },
];

type MovementDataBlockProps = {
  type: DispenserMovementType;
  onTypeChange: (type: DispenserMovementType) => void;
  routeCode: string;
  onRouteCodeChange: (value: string) => void;
  dateLabel: string;
  /** The user picked the date by hand, so it no longer follows the type. */
  dateFixed: boolean;
  onDatePress: () => void;
  technician: string;
  onTechnicianPress: () => void;
};

/**
 * The movement's data in one color block: blue for LOAD (goes up), green for
 * UNLOAD (comes down). Reparto is the only field always typed; date and
 * technician come prefilled and are pills that open their editor.
 */
export function MovementDataBlock({
  type,
  onTypeChange,
  routeCode,
  onRouteCodeChange,
  dateLabel,
  dateFixed,
  onDatePress,
  technician,
  onTechnicianPress,
}: MovementDataBlockProps) {
  const isLoad = type === 'LOAD';
  const pillTone = isLoad ? 'onBlue' : 'onGreen';

  return (
    <ColorBlock tone={isLoad ? 'blue' : 'green'}>
      <SegmentedControl
        options={TYPE_OPTIONS}
        value={type}
        onChange={onTypeChange}
        tone={isLoad ? 'onBlue' : 'onGreen'}
      />

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Reparto</Text>
        <TextInput
          style={styles.fieldInput}
          value={routeCode}
          onChangeText={onRouteCodeChange}
          placeholder="Ej: 179"
          placeholderTextColor={C.textFaint}
          keyboardType="number-pad"
          returnKeyType="done"
          accessibilityLabel="Reparto"
        />
      </View>

      <View style={styles.pills}>
        <Pill
          label={dateFixed ? `${dateLabel} · fija` : dateLabel}
          icon={dateFixed ? 'pin-outline' : 'calendar-outline'}
          tone={pillTone}
          onPress={onDatePress}
          accessibilityLabel={`${isLoad ? 'Fecha de carga' : 'Fecha de descarga'}: ${dateLabel}${dateFixed ? ', fija' : ''}`}
        />
        <Pill
          label={technician.trim() || 'Técnico'}
          icon="person-outline"
          tone={pillTone}
          onPress={onTechnicianPress}
          accessibilityLabel={`Técnico: ${technician.trim() || 'sin completar'}`}
        />
      </View>
    </ColorBlock>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    height: 56,
    paddingHorizontal: S.xl,
    borderRadius: R.field,
    backgroundColor: C.white,
  },
  fieldLabel: {
    ...T.label,
    color: C.ink2,
  },
  fieldInput: {
    flex: 1,
    height: '100%',
    // No lineHeight: on Android it pushes the text off the label's baseline.
    fontFamily: T.section.fontFamily,
    fontSize: T.section.fontSize,
    textAlign: 'right',
    textAlignVertical: 'center',
    color: C.navy,
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.sm,
    minHeight: H.pill,
  },
});
