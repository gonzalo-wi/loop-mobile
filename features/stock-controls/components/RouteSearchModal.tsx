import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import type { Route } from '../types';
import { getAllRoutes } from '../services/routesApi';

type Props = {
  visible: boolean;
  onSelect: (route: Route) => void;
  onClose: () => void;
};

const SEARCH_DEBOUNCE_MS = 300;

export function RouteSearchModal({ visible, onSelect, onClose }: Props) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada búsqueda incrementa el id; solo la respuesta más reciente pisa el estado,
  // así una respuesta lenta de una búsqueda vieja no sobrescribe a la nueva.
  const reqId = useRef(0);

  const loadRoutes = useCallback(async (searchTerm: string) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getAllRoutes(searchTerm);
      if (id === reqId.current) setRoutes(data);
    } catch (e) {
      if (id === reqId.current) {
        setError(e instanceof Error ? e.message : 'Error al cargar repartos');
      }
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  // Recarga desde el backend al abrir y cada vez que cambia el texto (con debounce).
  useEffect(() => {
    if (!visible) return;
    const handle = setTimeout(() => loadRoutes(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [visible, search, loadRoutes]);

  const handleSelect = useCallback(
    (route: Route) => {
      setSearch('');
      onSelect(route);
    },
    [onSelect]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.inner}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Seleccionar Reparto</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por código, sucursal o repartidor..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            autoFocus
            clearButtonMode="while-editing"
            returnKeyType="search"
          />

          {loading && routes.length === 0 ? (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => loadRoutes(search)} style={styles.retryBtn}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={routes}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.6}
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemCode}>{item.code}</Text>
                    <Text style={styles.itemBranch}>{item.branchName}</Text>
                    {item.driverName ? (
                      <Text style={styles.itemDriver}>{item.driverName}</Text>
                    ) : null}
                  </View>
                  {item.truckPlate ? (
                    <Text style={styles.itemPlate}>{item.truckPlate}</Text>
                  ) : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {search ? 'Sin resultados para la búsqueda' : 'No hay repartos disponibles'}
                </Text>
              }
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  closeText: {
    fontSize: 16,
    color: '#007AFF',
  },
  searchInput: {
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#111',
  },
  loader: {
    marginTop: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemLeft: {
    flex: 1,
  },
  itemCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  itemBranch: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  itemDriver: {
    fontSize: 13,
    color: '#888',
    marginTop: 1,
  },
  itemPlate: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 15,
    marginTop: 40,
  },
});
