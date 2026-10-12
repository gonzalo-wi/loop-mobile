import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import type { BundleQuantity } from '../types';
import { C, H, R, S, T } from '@/lib/theme';

/** Cream field for white cards: 3pt border is constant so the blue focus ring doesn't shift layout. */
export function FieldInput({ style, onFocus, onBlur, ...rest }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[styles.field, focused && styles.fieldFocused, style]}
      placeholderTextColor={C.textFaint}
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
  );
}

function normalizeBundleQuantity(
  bundles: number,
  looseUnits: number,
  unitsPerBundle: number,
): BundleQuantity {
  const safeBundles = Math.max(0, bundles);
  const safeLoose = Math.max(0, looseUnits);
  const normalizedBundles = safeBundles + Math.floor(safeLoose / unitsPerBundle);
  const normalizedLoose = safeLoose % unitsPerBundle;
  return {
    bundles: normalizedBundles,
    looseUnits: normalizedLoose,
    totalUnits: normalizedBundles * unitsPerBundle + normalizedLoose,
  };
}

type Props = {
  label: string;
  unitsPerBundle: number;
  value: BundleQuantity;
  onChange: (value: BundleQuantity) => void;
};

export function BundleQuantityInput({ label, unitsPerBundle, value, onChange }: Props) {
  const [bundlesStr, setBundlesStr] = useState(() =>
    value.bundles > 0 ? String(value.bundles) : '',
  );
  const [looseStr, setLooseStr] = useState(() =>
    value.looseUnits > 0 ? String(value.looseUnits) : '',
  );

  const displayTotal =
    (parseInt(bundlesStr, 10) || 0) * unitsPerBundle + (parseInt(looseStr, 10) || 0);

  function handleBundlesChange(text: string) {
    const cleaned = text.replace(/[^0-9]/g, '');
    setBundlesStr(cleaned);
    const bundles = parseInt(cleaned, 10) || 0;
    const loose = parseInt(looseStr, 10) || 0;
    onChange({ bundles, looseUnits: loose, totalUnits: bundles * unitsPerBundle + loose });
  }

  function handleLooseChange(text: string) {
    const cleaned = text.replace(/[^0-9]/g, '');
    setLooseStr(cleaned);
    const bundles = parseInt(bundlesStr, 10) || 0;
    const loose = parseInt(cleaned, 10) || 0;
    onChange({ bundles, looseUnits: loose, totalUnits: bundles * unitsPerBundle + loose });
  }

  function handleBlur() {
    const bundles = parseInt(bundlesStr, 10) || 0;
    const loose = parseInt(looseStr, 10) || 0;
    if (loose >= unitsPerBundle) {
      const normalized = normalizeBundleQuantity(bundles, loose, unitsPerBundle);
      setBundlesStr(normalized.bundles > 0 ? String(normalized.bundles) : '');
      setLooseStr(normalized.looseUnits > 0 ? String(normalized.looseUnits) : '');
      onChange(normalized);
    }
  }

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <FieldInput
        style={styles.input}
        keyboardType="numeric"
        value={bundlesStr}
        onChangeText={handleBundlesChange}
        placeholder="0"
        selectTextOnFocus
        accessibilityLabel={`${label}: bultos`}
      />
      <Text style={styles.sep}>+</Text>
      <FieldInput
        style={styles.input}
        keyboardType="numeric"
        value={looseStr}
        onChangeText={handleLooseChange}
        onBlur={handleBlur}
        placeholder="0"
        selectTextOnFocus
        accessibilityLabel={`${label}: unidades sueltas`}
      />
      <Text style={styles.eqSep}>=</Text>
      <View style={[styles.totalWrap, displayTotal > 0 && styles.totalWrapActive]}>
        <Text style={[styles.totalText, displayTotal > 0 && styles.totalTextActive]}>
          {displayTotal}
        </Text>
      </View>
    </View>
  );
}

export const FIELD_LABEL_WIDTH = 68;

const styles = StyleSheet.create({
  field: {
    height: H.circleButton,
    backgroundColor: C.cream,
    borderWidth: 3,
    borderColor: 'transparent',
    borderRadius: R.field,
    paddingVertical: 0,
    textAlign: 'center',
    ...T.data,
    color: C.navy,
    fontVariant: ['tabular-nums'],
  },
  fieldFocused: {
    backgroundColor: C.white,
    borderColor: C.blue,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S.sm,
  },
  label: {
    width: FIELD_LABEL_WIDTH,
    ...T.systemTag,
    color: C.ink2,
    textTransform: 'uppercase',
  },
  input: {
    width: 56,
  },
  sep: {
    width: 22,
    textAlign: 'center',
    ...T.section,
    color: C.handle,
  },
  eqSep: {
    width: 22,
    textAlign: 'center',
    ...T.section,
    color: C.handle,
  },
  totalWrap: {
    flex: 1,
    height: H.circleButton,
    borderRadius: R.field,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: S.md,
  },
  totalWrapActive: {
    backgroundColor: C.cream,
  },
  totalText: {
    ...T.section,
    color: C.handle,
    fontVariant: ['tabular-nums'],
  },
  totalTextActive: {
    color: C.navy,
  },
});
