import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOrderableProducts, createOrder, getOrders } from '@/features/driver/services/ordersApi';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { useRouteStore } from '@/store/routeStore';
import type { OrderableProduct } from '@/features/driver/types';
import { BottomBar, EmptyState, ScreenHeader, SecondaryButton } from '@/components/ui';
import { C, H, R, S, T, Shdw } from '@/lib/theme';

const DAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function ddmm(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeNumber(value: string): number {
  if (value === '' || value === undefined) return 0;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

type ProductValues = {
  unitQuantity: string;
  bulkQuantity: string;
};

/** Big numeric box: cream at rest, white with a blue ring while typing. */
function QuantityBox({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        value={value}
        // Digits only: an empty box means 0.
        onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ''))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={C.ink2}
        returnKeyType="done"
        accessibilityLabel={label}
      />
    </View>
  );
}

function OrderProductCard({
  product,
  values,
  onChange,
}: {
  product: OrderableProduct;
  values: ProductValues;
  onChange: (productId: string, values: ProductValues) => void;
}) {
  const hasActivity =
    normalizeNumber(values.unitQuantity) > 0 || normalizeNumber(values.bulkQuantity) > 0;

  return (
    <View style={[styles.productCard, hasActivity && styles.productCardActive]}>
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productCode}>{product.code}</Text>
      </View>

      <View style={styles.productInputs}>
        {product.allowsBulk && product.unitsPerBulk != null && (
          <QuantityBox
            label={`Bultos · ${product.unitsPerBulk} u`}
            value={values.bulkQuantity}
            onChangeText={(t) => onChange(product.id, { ...values, bulkQuantity: t })}
          />
        )}

        {product.allowsUnit && (
          <QuantityBox
            label="Unidades"
            value={values.unitQuantity}
            onChangeText={(t) => onChange(product.id, { ...values, unitQuantity: t })}
          />
        )}
      </View>

      {hasActivity && product.allowsBulk && product.unitsPerBulk != null && (
        <Text style={styles.productTotal}>
          Total: {normalizeNumber(values.bulkQuantity) * product.unitsPerBulk + normalizeNumber(values.unitQuantity)} unidades
        </Text>
      )}
    </View>
  );
}

export default function CreateOrderScreen() {
  const router = useRouter();
  const { suggest } = useLocalSearchParams<{ suggest?: string }>();
  const { route } = useRouteStore();
  const keyboardHeight = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  const keyboardVisible = keyboardHeight > 0;
  const listPaddingBottom = keyboardVisible
    ? (Platform.OS === 'android' ? S.xxl + keyboardHeight : S.xxl)
    : BOTTOM_BAR_SPACE + insets.bottom;

  const [products, setProducts] = useState<OrderableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, ProductValues>>({});
  const [observations, setObservations] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [suggestLabel, setSuggestLabel] = useState<string | null>(null);
  const isSuggest = suggest === '1';

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getOrderableProducts();
        setProducts(data);
        const initial: Record<string, ProductValues> = {};
        data.forEach((p) => { initial[p.id] = { unitQuantity: '', bulkQuantity: '' }; });

        // "Sugerir pedido": prellenar con el pedido del mismo día la semana pasada.
        if (isSuggest && route) {
          try {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            const day = ymd(lastWeek);
            const res = await getOrders({ routeId: route.routeId, from: day, to: day, size: 20 });
            const previous = res.orders[0];
            if (previous) {
              previous.items.forEach((it) => {
                if (initial[it.productId]) {
                  initial[it.productId] = {
                    unitQuantity: it.unitQuantity > 0 ? String(it.unitQuantity) : '',
                    bulkQuantity: it.bulkQuantity && it.bulkQuantity > 0 ? String(it.bulkQuantity) : '',
                  };
                }
              });
              setSuggestLabel(`Basado en tu pedido del ${DAYS_LONG[lastWeek.getDay()]} pasado (${ddmm(lastWeek)}). Ajustá lo que necesites.`);
            } else {
              setSuggestLabel(`No encontramos un pedido del ${DAYS_LONG[lastWeek.getDay()]} pasado (${ddmm(lastWeek)}). Cargalo desde cero.`);
            }
          } catch {
            // Si falla la sugerencia, seguimos con el formulario vacío.
          }
        }

        setValues(initial);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Error al cargar productos');
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const handleChange = useCallback((productId: string, newValues: ProductValues) => {
    setValues((prev) => ({ ...prev, [productId]: newValues }));
  }, []);

  async function handleSubmit() {
    if (!route) {
      Alert.alert('Error', 'Sin reparto asignado');
      return;
    }

    const items = products
      .map((p) => {
        const v = values[p.id];
        const unitQty = normalizeNumber(v?.unitQuantity ?? '');
        const bulkQty = normalizeNumber(v?.bulkQuantity ?? '');
        if (unitQty === 0 && bulkQty === 0) return null;
        return {
          productId: p.id,
          unitQuantity: unitQty > 0 ? unitQty : undefined,
          bulkQuantity: p.allowsBulk && bulkQty > 0 ? bulkQty : null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (items.length === 0) {
      Alert.alert('Sin productos', 'Ingresá al menos un producto');
      return;
    }

    setSubmitting(true);
    try {
      await createOrder({
        routeId: route.routeId,
        observations: observations.trim() || undefined,
        items,
      });
      Alert.alert('Pedido enviado', 'El pedido fue registrado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error al enviar', e instanceof Error ? e.message : 'Intentá de nuevo');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCount = products.filter((p) => {
    const v = values[p.id];
    return normalizeNumber(v?.unitQuantity ?? '') > 0 || normalizeNumber(v?.bulkQuantity ?? '') > 0;
  }).length;
  const title = isSuggest ? 'Sugerir pedido' : 'Nuevo pedido';
  const subtitle = route ? `Reparto ${route.routeCode} · ${route.branchName}` : undefined;
  const header = <ScreenHeader title={title} subtitle={subtitle} onBack={() => router.back()} />;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.navy} />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {header}
        <View style={styles.centered}>
          <EmptyState icon="alert-circle-outline" title="No se pudieron cargar los productos" hint={loadError} />
          <View style={styles.retryWrap}>
            <SecondaryButton title="Volver" icon="chevron-back" onPress={() => router.back()} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {header}
      <KeyboardAvoidingView
        style={styles.flatList}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          style={styles.flatList}
          data={products}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, { paddingBottom: listPaddingBottom }]}
          ListHeaderComponent={
            <View style={styles.formHeader}>
              {suggestLabel && (
                <View style={styles.suggestBanner}>
                  <Ionicons name="sparkles-outline" size={20} color={C.blueText} />
                  <Text style={styles.suggestBannerText}>{suggestLabel}</Text>
                </View>
              )}
              <Text style={styles.sectionTitle}>Productos · tocá un casillero y escribí la cantidad</Text>
            </View>
          }
          renderItem={({ item }) => (
            <OrderProductCard
              product={item}
              values={values[item.id] ?? { unitQuantity: '', bulkQuantity: '' }}
              onChange={handleChange}
            />
          )}
          ListFooterComponent={
            <TextInput
              style={styles.obsInput}
              placeholder="Observaciones (opcional)"
              placeholderTextColor={C.ink2}
              value={observations}
              onChangeText={setObservations}
              multiline
              maxLength={500}
              accessibilityLabel="Observaciones"
            />
          }
        />

        {!keyboardVisible && (
          <BottomBar>
            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && !submitting && styles.pressed, submitting && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={`Enviar pedido, ${selectedCount} producto${selectedCount !== 1 ? 's' : ''}`}
            >
              {submitting ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Text style={styles.submitText}>Enviar pedido</Text>
                  {selectedCount > 0 && (
                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>
                        {selectedCount} producto{selectedCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </Pressable>
          </BottomBar>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

// Submit button + the bottom bar's vertical padding, so the last product isn't hidden.
const BOTTOM_BAR_SPACE = H.primaryButton + S.md * 2 + S.lg;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  flatList: { flex: 1 },
  list: { paddingHorizontal: S.gutter, gap: S.md },
  centered: { flex: 1, justifyContent: 'center', padding: S.gutter, gap: S.lg },
  loadingText: { ...T.body, color: C.ink2, textAlign: 'center' },
  retryWrap: { alignSelf: 'center' },
  pressed: { opacity: 0.9 },

  formHeader: { gap: S.md },
  suggestBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S.md - 2,
    padding: S.lg,
    borderRadius: R.field,
    backgroundColor: C.blueLight,
  },
  suggestBannerText: { ...T.body, color: C.navy, flex: 1 },
  sectionTitle: { ...T.label, color: C.ink2, paddingLeft: S.sm },

  productCard: {
    gap: S.md,
    padding: S.lg + 2,
    borderRadius: R.card,
    borderWidth: 2,
    borderColor: C.white,
    backgroundColor: C.white,
  },
  productCardActive: { borderColor: C.blue },
  productHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md },
  productName: { ...T.data, fontSize: T.section.fontSize, color: C.navy, flex: 1 },
  productCode: { ...T.secondary, color: C.ink2 },
  productInputs: { flexDirection: 'row', gap: S.md },
  inputBlock: { flex: 1, gap: S.sm },
  inputLabel: { ...T.secondary, color: C.ink2, paddingLeft: S.sm },
  input: {
    height: H.field,
    borderRadius: R.field,
    borderWidth: 3,
    borderColor: C.cream,
    backgroundColor: C.cream,
    textAlign: 'center',
    fontFamily: T.blockTitle.fontFamily,
    fontSize: 26,
    color: C.navy,
    paddingVertical: 0,
  },
  inputFocused: { backgroundColor: C.white, borderColor: C.blue },
  productTotal: { ...T.secondary, fontFamily: T.label.fontFamily, color: C.blueText },

  obsInput: {
    ...T.body,
    minHeight: H.field,
    marginTop: S.xs,
    paddingHorizontal: S.xl,
    paddingVertical: S.lg,
    borderRadius: R.field,
    backgroundColor: C.white,
    color: C.navy,
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.md,
    height: H.primaryButton,
    borderRadius: H.primaryButton / 2,
    backgroundColor: C.navy,
    ...Shdw.primaryButton,
  },
  submitDisabled: { opacity: 0.55 },
  submitText: { ...T.button, color: C.white },
  countPill: { height: 32, paddingHorizontal: S.md, borderRadius: 16, backgroundColor: C.blue, justifyContent: 'center' },
  countPillText: { ...T.label, fontFamily: T.button.fontFamily, color: C.white },
});
