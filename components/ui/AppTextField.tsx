import { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S, F, W } from '@/lib/theme';

type AppTextFieldProps = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Mensaje de error; si está presente el campo se marca en rojo. */
  error?: string | null;
  /** Campo de contraseña: agrega botón mostrar/ocultar. */
  secure?: boolean;
};

/**
 * Campo de texto del sistema. Maneja internamente foco, error y disabled,
 * con ícono alineado y toggle de contraseña. Reenvía la ref al TextInput
 * para encadenar foco entre campos (returnKeyType "next").
 */
export const AppTextField = forwardRef<TextInput, AppTextFieldProps>(function AppTextField(
  { label, icon, error, secure = false, editable = true, onFocus, onBlur, style, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const hasError = !!error;
  const disabled = editable === false;
  const activeColor = hasError ? C.danger : focused ? C.primary : C.textMuted;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          hasError && styles.fieldError,
          disabled && styles.fieldDisabled,
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={19} color={activeColor} style={styles.icon} />
        ) : null}

        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={C.textFaint}
          editable={editable}
          secureTextEntry={secure && hidden}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />

        {secure ? (
          <TouchableOpacity
            onPress={() => setHidden((v) => !v)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={C.textSub}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {hasError ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: S.xs + 2,
  },
  label: {
    fontSize: F.sm + 1,
    fontWeight: W.semibold,
    color: C.textSub,
    marginLeft: 2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.inputBg,
    borderRadius: R.lg,
    height: 58,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  fieldFocused: {
    // Solo borde + fondo. No agregar elevation/shadow dinámicos: en Android
    // recrean la vista nativa y el TextInput pierde el foco (cierra el teclado).
    borderColor: C.primary,
    backgroundColor: C.surface,
  },
  fieldError: {
    borderColor: C.danger,
    backgroundColor: C.surface,
  },
  fieldDisabled: {
    opacity: 0.55,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: F.md,
    color: C.text,
    fontWeight: W.medium,
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingLeft: 8,
  },
  errorText: {
    fontSize: F.xs + 1,
    color: C.danger,
    fontWeight: W.semibold,
    marginLeft: 2,
  },
});
