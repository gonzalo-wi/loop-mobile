import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import type { BundleQuantity } from '../types';
import { C, R } from '@/lib/theme';

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
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={bundlesStr}
        onChangeText={handleBundlesChange}
        placeholder="0"
        placeholderTextColor={C.border}
        selectTextOnFocus
      />
      <Text style={styles.sep}>+</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={looseStr}
        onChangeText={handleLooseChange}
        onBlur={handleBlur}
        placeholder="0"
        placeholderTextColor={C.border}
        selectTextOnFocus
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    width: 62,
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    width: 52,
    height: 40,
    backgroundColor: C.inputBg,
    borderWidth: 0,
    borderRadius: R.sm,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  sep: {
    width: 22,
    textAlign: 'center',
    fontSize: 15,
    color: C.border,
    fontWeight: '700',
  },
  eqSep: {
    width: 20,
    textAlign: 'center',
    fontSize: 15,
    color: C.border,
    fontWeight: '700',
    marginLeft: 2,
  },
  totalWrap: {
    flex: 1,
    height: 40,
    borderRadius: R.sm,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 10,
  },
  totalWrapActive: {
    backgroundColor: C.primaryLight,
  },
  totalText: {
    fontSize: 17,
    fontWeight: '800',
    color: C.border,
  },
  totalTextActive: {
    color: C.primary,
  },
});
