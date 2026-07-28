import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOrderableProducts, createOrder, getOrders } from '@/features/driver/services/ordersApi';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { useRouteStore } from '@/store/routeStore';
import type { OrderableProduct } from '@/features/driver/types';
import { C, R, Shdw } from '@/lib/theme';

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
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>
              Bultos ({product.unitsPerBulk} u/bulto)
            </Text>
            <TextInput
              style={styles.input}
              value={values.bulkQuantity}
              onChangeText={(t) => onChange(product.id, { ...values, bulkQuantity: t })}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={C.textMuted}
              returnKeyType="done"
            />
          </View>
        )}

        {product.allowsUnit && (
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Unidades</Text>
            <TextInput
              style={styles.input}
              value={values.unitQuantity}
              onChangeText={(t) => onChange(product.id, { ...values, unitQuantity: t })}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={C.textMuted}
              returnKeyType="done"
            />
          </View>
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
    ? (Platform.OS === 'android' ? 24 + keyboardHeight : 24)
    : 96 + insets.bottom;

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

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Nuevo Pedido' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isSuggest ? 'Sugerir pedido' : 'Nuevo Pedido' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <FlatList
          style={styles.flatList}
          data={products}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, { paddingBottom: listPaddingBottom }]}
          ListHeaderComponent={
            <View style={styles.formHeader}>
              {route && (
                <View style={styles.routeInfo}>
                  <Text style={styles.routeInfoText}>
                    Reparto {route.routeCode} · {route.branchName}
                  </Text>
                </View>
              )}
              {suggestLabel && (
                <View style={styles.suggestBanner}>
                  <Ionicons name="sparkles" size={16} color={C.primary} />
                  <Text style={styles.suggestBannerText}>{suggestLabel}</Text>
                </View>
              )}
              <Text style={styles.sectionTitle}>Productos</Text>
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
            <View style={styles.footer}>
              <TextInput
                style={styles.obsInput}
                placeholder="Observaciones (opcional)"
                placeholderTextColor={C.textMuted}
                value={observations}
                onChangeText={setObservations}
                multiline
                maxLength={500}
              />
            </View>
          }
        />

        {!keyboardVisible && (
          <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Enviar Pedido</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  list: { paddingBottom: 24 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: C.bg,
  },
  loadingText: { marginTop: 12, color: C.textMuted, fontSize: 15 },
  errorText: { color: C.danger, fontSize: 15, textAlign: 'center', marginBottom: 14 },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: C.primary,
    borderRadius: R.md,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  formHeader: { padding: 12, gap: 8 },
  routeInfo: {
    backgroundColor: C.primaryLight,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  routeInfoText: { fontSize: 14, color: C.primary, fontWeight: '600' },
  suggestBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.primaryLight,
    borderRadius: R.md,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  suggestBannerText: { flex: 1, fontSize: 13, color: C.primary, fontWeight: '600', lineHeight: 18 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  productCard: {
    backgroundColor: C.surface,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: R.lg,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
    ...Shdw.card,
  },
  productCardActive: {
    borderColor: C.primary,
    borderWidth: 1.5,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productName: { fontSize: 15, fontWeight: '600', color: C.text, flex: 1 },
  productCode: { fontSize: 12, color: C.textMuted },
  productInputs: { flexDirection: 'row', gap: 12 },
  inputBlock: { flex: 1, gap: 4 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: C.inputBg,
    borderRadius: R.md,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
  },
  productTotal: {
    fontSize: 13,
    color: C.primary,
    fontWeight: '600',
  },

  footer: { padding: 12, gap: 10 },
  flatList: { flex: 1 },
  stickyBar: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 12,
    paddingTop: 12,
    shadowColor: '#172554',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  obsInput: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
    minHeight: 48,
  },
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: R.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shdw.float,
  },
  submitDisabled: { opacity: 0.55 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
