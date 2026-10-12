import { Pressable, StyleSheet, Text, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { AppTextField } from './AppTextField';
import { PrimaryButton } from './PrimaryButton';
import { C, H, S, T } from '@/lib/theme';

type TextEntrySheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  submitIcon?: keyof typeof Ionicons.glyphMap;
  placeholder?: string;
  fieldIcon?: keyof typeof Ionicons.glyphMap;
  /** Disables the button while the value is not acceptable (e.g. empty). */
  canSubmit?: boolean;
  inputProps?: Pick<TextInputProps, 'autoCapitalize' | 'autoCorrect' | 'keyboardType'>;
};

/** Bottom sheet with a single field, used for short edits (manual serial, technician). */
export function TextEntrySheet({
  visible,
  onClose,
  title,
  label,
  value,
  onChangeText,
  onSubmit,
  submitLabel,
  submitIcon,
  placeholder,
  fieldIcon,
  canSubmit = true,
  inputProps,
}: TextEntrySheetProps) {
  return (
    <BottomSheet visible={visible} onDismiss={onClose}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.close}>
          <Ionicons name="close" size={H.icon} color={C.navy} />
        </Pressable>
      </View>
      <AppTextField
        label={label}
        icon={fieldIcon}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        surface="cream"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => {
          if (canSubmit) onSubmit();
        }}
        {...inputProps}
      />
      <PrimaryButton title={submitLabel} icon={submitIcon} onPress={onSubmit} disabled={!canSubmit} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
  },
  title: {
    ...T.sheetTitle,
    color: C.navy,
    flex: 1,
  },
  close: {
    width: H.circleButton,
    height: H.circleButton,
    borderRadius: H.circleButton / 2,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
