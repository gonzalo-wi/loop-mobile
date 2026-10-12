import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import {
  BottomBar,
  ColorBlock,
  EmptyState,
  Pill,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
  StatusOverlay,
  type OverlayStatus,
} from '@/components/ui';
import type {
  Product,
  Route,
  ProductControlValues,
  StockControlType,
} from '@/features/stock-controls/types';
import { C, H, R, S, T } from '@/lib/theme';

// Primary button (60) + vertical padding of the bottom bar, so the last card isn't hidden.
const BOTTOM_BAR_SPACE = H.primaryButton + S.md * 2 + S.lg;

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
    const pillTone = isExit ? 'onBlue' : 'onGreen';
    const [showDatePicker, setShowDatePicker] = useState(false);

    return (
      <View style={styles.formHeader}>
        {/* Direction color rule: blue = exit, green = entry */}
        <ColorBlock tone={isExit ? 'blue' : 'green'}>
          <Pill
            label={isExit ? 'Control de Salida' : 'Control de Entrada'}
            icon={isExit ? 'arrow-up' : 'arrow-down'}
            tone={pillTone}
          />

          <Pressable
            style={({ pressed }) => [styles.routeSelector, pressed && styles.pressed]}
            onPress={onOpenRouteModal}
            accessibilityRole="button"
            accessibilityLabel={
              selectedRoute ? `Reparto seleccionado: ${selectedRoute.code}` : 'Seleccionar reparto'
            }
          >
            {selectedRoute ? (
              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>Reparto seleccionado</Text>
                <Text style={styles.routeCode}>{selectedRoute.code}</Text>
                <Text style={styles.routeDetail}>
                  {selectedRoute.branchName}
                  {selectedRoute.driverName ? ` · ${selectedRoute.driverName}` : ''}
                </Text>
              </View>
            ) : (
              <Text style={styles.routePlaceholder}>Seleccionar Reparto</Text>
            )}
            <Ionicons name="chevron-forward" size={H.icon} color={C.ink2} />
          </Pressable>

          <Pill
            label={toDisplayDate(controlDate)}
            icon="calendar-outline"
            tone={pillTone}
            onPress={() => setShowDatePicker(true)}
            accessibilityLabel={`${isExit ? 'Fecha de salida' : 'Fecha del control'}: ${toDisplayDate(controlDate)}`}
          />
        </ColorBlock>

        <DatePickerModal
          visible={showDatePicker}
          value={controlDate}
          onChange={(date) => {
            onControlDateChange(date);
            setShowDatePicker(false);
          }}
          onClose={() => setShowDatePicker(false)}
        />

        {/* Truck ordered */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Camión ordenado</Text>
          <Switch
            value={truckOrdered}
            onValueChange={onTruckOrderedChange}
            trackColor={{ false: C.handle, true: C.navy }}
            thumbColor={C.white}
            accessibilityLabel="Camión ordenado"
          />
        </View>

        {/* Observations */}
        <TextInput
          style={styles.observationsInput}
          placeholder="Observaciones generales (opcional)"
          placeholderTextColor={C.textFaint}
          value={observations}
          onChangeText={onObservationsChange}
          multiline
          accessibilityLabel="Observaciones generales"
        />

        <Text style={styles.productsTitle} accessibilityRole="header">
          Productos
        </Text>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={H.icon} color={C.ink2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar producto..."
            placeholderTextColor={C.textFaint}
            value={productSearch}
            onChangeText={onProductSearchChange}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Buscar producto"
          />
          {productSearch.length > 0 && (
            <Pressable
              style={styles.clearBtn}
              onPress={() => onProductSearchChange('')}
              accessibilityRole="button"
              accessibilityLabel="Borrar búsqueda"
            >
              <Ionicons name="close-circle" size={H.icon} color={C.ink2} />
            </Pressable>
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
  const insets = useSafeAreaInsets();
  const today = useTodayControls(user?.id);
  // The save bar is always visible, so the list always leaves room for it.
  const listPaddingBottom = BOTTOM_BAR_SPACE + insets.bottom;

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

  const title = controlType === 'EXIT' ? 'Control de Salida' : 'Control de Entrada';
  const header = <ScreenHeader title={title} onBack={() => router.back()} />;

  if (productsLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.navy} />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      </View>
    );
  }

  if (productsError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <View style={styles.centered}>
          <EmptyState icon="cloud-offline-outline" title="No se pudieron cargar los productos" hint={productsError} />
          <View style={styles.retryWrap}>
            <SecondaryButton title="Reintentar" icon="refresh" onPress={loadProducts} />
          </View>
        </View>
      </View>
    );
  }

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
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {header}
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
              <EmptyState
                icon="search-outline"
                title={`Sin resultados para “${productSearch.trim()}”`}
                style={styles.empty}
              />
            ) : (
              <EmptyState icon="cube-outline" title="No hay productos para controlar" style={styles.empty} />
            )
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, { paddingBottom: listPaddingBottom }]}
        />

        <BottomBar>
          <View style={styles.flex}>
            <PrimaryButton
              title="Guardar Control"
              icon="checkmark"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
            />
          </View>
        </BottomBar>

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
  container: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1 },
  flatList: { flex: 1 },
  list: { paddingBottom: S.xxl },
  centered: { flex: 1, justifyContent: 'center', padding: S.gutter, gap: S.lg },
  loadingText: { ...T.body, color: C.ink2, textAlign: 'center' },
  retryWrap: { alignSelf: 'center' },
  empty: { marginTop: S.xs, minHeight: 200 },
  pressed: { opacity: 0.8 },

  formHeader: {
    paddingHorizontal: S.gutter,
    paddingTop: S.md,
    paddingBottom: S.sm,
    gap: S.md,
  },

  routeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    minHeight: H.field,
    paddingHorizontal: S.xl,
    paddingVertical: S.md,
    borderRadius: R.field,
    backgroundColor: C.white,
  },
  routeText: { flex: 1 },
  routeLabel: { ...T.secondary, color: C.ink2 },
  routeCode: { ...T.section, color: C.navy, fontVariant: ['tabular-nums'] },
  routeDetail: { ...T.secondary, color: C.ink2 },
  routePlaceholder: { ...T.label, color: C.navy, flex: 1 },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: H.field,
    paddingHorizontal: S.xl,
    borderRadius: R.field,
    backgroundColor: C.white,
  },
  switchLabel: { ...T.label, color: C.navy },

  observationsInput: {
    ...T.body,
    minHeight: H.field,
    paddingHorizontal: S.xl,
    paddingVertical: S.md,
    borderRadius: R.field,
    backgroundColor: C.white,
    color: C.navy,
    textAlignVertical: 'top',
  },

  productsTitle: { ...T.section, color: C.navy, marginTop: S.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    height: H.field,
    paddingLeft: S.xl,
    paddingRight: S.sm,
    borderRadius: R.field,
    backgroundColor: C.white,
  },
  searchInput: {
    flex: 1,
    ...T.data,
    color: C.navy,
    paddingVertical: 0,
  },
  clearBtn: {
    width: H.touch,
    height: H.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
