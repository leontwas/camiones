import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { choferesAPI } from '../api/apiClient';
import { Chofer, EstadoChofer } from '../types/chofer';

export const EstadoChofersScreen = () => {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Chofer[]>([]);
  const [chofer, setChofer] = useState<Chofer | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState(EstadoChofer.DISPONIBLE);
  const [razonEstado, setRazonEstado] = useState('');
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | number | null>(null);

  const buscarChoferes = async (texto: string) => {
    setBusqueda(texto);

    // Limpiar búsqueda anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (texto.trim().length < 1) {
      setResultados([]);
      return;
    }

    // Debounce: esperar 300ms después de que el usuario deja de escribir
    setBuscando(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await choferesAPI.buscarPorApellido(texto);
        setResultados(response.data);
      } catch (error) {
        console.error('Error buscando choferes:', error);
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 300);
  };

  const seleccionarChofer = async (choferSeleccionado: Chofer) => {
    setChofer(choferSeleccionado);
    setNuevoEstado(choferSeleccionado.estado_chofer);
    setResultados([]);
    setBusqueda(choferSeleccionado.nombre_completo);

    // Guardar localmente
    await AsyncStorage.setItem('chofer_id', choferSeleccionado.id_chofer);
  };

  const actualizarEstado = async () => {
    if (!chofer) return;

    setLoading(true);
    try {
      const response = await choferesAPI.actualizarEstado(
        chofer.id_chofer,
        nuevoEstado,
        razonEstado,
      );

      setChofer(response.data);
      Alert.alert('Éxito', `Estado actualizado a: ${nuevoEstado}`);
      setRazonEstado('');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al actualizar',
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cargarChoferId = async () => {
      try {
        const id = await AsyncStorage.getItem('chofer_id');
        if (id) {
          const response = await choferesAPI.obtenerPorId(id);
          setChofer(response.data);
          setBusqueda(response.data.nombre_completo);
          setNuevoEstado(response.data.estado_chofer);
        }
      } catch (error) {
        console.error('Error al cargar chofer inicial desde storage:', error);
        // Si el chofer no existe o el ID es inválido, simplemente no cargamos nada
        await AsyncStorage.removeItem('chofer_id');
      }
    };
    cargarChoferId();
  }, []);

  const renderResultado = ({ item }: { item: Chofer }) => (
    <TouchableOpacity
      style={styles.resultadoItem}
      onPress={() => seleccionarChofer(item)}
    >
      <Text style={styles.resultadoNombre}>{item.nombre_completo}</Text>
      <Text style={styles.resultadoDetalle}>
        ID: {item.id_chofer} • Estado: {item.estado_chofer}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sistema de Control de Choferes</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Buscar Chofer por Apellido</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe el apellido..."
            value={busqueda}
            onChangeText={buscarChoferes}
            editable={!chofer}
          />
          {buscando && <ActivityIndicator color="#007AFF" />}
        </View>

        {/* Lista de resultados */}
        {resultados.length > 0 && !chofer && (
          <View style={styles.resultadosContainer}>
            <FlatList
              data={resultados}
              renderItem={renderResultado}
              keyExtractor={(item) => item.id_chofer}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Información del chofer seleccionado */}
        {chofer && (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{chofer.nombre_completo}</Text>
              <Text style={styles.infoText}>
                ID: {chofer.id_chofer}
              </Text>
              <Text style={styles.infoText}>
                Tractor: {chofer.tractor?.patente || 'N/A'}
              </Text>
              <Text style={styles.infoText}>
                Batea: {chofer.batea?.patente || 'N/A'}
              </Text>
              <Text style={[styles.infoText, { fontWeight: 'bold', marginTop: 8 }]}>
                Estado actual: {chofer.estado_chofer}
              </Text>
              <Text style={styles.infoTextSmall}>
                Última actualización:{' '}
                {new Date(chofer.ultimo_estado_en).toLocaleString()}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Cambiar Estado</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={nuevoEstado}
                  onValueChange={setNuevoEstado}
                  style={styles.picker}
                >
                  <Picker.Item label="Disponible" value={EstadoChofer.DISPONIBLE} />
                  <Picker.Item label="Cargando" value={EstadoChofer.CARGANDO} />
                  <Picker.Item label="Viajando" value={EstadoChofer.VIAJANDO} />
                  <Picker.Item label="Descansando" value={EstadoChofer.DESCANSANDO} />
                  <Picker.Item label="Descargando" value={EstadoChofer.DESCARGANDO} />
                  <Picker.Item label="Licencia Anual" value={EstadoChofer.LICENCIA_ANUAL} />
                  <Picker.Item label="Franco" value={EstadoChofer.FRANCO} />
                  <Picker.Item label="Equipo en Reparación" value={EstadoChofer.EQUIPO_EN_REPARACION} />
                  <Picker.Item label="Inactivo" value={EstadoChofer.INACTIVO} />
                </Picker>
              </View>

              {(nuevoEstado === EstadoChofer.DESCANSANDO ||
                nuevoEstado === EstadoChofer.FRANCO) && (
                  <TextInput
                    style={styles.input}
                    placeholder="Razón (opcional)"
                    value={razonEstado}
                    onChangeText={setRazonEstado}
                    multiline
                  />
                )}

              <TouchableOpacity
                style={styles.buttonPrimary}
                onPress={actualizarEstado}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Actualizando...' : 'Actualizar Estado'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => {
                  setChofer(null);
                  setBusqueda('');
                  setResultados([]);
                }}
                disabled={loading}
              >
                <Text style={styles.buttonTextSecondary}>Buscar Otro Chofer</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  section: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  resultadosContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
    maxHeight: 250,
  },
  resultadoItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultadoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  resultadoDetalle: {
    fontSize: 13,
    color: '#666',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#6c757d',
    padding: 14,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    marginVertical: 4,
    color: '#666',
  },
  infoTextSmall: {
    fontSize: 12,
    marginVertical: 4,
    color: '#999',
    fontStyle: 'italic',
  },
});