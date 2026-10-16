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
      <View style={styles.cell}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.inputCol}>
        <FieldInput
          style={styles.input}
          keyboardType="numeric"
          value={bundlesStr}
          onChangeText={handleBundlesChange}
          placeholder="0"
          selectTextOnFocus
          accessibilityLabel={`${label}: bultos`}
        />
        <Text style={styles.caption}>{`bultos ×${unitsPerBundle}`}</Text>
      </View>
      <View style={[styles.cell, styles.sepCell]}>
        <Text style={styles.sep}>+</Text>
      </View>
      <View style={styles.inputCol}>
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
        <Text style={styles.caption}>sueltas</Text>
      </View>
      <View style={[styles.cell, styles.sepCell]}>
        <Text style={styles.sep}>=</Text>
      </View>
      <View style={styles.totalCol}>
        <View style={[styles.totalWrap, displayTotal > 0 && styles.totalWrapActive]}>
          <Text style={[styles.totalText, displayTotal > 0 && styles.totalTextActive]}>
            {displayTotal}
          </Text>
        </View>
        <Text style={[styles.caption, styles.totalCaption]}>unidades</Text>
      </View>
    </View>
  );
}

// Fits "Recambio" at the 13/700 field-label size.
export const FIELD_LABEL_WIDTH = 76;

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
  // Captions sit under the boxes, so every cell is pinned to the box height to keep +/= centered on them.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: S.sm,
  },
  cell: {
    height: H.circleButton,
    justifyContent: 'center',
  },
  label: {
    width: FIELD_LABEL_WIDTH,
    ...T.fieldLabel,
    color: C.ink2,
  },
  inputCol: {
    alignItems: 'center',
    gap: S.xs,
  },
  input: {
    width: 56,
  },
  caption: {
    ...T.secondary,
    color: C.ink2,
  },
  sepCell: {
    width: 22,
    alignItems: 'center',
  },
  sep: {
    ...T.section,
    color: C.handle,
  },
  totalCaption: {
    paddingLeft: S.md,
  },
  totalCol: {
    flex: 1,
    gap: S.xs,
    alignItems: 'flex-start',
  },
  totalWrap: {
    alignSelf: 'stretch',
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
