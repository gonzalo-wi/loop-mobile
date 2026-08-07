import React, { useState, useCallback, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getStockControl, updateStockControl } from '@/features/stock-controls/services/stockControlApi';
import { getProducts } from '@/features/stock-controls/services/productsApi';
import { ProductControlCard } from '@/features/stock-controls/components/ProductControlCard';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { C, R, Shdw } from '@/lib/theme';
import type {
  StockControl,
  StockControlItem,
  Product,
  ProductControlValues,
} from '@/features/stock-controls/types';

const EMPTY_PRODUCT_VALUES: ProductControlValues = {
  full: { bundles: 0, looseUnits: 0, totalUnits: 0 },
  total: { bundles: 0, looseUnits: 0, totalUnits: 0 },
  exchanges: 0,
  observations: '',
};

function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  CONTROLLED: { label: 'Controlado', color: C.primary },
  PENDING_DRIVER_APPROVAL: { label: 'Pendiente aprobación', color: C.warning },
  ACCEPTED_BY_DRIVER: { label: 'Aprobado', color: C.success },
  REJECTED_BY_DRIVER: { label: 'Rechazado', color: C.danger },
  WITH_DIFFERENCES: { label: 'Con diferencias', color: '#D97706' },
  SENT_TO_AGUAS: { label: 'Enviado a Aguas', color: '#6D28D9' },
  AGUAS_ERROR: { label: 'Error Aguas', color: '#B91C1C' },
  CANCELLED: { label: 'Cancelado', color: '#6B7280' },
};

function buildInitialFormValues(
  products: Product[],
  items: StockControlItem[],
): Record<string, ProductControlValues> {
  const itemMap = new Map(items.map((item) => [item.productId, item]));
  const result: Record<string, ProductControlValues> = {};

  for (const product of products) {
    const item = itemMap.get(product.id);
    if (!item) {
      result[product.id] = EMPTY_PRODUCT_VALUES;
      continue;
    }

    const hasBundles = product.packQuantity > 1;
    if (hasBundles) {
      result[product.id] = {
        full: {
          bundles: Math.floor(item.fullQuantity / product.packQuantity),
          looseUnits: item.fullQuantity % product.packQuantity,
          totalUnits: item.fullQuantity,
        },
        total: {
          bundles: Math.floor(item.totalQuantity / product.packQuantity),
          looseUnits: item.totalQuantity % product.packQuantity,
          totalUnits: item.totalQuantity,
        },
        exchanges: item.exchangeQuantity,
        observations: item.observations ?? '',
      };
    } else {
      result[product.id] = {
        full: { bundles: 0, looseUnits: 0, totalUnits: item.fullQuantity },
        total: { bundles: 0, looseUnits: 0, totalUnits: item.totalQuantity },
        exchanges: item.exchangeQuantity,
        observations: item.observations ?? '',
      };
    }
  }

  return result;
}

function buildItems(products: Product[], formValues: Record<string, ProductControlValues>) {
  return products
    .map((product) => {
      const values = formValues[product.id] ?? EMPTY_PRODUCT_VALUES;
      const { full, total, exchanges, observations } = values;
      if (total.totalUnits === 0 && full.totalUnits === 0 && exchanges === 0) return null;
      return {
        productId: product.id,
        totalQuantity: total.totalUnits,
        fullQuantity: full.totalUnits,
        exchangeQuantity: exchanges,
        observations: observations.trim() || undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

// ─── Read-only item list for non-editable controls ───────────────────────────

function ReadOnlyItemList({ items }: { items: StockControlItem[] }) {
  if (items.length === 0) {
    return <Text style={styles.emptyItems}>Sin productos cargados</Text>;
  }

  return (
    <View style={styles.roList}>
      {items.map((item) => (
        <View key={item.id} style={styles.roItem}>
          <View style={styles.roItemHeader}>
            <Text style={styles.roItemName}>{item.productName}</Text>
            <Text style={styles.roItemCode}>{item.productCode}</Text>
          </View>
          <View style={styles.roItemQtys}>
            <Text style={styles.roQty}>Total <Text style={styles.roQtyVal}>{item.totalQuantity}</Text></Text>
            <Text style={styles.roQty}>Llenos <Text style={styles.roQtyVal}>{item.fullQuantity}</Text></Text>
            <Text style={styles.roQty}>Recamb. <Text style={styles.roQtyVal}>{item.exchangeQuantity}</Text></Text>
            {item.differenceQuantity != null && (
              <Text style={[styles.roQty, { color: item.differenceQuantity !== 0 ? C.danger : C.success }]}>
                Dif. <Text style={styles.roQtyVal}>{item.differenceQuantity}</Text>
              </Text>
            )}
          </View>
          {item.observations ? (
            <Text style={styles.roItemObs}>{item.observations}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function EditControlScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const keyboardHeight = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  // La barra de guardar es siempre visible, así que la lista siempre le deja lugar.
  const listPaddingBottom = 96 + insets.bottom;

  const [control, setControl] = useState<StockControl | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [formValues, setFormValues] = useState<Record<string, ProductControlValues>>({});
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [ctrl, prods] = await Promise.all([getStockControl(id), getProducts()]);
        setControl(ctrl);
        setObservations(ctrl.observations ?? '');

        if (ctrl.status === 'CONTROLLED') {
          setProducts(prods);
          setFormValues(buildInitialFormValues(prods, ctrl.items));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar el control');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleProductChange = useCallback(
    (productId: string, values: ProductControlValues) => {
      setFormValues((prev) => ({ ...prev, [productId]: values }));
    },
    [],
  );

  async function handleSave() {
    if (!control) return;

    const items = buildItems(products, formValues);
    if (items.length === 0) {
      Alert.alert('Sin productos', 'Ingresá cantidades para al menos un producto');
      return;
    }

    setSaving(true);
    try {
      await updateStockControl(control.id, {
        observations: observations.trim() || undefined,
        items,
      });
      Alert.alert('Guardado', 'El control fue actualizado', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error al guardar', e instanceof Error ? e.message : 'Intentá de nuevo');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Control' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </>
    );
  }

  if (error || !control) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Control no encontrado'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const isEditable = control.status === 'CONTROLLED';
  const isExit = control.type === 'EXIT';
  const status = STATUS_LABELS[control.status] ?? { label: control.status, color: '#555' };
  const [cy, cm, cd] = control.controlDate.split('-');
  const dateFormatted = `${cd}/${cm}/${cy}`;
  const title = isExit ? 'Control de Salida' : 'Control de Entrada';

  // ── Read-only view ──
  if (!isEditable) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <View style={styles.container}>
          <FlatList
            data={[]}
            keyExtractor={() => ''}
            renderItem={null}
            ListHeaderComponent={
              <View>
                <View style={styles.headerBanner}>
                  <View style={[styles.typeBanner, isExit ? styles.exitBanner : styles.entryBanner]}>
                    <Text style={styles.typeBannerText}>{title}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: status.color }]}>
                    <Text style={styles.statusPillText}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.routeBox}>
                  <Text style={styles.routeCode}>Reparto {control.routeCode}</Text>
                  <Text style={styles.branchName}>{control.branchName}</Text>
                  <Text style={styles.controlDate}>{dateFormatted}</Text>
                </View>

                {control.observations ? (
                  <View style={styles.obsBox}>
                    <Text style={styles.obsBoxLabel}>Observaciones</Text>
                    <Text style={styles.obsBoxText}>{control.observations}</Text>
                  </View>
                ) : null}

                <Text style={styles.sectionTitle}>Productos ({control.items.length})</Text>
                <ReadOnlyItemList items={control.items} />
              </View>
            }
            contentContainerStyle={styles.list}
          />
        </View>
      </>
    );
  }

  // ── Editable view ──
  const EditHeader = (
    <View>
      <View style={styles.headerBanner}>
        <View style={[styles.typeBanner, isExit ? styles.exitBanner : styles.entryBanner]}>
          <Text style={styles.typeBannerText}>{title}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.color }]}>
          <Text style={styles.statusPillText}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.routeBox}>
        <Text style={styles.routeCode}>Reparto {control.routeCode}</Text>
        <Text style={styles.branchName}>{control.branchName}</Text>
        <Text style={styles.controlDate}>{dateFormatted}</Text>
      </View>

      <TextInput
        style={styles.observationsInput}
        placeholder="Observaciones generales (opcional)"
        placeholderTextColor={C.textMuted}
        value={observations}
        onChangeText={setObservations}
        multiline
      />

      <Text style={styles.sectionTitle}>Productos</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={C.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar producto..."
          placeholderTextColor={C.textMuted}
          value={productSearch}
          onChangeText={setProductSearch}
          autoCorrect={false}
          returnKeyType="search"
        />
        {productSearch.length > 0 && (
          <TouchableOpacity
            onPress={() => setProductSearch('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const searchQuery = normalizeText(productSearch.trim());
  const filteredProducts = searchQuery
    ? products.filter(
        (p) =>
          normalizeText(p.name).includes(searchQuery) ||
          normalizeText(p.code).includes(searchQuery),
      )
    : products;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <FlatList
          style={styles.flatList}
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductControlCard
              product={item}
              initialValues={formValues[item.id] ?? EMPTY_PRODUCT_VALUES}
              onChange={handleProductChange}
              controlType={control.type}
            />
          )}
          ListHeaderComponent={EditHeader}
          ListEmptyComponent={
            searchQuery ? (
              <Text style={styles.noResults}>
                Sin resultados para “{productSearch.trim()}”
              </Text>
            ) : null
          }
          contentContainerStyle={[styles.list, { paddingBottom: listPaddingBottom }]}
          keyboardShouldPersistTaps="handled"
        />

        <View
          style={[
            styles.stickyBar,
            { paddingBottom: keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 14) },
          ]}
        >
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar Cambios</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  list: {
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: C.bg,
  },
  errorText: {
    color: C.danger,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 14,
  },
  retryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: C.primary,
    borderRadius: R.md,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Header
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 0,
  },
  typeBanner: {
    flex: 1,
    borderRadius: R.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  exitBanner: {
    backgroundColor: C.exit,
  },
  entryBanner: {
    backgroundColor: C.entry,
  },
  typeBannerText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  statusPill: {
    borderRadius: R.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  // Route info
  routeBox: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: R.lg,
    padding: 16,
    gap: 2,
    ...Shdw.card,
  },
  routeCode: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  branchName: {
    fontSize: 14,
    color: C.textSub,
  },
  controlDate: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 2,
  },

  // Observations
  obsBox: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: R.lg,
    padding: 16,
    gap: 4,
    ...Shdw.card,
  },
  obsBoxLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  obsBoxText: {
    fontSize: 14,
    color: C.text,
  },
  observationsInput: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    minHeight: 52,
    marginHorizontal: 16,
    marginTop: 12,
  },

  // Section title
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    paddingVertical: 0,
  },
  noResults: {
    textAlign: 'center',
    color: C.textMuted,
    fontSize: 14,
    marginTop: 24,
    paddingHorizontal: 16,
  },

  // Read-only items
  roList: {
    marginHorizontal: 16,
    gap: 10,
  },
  roItem: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 14,
    gap: 8,
    ...Shdw.card,
  },
  roItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    flex: 1,
  },
  roItemCode: {
    fontSize: 12,
    color: C.textMuted,
  },
  roItemQtys: {
    flexDirection: 'row',
    gap: 16,
  },
  roQty: {
    fontSize: 13,
    color: C.textSub,
  },
  roQtyVal: {
    fontWeight: '800',
    color: C.text,
  },
  roItemObs: {
    fontSize: 13,
    color: C.textMuted,
    fontStyle: 'italic',
  },
  emptyItems: {
    color: C.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 16,
  },

  // Sticky bar
  flatList: {
    flex: 1,
  },
  stickyBar: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#172554',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: R.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shdw.float,
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
});
