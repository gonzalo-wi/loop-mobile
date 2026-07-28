import React, { memo, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Product, BundleQuantity, ProductControlValues, StockControlType } from '../types';
import { BundleQuantityInput } from './BundleQuantityInput';
import { C, R, Shdw } from '@/lib/theme';

type Props = {
  product: Product;
  initialValues: ProductControlValues;
  onChange: (productId: string, values: ProductControlValues) => void;
  /** En salida (EXIT) sólo se carga el Total; se ocultan Llenos y Recambios. */
  controlType: StockControlType;
};

function SimpleInputRow({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.simpleRow}>
      <Text style={styles.simpleLabel}>{label}</Text>
      <TextInput
        style={styles.simpleInput}
        keyboardType="numeric"
        value={value}
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={C.border}
        selectTextOnFocus
      />
    </View>
  );
}

export const ProductControlCard = memo(
  ({ product, initialValues, onChange, controlType }: Props) => {
    const hasBundles = product.packQuantity > 1;
    const isExit = controlType === 'EXIT';

    const latestValues = useRef<ProductControlValues>(initialValues);

    const [fullStr, setFullStr] = useState(() =>
      initialValues.full.totalUnits > 0 ? String(initialValues.full.totalUnits) : '',
    );
    const [totalStr, setTotalStr] = useState(() =>
      initialValues.total.totalUnits > 0 ? String(initialValues.total.totalUnits) : '',
    );

    const [exchangesStr, setExchangesStr] = useState(() =>
      initialValues.exchanges > 0 ? String(initialValues.exchanges) : '',
    );

    const [observations, setObservations] = useState(() => initialValues.observations);
    const [showObs, setShowObs] = useState(() => !!initialValues.observations);

    // Acordeón: arranca cerrado salvo que el producto ya traiga datos (ej. al editar).
    const hasInitialData =
      initialValues.full.totalUnits > 0 ||
      initialValues.total.totalUnits > 0 ||
      initialValues.exchanges > 0 ||
      !!initialValues.observations;
    const [expanded, setExpanded] = useState(hasInitialData);

    function notifyChange(patch: Partial<ProductControlValues>) {
      const next = { ...latestValues.current, ...patch };
      latestValues.current = next;
      onChange(product.id, next);
    }

    function handleFullChange(value: BundleQuantity) {
      notifyChange({ full: value });
    }

    function handleTotalChange(value: BundleQuantity) {
      notifyChange({ total: value });
    }

    function handleFullUnitsChange(text: string) {
      const cleaned = text.replace(/[^0-9]/g, '');
      setFullStr(cleaned);
      notifyChange({ full: { bundles: 0, looseUnits: 0, totalUnits: parseInt(cleaned, 10) || 0 } });
    }

    function handleTotalUnitsChange(text: string) {
      const cleaned = text.replace(/[^0-9]/g, '');
      setTotalStr(cleaned);
      notifyChange({ total: { bundles: 0, looseUnits: 0, totalUnits: parseInt(cleaned, 10) || 0 } });
    }

    function handleExchangesChange(text: string) {
      const cleaned = text.replace(/[^0-9]/g, '');
      setExchangesStr(cleaned);
      notifyChange({ exchanges: parseInt(cleaned, 10) || 0 });
    }

    function handleObservationsChange(text: string) {
      setObservations(text);
      notifyChange({ observations: text });
    }

    const isRetornable = product.type === 'RETORNABLE';

    // Resumen para la cabecera cuando está cerrado.
    const cur = latestValues.current;
    const filled =
      cur.full.totalUnits > 0 || cur.total.totalUnits > 0 || cur.exchanges > 0;

    return (
      <View style={[styles.card, isRetornable ? styles.cardRetornable : styles.cardDescartable]}>
        <TouchableOpacity
          style={styles.header}
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.productName} numberOfLines={1}>
              {product.name}
            </Text>
            {!expanded && filled && (
              <Text style={styles.summary} numberOfLines={1}>
                {isExit
                  ? `Total ${cur.total.totalUnits}`
                  : `Total ${cur.total.totalUnits} · Llenos ${cur.full.totalUnits}${cur.exchanges > 0 ? ` · Recamb ${cur.exchanges}` : ''}`}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.productCode}>{product.code}</Text>
            {hasBundles && (
              <View style={styles.packBadge}>
                <Text style={styles.packBadgeText}>×{product.packQuantity}</Text>
              </View>
            )}
            {filled && <View style={styles.filledDot} />}
            {expanded && (
              <TouchableOpacity
                style={styles.obsBtn}
                onPress={() => setShowObs((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showObs ? 'chatbubble' : 'chatbubble-outline'}
                  size={16}
                  color={showObs ? C.warning : C.textMuted}
                />
              </TouchableOpacity>
            )}
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={C.textMuted}
            />
          </View>
        </TouchableOpacity>

        <View style={[styles.body, !expanded && styles.bodyHidden]}>
          {hasBundles ? (
            <>
              {!isExit && (
                <BundleQuantityInput
                  label="Llenos"
                  unitsPerBundle={product.packQuantity}
                  value={initialValues.full}
                  onChange={handleFullChange}
                />
              )}
              <BundleQuantityInput
                label="Total"
                unitsPerBundle={product.packQuantity}
                value={initialValues.total}
                onChange={handleTotalChange}
              />
            </>
          ) : (
            <>
              {!isExit && (
                <SimpleInputRow label="Llenos" value={fullStr} onChangeText={handleFullUnitsChange} />
              )}
              <SimpleInputRow label="Total" value={totalStr} onChangeText={handleTotalUnitsChange} />
            </>
          )}

          {!isExit && (
            <SimpleInputRow
              label="Recamb."
              value={exchangesStr}
              onChangeText={handleExchangesChange}
            />
          )}

          {showObs && (
            <TextInput
              style={styles.obsInput}
              value={observations}
              onChangeText={handleObservationsChange}
              placeholder="Observaciones del producto..."
              placeholderTextColor={C.border}
              multiline
            />
          )}
        </View>
      </View>
    );
  },
  (prev, next) =>
    prev.product.id === next.product.id &&
    prev.onChange === next.onChange &&
    prev.controlType === next.controlType,
);

ProductControlCard.displayName = 'ProductControlCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: R.lg,
    overflow: 'hidden',
    borderLeftWidth: 3,
    ...Shdw.card,
  },
  cardRetornable: {
    borderLeftColor: C.retornableBorder,
  },
  cardDescartable: {
    borderLeftColor: C.descartableBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: C.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  summary: {
    fontSize: 12,
    color: C.textSub,
    fontWeight: '600',
    marginTop: 2,
  },
  filledDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.success,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productCode: {
    fontSize: 11,
    color: C.textMuted,
  },
  packBadge: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: R.xs,
  },
  packBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.primary,
  },
  obsBtn: {
    padding: 4,
  },
  body: {
    padding: 12,
    paddingBottom: 10,
  },
  bodyHidden: {
    display: 'none',
  },
  simpleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  simpleLabel: {
    width: 62,
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  simpleInput: {
    width: 72,
    height: 40,
    backgroundColor: C.inputBg,
    borderWidth: 0,
    borderRadius: R.sm,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  obsInput: {
    backgroundColor: C.inputBg,
    borderWidth: 0,
    borderRadius: R.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: C.text,
    marginTop: 6,
    minHeight: 36,
  },
});
