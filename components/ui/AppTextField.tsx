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
import { C, H, R, S, T } from '@/lib/theme';

type AppTextFieldProps = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Mensaje de error; si está presente el campo se marca en rojo. */
  error?: string | null;
  /** Campo de contraseña: agrega botón mostrar/ocultar. */
  secure?: boolean;
  /** Field fill: white on the cream page, cream inside a white panel. */
  surface?: 'white' | 'cream';
};

/**
 * Campo de texto del sistema. Maneja internamente foco, error y disabled,
 * con ícono alineado y toggle de contraseña. Reenvía la ref al TextInput
 * para encadenar foco entre campos (returnKeyType "next").
 */
export const AppTextField = forwardRef<TextInput, AppTextFieldProps>(function AppTextField(
  { label, icon, error, secure = false, surface = 'white', editable = true, onFocus, onBlur, style, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const hasError = !!error;
  const disabled = editable === false;
  const activeColor = hasError ? C.red : focused ? C.blue : C.ink2;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.field,
          { backgroundColor: surface === 'white' ? C.white : C.cream },
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
    ...T.secondary,
    fontFamily: T.label.fontFamily,
    color: C.navy,
    marginLeft: 2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: R.field,
    height: H.field,
    paddingHorizontal: S.xl - 3,
    // Constant 3pt border so the focus ring doesn't shift the layout.
    borderWidth: 3,
    borderColor: 'transparent',
  },
  fieldFocused: {
    // Border only. No dynamic elevation/shadow: on Android it recreates the
    // native view and the TextInput loses focus (closes the keyboard).
    borderColor: C.blue,
  },
  fieldError: {
    borderColor: C.red,
  },
  fieldDisabled: {
    opacity: 0.55,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    ...T.data,
    color: C.navy,
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingLeft: 8,
  },
  errorText: {
    ...T.secondary,
    color: C.redText,
    marginLeft: 2,
  },
});
