import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DatePickerModal } from '@/features/stock-controls/components/DatePickerModal';
import { useAuthStore } from '@/store/authStore';
import { getProducts } from '@/features/stock-controls/services/productsApi';
import { createStockControl } from '@/features/stock-controls/services/stockControlApi';
import { RouteSearchModal } from '@/features/stock-controls/components/RouteSearchModal';
import { ProductControlCard } from '@/features/stock-controls/components/ProductControlCard';
import { TodayControlsBar } from '@/features/stock-controls/components/TodayControlsBar';
import { useTodayControls } from '@/features/stock-controls/hooks/useTodayControls';
import { StatusOverlay, type OverlayStatus } from '@/components/ui';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import type {
  Product,
  Route,
  ProductControlValues,
  StockControlType,
} from '@/features/stock-controls/types';
import { C, R, Shdw } from '@/lib/theme';

const EMPTY_PRODUCT_VALUES: ProductControlValues = {
  full: { bundles: 0, looseUnits: 0, totalUnits: 0 },
  total: { bundles: 0, looseUnits: 0, totalUnits: 0 },
  exchanges: 0,
  observations: '',
};

function buildItems(
  products: Product[],
  formValues: Record<string, ProductControlValues>
) {
  return products
    .map((product) => {
      const values = formValues[product.id] ?? EMPTY_PRODUCT_VALUES;
      const { full, total, exchanges, observations } = values;

      if (total.totalUnits === 0 && full.totalUnits === 0 && exchanges === 0) {
        return null;
      }

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

function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function computeDefaultDate(type: StockControlType): Date {
  const date = new Date();
  if (type === 'EXIT') {
    date.setDate(date.getDate() + 1);
    if (date.getDay() === 0) date.setDate(date.getDate() + 1); // domingo → lunes
  }
  return date;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDisplayDate(date: Date): string {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${days[date.getDay()]} ${d}/${m}/${date.getFullYear()}`;
}

// Header component defined outside to avoid FlatList remount issues
type FormHeaderProps = {
  controlType: StockControlType;
  selectedRoute: Route | null;
  onOpenRouteModal: () => void;
  truckOrdered: boolean;
  onTruckOrderedChange: (v: boolean) => void;
  observations: string;
  onObservationsChange: (v: string) => void;
  controlDate: Date;
  onControlDateChange: (date: Date) => void;
  productSearch: string;
  onProductSearchChange: (v: string) => void;
};

const FormHeader = React.memo(
  ({
    controlType,
    selectedRoute,
    onOpenRouteModal,
    truckOrdered,
    onTruckOrderedChange,
    observations,
    onObservationsChange,
    controlDate,
    onControlDateChange,
    productSearch,
    onProductSearchChange,
  }: FormHeaderProps) => {
    const isExit = controlType === 'EXIT';
    const [showDatePicker, setShowDatePicker] = useState(false);

    return (
      <View style={styles.formHeader}>
        <View style={[styles.typeBanner, isExit ? styles.exitBanner : styles.entryBanner]}>
          <Text style={styles.typeBannerText}>
            {isExit ? '↗ Control de Salida' : '↙ Control de Entrada'}
          </Text>
        </View>

        {/* Date selector */}
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={18} color={C.textMuted} />
          <View style={styles.dateSelectorText}>
            <Text style={styles.dateLabel}>
              {isExit ? 'Fecha de salida' : 'Fecha del control'}
            </Text>
            <Text style={styles.dateValue}>{toDisplayDate(controlDate)}</Text>
          </View>
          <Text style={styles.dateChevron}>›</Text>
        </TouchableOpacity>

        <DatePickerModal
          visible={showDatePicker}
          value={controlDate}
          onChange={(date) => {
            onControlDateChange(date);
            setShowDatePicker(false);
          }}
          onClose={() => setShowDatePicker(false)}
        />

        {/* Route selector */}
        <TouchableOpacity style={styles.routeSelector} onPress={onOpenRouteModal} activeOpacity={0.7}>
          {selectedRoute ? (
            <View>
              <Text style={styles.routeLabel}>Reparto seleccionado</Text>
              <Text style={styles.routeCode}>{selectedRoute.code}</Text>
              <Text style={styles.routeDetail}>
                {selectedRoute.branchName}
                {selectedRoute.driverName ? ` · ${selectedRoute.driverName}` : ''}
              </Text>
            </View>
          ) : (
            <Text style={styles.routePlaceholder}>Seleccionar Reparto ›</Text>
          )}
        </TouchableOpacity>

        {/* Truck ordered */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Camión ordenado</Text>
          <Switch
            value={truckOrdered}
            onValueChange={onTruckOrderedChange}
            trackColor={{ true: C.primary }}
          />
        </View>

        {/* Observations */}
        <TextInput
          style={styles.observationsInput}
          placeholder="Observaciones generales (opcional)"
          placeholderTextColor={C.textMuted}
          value={observations}
          onChangeText={onObservationsChange}
          multiline
        />

        <Text style={styles.productsTitle}>Productos</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar producto..."
            placeholderTextColor={C.textMuted}
            value={productSearch}
            onChangeText={onProductSearchChange}
            autoCorrect={false}
            returnKeyType="search"
          />
          {productSearch.length > 0 && (
            <TouchableOpacity
              onPress={() => onProductSearchChange('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
);
FormHeader.displayName = 'FormHeader';

export default function NewControlScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const controlType = (type ?? 'EXIT') as StockControlType;
  const router = useRouter();
  const { user } = useAuthStore();
  const keyboardHeight = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  const today = useTodayControls(user?.id);
  const keyboardVisible = keyboardHeight > 0;
  const listPaddingBottom = keyboardVisible
    ? (Platform.OS === 'android' ? 24 + keyboardHeight : 24)
    : 96 + insets.bottom;

  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [truckOrdered, setTruckOrdered] = useState(true);
  const [observations, setObservations] = useState('');
  const [controlDate, setControlDate] = useState<Date>(() => computeDefaultDate(controlType));

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const [formValues, setFormValues] = useState<Record<string, ProductControlValues>>({});
  const [submitting, setSubmitting] = useState(false);
  // Se incrementa al guardar para re-montar los ProductControlCard y limpiar sus inputs.
  const [formKey, setFormKey] = useState(0);
  const [overlay, setOverlay] = useState<{
    visible: boolean;
    status: OverlayStatus;
    title?: string;
    message?: string;
  }>({ visible: false, status: 'loading' });

  function resetForm() {
    const cleared: Record<string, ProductControlValues> = {};
    products.forEach((p) => {
      cleared[p.id] = EMPTY_PRODUCT_VALUES;
    });
    setFormValues(cleared);
    setObservations('');
    setSelectedRoute(null);
    setTruckOrdered(true);
    setControlDate(computeDefaultDate(controlType));
    setFormKey((k) => k + 1);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await getProducts();
      setProducts(data);
      const initial: Record<string, ProductControlValues> = {};
      data.forEach((p) => {
        initial[p.id] = EMPTY_PRODUCT_VALUES;
      });
      setFormValues(initial);
    } catch (e) {
      setProductsError(e instanceof Error ? e.message : 'Error al cargar productos');
    } finally {
      setProductsLoading(false);
    }
  }

  const handleProductChange = useCallback(
    (productId: string, values: ProductControlValues) => {
      setFormValues((prev) => ({ ...prev, [productId]: values }));
    },
    []
  );

  const handleOpenRouteModal = useCallback(() => setRouteModalVisible(true), []);
  const handleCloseRouteModal = useCallback(() => setRouteModalVisible(false), []);

  const handleSelectRoute = useCallback((route: Route) => {
    setSelectedRoute(route);
    setRouteModalVisible(false);
  }, []);

  async function handleSubmit() {
    if (!selectedRoute) {
      Alert.alert('Falta reparto', 'Seleccioná un reparto antes de enviar');
      return;
    }

    if (!user) return;

    const items = buildItems(products, formValues);

    if (items.length === 0) {
      Alert.alert('Sin productos', 'Ingresá cantidades para al menos un producto');
      return;
    }

    setSubmitting(true);
    setOverlay({ visible: true, status: 'loading', title: 'Guardando control...' });
    try {
      await createStockControl({
        type: controlType,
        branchId: selectedRoute.branchId,
        routeId: selectedRoute.id,
        controllerId: user.id,
        controlDate: toDateString(controlDate),
        truckOrdered,
        observations: observations.trim() || undefined,
        items,
      });

      today.reload();
      setOverlay({
        visible: true,
        status: 'success',
        title: '¡Control registrado!',
        message: `Control de ${controlType === 'EXIT' ? 'salida' : 'entrada'} guardado para el reparto ${selectedRoute.code}. Podés cargar el siguiente.`,
      });
      setTimeout(() => {
        setOverlay((o) => ({ ...o, visible: false }));
        resetForm();
      }, 1500);
    } catch (e) {
      setOverlay({
        visible: true,
        status: 'error',
        title: 'No se pudo guardar',
        message: e instanceof Error ? e.message : 'Intentá de nuevo',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (productsLoading) {
    return (
      <>
        <Stack.Screen options={{ title: controlType === 'EXIT' ? 'Control de Salida' : 'Control de Entrada' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      </>
    );
  }

  if (productsError) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{productsError}</Text>
          <TouchableOpacity onPress={loadProducts} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const title = controlType === 'EXIT' ? 'Control de Salida' : 'Control de Entrada';

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
        <TodayControlsBar
          controls={today.controls}
          pending={today.pending}
          accepted={today.accepted}
        />
        <FlatList
          style={styles.flatList}
          data={filteredProducts}
          keyExtractor={(item) => `${item.id}-${formKey}`}
          renderItem={({ item }) => (
            <ProductControlCard
              product={item}
              initialValues={formValues[item.id] ?? EMPTY_PRODUCT_VALUES}
              onChange={handleProductChange}
              controlType={controlType}
            />
          )}
          ListHeaderComponent={
            <FormHeader
              controlType={controlType}
              selectedRoute={selectedRoute}
              onOpenRouteModal={handleOpenRouteModal}
              truckOrdered={truckOrdered}
              onTruckOrderedChange={setTruckOrdered}
              observations={observations}
              onObservationsChange={setObservations}
              controlDate={controlDate}
              onControlDateChange={setControlDate}
              productSearch={productSearch}
              onProductSearchChange={setProductSearch}
            />
          }
          ListEmptyComponent={
            searchQuery ? (
              <Text style={styles.noResults}>
                Sin resultados para “{productSearch.trim()}”
              </Text>
            ) : null
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, { paddingBottom: listPaddingBottom }]}
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
                <Text style={styles.submitText}>Guardar Control</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <RouteSearchModal
          visible={routeModalVisible}
          onSelect={handleSelectRoute}
          onClose={handleCloseRouteModal}
        />

        <StatusOverlay
          visible={overlay.visible}
          status={overlay.status}
          title={overlay.title}
          message={overlay.message}
          onDismiss={() => setOverlay((o) => ({ ...o, visible: false }))}
        />
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
  loadingText: {
    marginTop: 12,
    color: C.textMuted,
    fontSize: 15,
  },
  errorText: {
    color: C.danger,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 14,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: C.primary,
    borderRadius: R.md,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  formHeader: {
    padding: 12,
    gap: 9,
  },
  typeBanner: {
    borderRadius: R.md,
    paddingVertical: 11,
    paddingHorizontal: 16,
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
    fontWeight: '700',
  },

  dateSelector: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateSelectorText: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  dateChevron: {
    fontSize: 20,
    color: C.border,
  },

  routeSelector: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  routeLabel: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  routeCode: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  routeDetail: {
    fontSize: 13,
    color: C.textSub,
    marginTop: 2,
  },
  routePlaceholder: {
    fontSize: 15,
    color: C.primary,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 2,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: C.border,
  },
  switchLabel: {
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
  },

  observationsInput: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
    minHeight: 46,
  },

  productsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 2,
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
    marginTop: 4,
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

  flatList: {
    flex: 1,
  },
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
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: R.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shdw.float,
  },
  submitDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
