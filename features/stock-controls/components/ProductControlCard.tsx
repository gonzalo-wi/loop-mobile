import React, { memo, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Product, BundleQuantity, ProductControlValues, StockControlType } from '../types';
import { BundleQuantityInput, FieldInput, FIELD_LABEL_WIDTH } from './BundleQuantityInput';
import { C, H, R, S, T } from '@/lib/theme';

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
      <FieldInput
        style={styles.simpleInput}
        keyboardType="numeric"
        value={value}
        onChangeText={onChangeText}
        placeholder="0"
        selectTextOnFocus
        accessibilityLabel={label}
      />
    </View>
  );
}

// Label above the box so the three quantities fit side by side and the
// expanded card stays short (operators scroll through dozens of products).
function SimpleInputColumn({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.simpleColumn}>
      <Text style={styles.simpleColumnLabel}>{label}</Text>
      <FieldInput
        keyboardType="numeric"
        value={value}
        onChangeText={onChangeText}
        placeholder="0"
        selectTextOnFocus
        accessibilityLabel={label}
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

    // Direction color rule: exit = blue, entry = green.
    const accent = isExit ? C.blue : C.greenDot;

    // Resumen para la cabecera cuando está cerrado.
    const cur = latestValues.current;
    const filled =
      cur.full.totalUnits > 0 || cur.total.totalUnits > 0 || cur.exchanges > 0;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.header}
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${product.name}, ${product.code}`}
          accessibilityState={{ expanded }}
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
            {filled && <View style={[styles.filledDot, { backgroundColor: accent }]} />}
            {expanded && (
              <TouchableOpacity
                style={styles.obsBtn}
                onPress={() => setShowObs((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showObs ? 'Ocultar observaciones' : 'Agregar observaciones'}
              >
                <Ionicons
                  name={showObs ? 'chatbubble' : 'chatbubble-outline'}
                  size={20}
                  color={showObs ? C.orange : C.ink2}
                />
              </TouchableOpacity>
            )}
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={C.ink2}
            />
          </View>
        </TouchableOpacity>

        <View style={[styles.body, !expanded && styles.bodyHidden]}>
          {hasBundles ? (
            // Bultos + sueltas need a full row each, so bundle products stay stacked.
            <>
              <BundleQuantityInput
                label="Total"
                unitsPerBundle={product.packQuantity}
                value={initialValues.total}
                onChange={handleTotalChange}
              />
              {!isExit && (
                <>
                  <BundleQuantityInput
                    label="Llenos"
                    unitsPerBundle={product.packQuantity}
                    value={initialValues.full}
                    onChange={handleFullChange}
                  />
                  <SimpleInputRow
                    label="Recamb."
                    value={exchangesStr}
                    onChangeText={handleExchangesChange}
                  />
                </>
              )}
            </>
          ) : (
            <View style={styles.simpleColumns}>
              <SimpleInputColumn label="Total" value={totalStr} onChangeText={handleTotalUnitsChange} />
              {!isExit && (
                <>
                  <SimpleInputColumn label="Llenos" value={fullStr} onChangeText={handleFullUnitsChange} />
                  <SimpleInputColumn label="Recamb." value={exchangesStr} onChangeText={handleExchangesChange} />
                </>
              )}
            </View>
          )}

          {showObs && (
            <FieldInput
              style={styles.obsInput}
              value={observations}
              onChangeText={handleObservationsChange}
              placeholder="Observaciones del producto..."
              multiline
              accessibilityLabel="Observaciones del producto"
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
    backgroundColor: C.white,
    marginHorizontal: S.gutter,
    marginBottom: S.sm,
    borderRadius: R.card,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: H.row,
    paddingLeft: S.lg + 2,
    paddingRight: S.sm,
    paddingVertical: S.sm,
  },
  headerLeft: {
    flex: 1,
    marginRight: S.sm,
  },
  productName: {
    ...T.label,
    color: C.navy,
  },
  summary: {
    ...T.secondary,
    color: C.ink2,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  filledDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  productCode: {
    ...T.secondary,
    color: C.ink2,
    fontVariant: ['tabular-nums'],
  },
  packBadge: {
    backgroundColor: C.cream,
    paddingHorizontal: S.sm,
    paddingVertical: 2,
    borderRadius: R.cell,
  },
  packBadgeText: {
    ...T.systemTag,
    color: C.navy,
    fontVariant: ['tabular-nums'],
  },
  obsBtn: {
    width: H.touch,
    height: H.touch,
    borderRadius: H.touch / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: S.lg + 2,
    paddingTop: S.xs,
    paddingBottom: S.md,
  },
  bodyHidden: {
    display: 'none',
  },
  simpleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S.sm,
  },
  simpleLabel: {
    width: FIELD_LABEL_WIDTH,
    ...T.systemTag,
    color: C.ink2,
    textTransform: 'uppercase',
  },
  simpleInput: {
    width: 80,
  },
  simpleColumns: {
    flexDirection: 'row',
    gap: S.sm,
    marginBottom: S.sm,
  },
  simpleColumn: {
    flex: 1,
    maxWidth: 120,
    gap: S.xs,
  },
  simpleColumnLabel: {
    ...T.systemTag,
    color: C.ink2,
    textTransform: 'uppercase',
  },
  obsInput: {
    ...T.body,
    height: undefined,
    minHeight: H.circleButton,
    paddingHorizontal: S.lg - 3,
    paddingVertical: S.sm,
    textAlign: 'left',
    textAlignVertical: 'top',
    marginTop: S.xs,
  },
});
