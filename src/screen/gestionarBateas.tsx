import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';

import { bateasAPI, choferesAPI, tractoresAPI } from '../api/apiClient';
import { Batea, Chofer, EstadoBatea, Tractor } from '../types/chofer';

interface FormState {
  batea_id: string;
  marca: string;
  modelo: string;
  patente: string;
  seguro: string;
  transportista: string;
  carga_max_batea: string;
  estado: string;
  tractor_id: string;
  chofer_id: string;
}

export const GestionarBateas = () => {
  const [bateas, setBateas] = useState<Batea[]>([]);
  const [tractores, setTractores] = useState<Tractor[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalDetallesVisible, setModalDetallesVisible] = useState(false);

  const [editando, setEditando] = useState(false);

  const [searchText, setSearchText] = useState('');

  const [bateaSeleccionada, setBateaSeleccionada] =
    useState<Batea | null>(null);

  const initialForm: FormState = {
    batea_id: '',
    marca: '',
    modelo: '',
    patente: '',
    seguro: '',
    transportista: '',
    carga_max_batea: '',
    estado: '',
    tractor_id: '',
    chofer_id: '',
  };

  const [form, setForm] = useState<FormState>(initialForm);

  useEffect(() => {
    cargarBateas();
    cargarTractores();
    cargarChoferes();
  }, []);

  const cargarBateas = async () => {
    setLoading(true);

    try {
      const response = await bateasAPI.obtenerTodos();

      console.log('Bateas cargadas:', response.data);

      setBateas(response.data || []);
    } catch (error: any) {
      console.error('Error al cargar bateas:', error);

      if (error.response?.status === 500) {
        setBateas([]);
      } else {
        Alert.alert('Error', 'No se pudieron cargar las bateas');
      }
    } finally {
      setLoading(false);
    }
  };

  const cargarTractores = async () => {
    try {
      const response = await tractoresAPI.obtenerTodos();
      setTractores(response.data || []);
    } catch (error: any) {
      console.error('Error al cargar tractores:', error);
      setTractores([]);
    }
  };

  const cargarChoferes = async () => {
    try {
      const response = await choferesAPI.obtenerTodos();
      setChoferes(response.data || []);
    } catch (error: any) {
      console.error('Error al cargar choferes:', error);
      setChoferes([]);
    }
  };

  const abrirModalCrear = () => {
    setForm(initialForm);
    setEditando(false);
    setBateaSeleccionada(null);
    setModalVisible(true);
  };

  const abrirModalEditar = (batea: Batea) => {
    setForm({
      batea_id: batea.batea_id || '',
      marca: batea.marca || '',
      modelo: batea.modelo || '',
      patente: batea.patente || '',
      seguro: batea.seguro || '',
      transportista: batea.transportista || '',
      carga_max_batea: batea.carga_max_batea?.toString() || '',
      estado: batea.estado || '',
      tractor_id: batea.tractor_id || '',
      chofer_id: batea.chofer_id || '',
    });

    setEditando(true);
    setBateaSeleccionada(batea);
    setModalVisible(true);
  };

  const guardarBatea = async () => {
    console.log('========== GUARDAR BATEA ==========');

    if (!form.patente.trim() || !form.carga_max_batea.trim()) {
      Alert.alert(
        'Error',
        'Patente y carga máxima son obligatorios',
      );

      return;
    }

    setLoading(true);

    try {
      // Construir objeto dinámico - solo incluir campos con valores
      const data: any = {
        patente: form.patente.trim().toUpperCase(),
        carga_max_batea: parseFloat(form.carga_max_batea.replace(',', '.')),
      };

      // Añadir campos opcionales solo si tienen valor
      if (form.marca.trim()) {
        data.marca = form.marca.trim();
      }

      if (form.modelo.trim()) {
        data.modelo = form.modelo.trim();
      }

      if (form.seguro.trim()) {
        data.seguro = form.seguro.trim();
      }

      if (form.transportista.trim()) {
        data.transportista = form.transportista.trim();
      }

      if (form.estado) {
        data.estado = form.estado;
      }

      if (form.tractor_id) {
        data.tractor_id = form.tractor_id;
      }

      if (form.chofer_id) {
        data.chofer_id = form.chofer_id;
      }

      console.log('Datos enviados:', data);

      if (editando && bateaSeleccionada?.batea_id) {
        await bateasAPI.actualizar(
          bateaSeleccionada.batea_id,
          data,
        );

        Alert.alert('Éxito', 'Batea actualizada correctamente');
      } else {
        await bateasAPI.crear(data);

        Alert.alert('Éxito', 'Batea creada correctamente');
      }

      setModalVisible(false);
      setForm(initialForm);
      await cargarBateas();
    } catch (error: any) {
      if (error.response && (error.response.status === 400 || error.response.status === 409)) {
        console.log('Intento de guardar duplicado o inválido:', error.response.data?.message);
      } else {
        console.error('ERROR AL GUARDAR:', error);
      }

      let errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Error desconocido';
      if (Array.isArray(errorMessage)) errorMessage = errorMessage.join('\n');
      errorMessage = String(errorMessage);

      if (Platform.OS === 'web') {
        window.alert('Error al guardar: ' + errorMessage);
      } else {
        Alert.alert('Error al guardar', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const eliminarBatea = (batea_id: string) => {
    const onConfirmar = async () => {
      setLoading(true);
      try {
        await bateasAPI.eliminar(batea_id);
        if (Platform.OS === 'web') window.alert('Éxito: Batea eliminada');
        else Alert.alert('Éxito', 'Batea eliminada');
        await cargarBateas();
      } catch (error: any) {
        console.error(error);
        const msg = error.response?.data?.message || 'No se pudo eliminar la batea';
        let errorMessage = Array.isArray(msg) ? msg.join('\n') : String(msg);
        if (Platform.OS === 'web') {
          window.alert('Error: ' + errorMessage);
        } else {
          Alert.alert('Error', errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const seguro = window.confirm('¿Estás seguro de que deseas eliminar esta batea?');
      if (seguro) onConfirmar();
    } else {
      Alert.alert('Eliminar', '¿Estás seguro?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: onConfirmar },
      ]);
    }
  };

  const abrirModalDetalles = async (batea: Batea) => {
    try {
      const response = await bateasAPI.obtenerPorId(
        batea.batea_id,
      );

      setBateaSeleccionada(response.data);
    } catch (error) {
      console.error(error);

      setBateaSeleccionada(batea);
    }

    setModalDetallesVisible(true);
  };

  const bateasFiltradas = bateas.filter((b) =>
    b.patente
      ?.toLowerCase()
      .includes(searchText.toLowerCase()),
  );

  const renderBatea = ({ item }: { item: Batea }) => (
    <TouchableOpacity
      style={styles.bateaItem}
      onPress={() => abrirModalDetalles(item)}
      activeOpacity={0.7}
    >
      <View style={styles.bateaInfo}>
        <Text style={styles.bateaPatente}>
          {item.patente}
        </Text>

        <Text style={styles.bateaDetalle}>
          {item.marca || 'Sin marca'} {item.modelo || ''}
        </Text>

        <Text style={styles.bateaDetalle}>
          Carga: {item.carga_max_batea}t • Estado:{' '}
          {item.estado || 'Sin estado'}
        </Text>
      </View>

      <View style={styles.bateaAcciones}>
        <TouchableOpacity
          style={styles.btnEditar}
          onPress={(e) => {
            e.stopPropagation();
            abrirModalEditar(item);
          }}
        >
          <Text style={styles.btnTexto}>✏️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnEliminar}
          onPress={(e) => {
            e.stopPropagation();
            eliminarBatea(item.batea_id);
          }}
        >
          <Text style={styles.btnTexto}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Gestionar Bateas
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={styles.btnCrear}
          onPress={abrirModalCrear}
        >
          <Text style={styles.btnCrearTexto}>
            + Agregar Batea
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por patente..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#666"
        />

        {loading && (
          <ActivityIndicator
            size="large"
            color="#007AFF"
          />
        )}

        <FlatList
          data={bateasFiltradas}
          renderItem={renderBatea}
          keyExtractor={(item) => item.batea_id}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No hay bateas
            </Text>
          }
        />
      </ScrollView>

      {/* MODAL CREAR / EDITAR */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setModalVisible(false)
        }
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editando
                ? 'Editar Batea'
                : 'Nueva Batea'}
            </Text>

            {editando && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>ID Batea:</Text>
                <Text style={styles.infoValue}>{form.batea_id}</Text>
              </View>
            )}

            <Text style={styles.label}>Marca (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Marca (opcional)"
              value={form.marca}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  marca: text,
                })
              }
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>Modelo (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Modelo (opcional)"
              value={form.modelo}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  modelo: text,
                })
              }
              placeholderTextColor="#666"
            />

            <Text style={styles.labelRequired}>
              Patente <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Patente"
              value={form.patente}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  patente: text,
                })
              }
              autoCapitalize="characters"
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>Seguro (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Seguro (opcional)"
              value={form.seguro}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  seguro: text,
                })
              }
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>Transportista (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Transportista (opcional)"
              value={form.transportista}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  transportista: text,
                })
              }
              placeholderTextColor="#666"
            />

            <Text style={styles.labelRequired}>
              Carga Máxima (toneladas) <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Carga Máxima (toneladas)"
              value={form.carga_max_batea}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  carga_max_batea: text,
                })
              }
              keyboardType="numeric"
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>
              Estado (opcional)
            </Text>

            <View style={styles.pickerContainer}>
              {/* ESTADO */}

              <Picker
                selectedValue={form.estado}
                onValueChange={(value: string) =>
                  setForm({
                    ...form,
                    estado: value,
                  })
                }
                style={styles.picker}
              >
                <Picker.Item
                  label="Sin estado"
                  value=""
                />

                <Picker.Item
                  label="Vacío"
                  value={EstadoBatea.VACIO}
                />

                <Picker.Item
                  label="Cargado"
                  value={EstadoBatea.CARGADO}
                />

                <Picker.Item
                  label="En Reparación"
                  value={EstadoBatea.EN_REPARACION}
                />
              </Picker>
            </View>

              {/* TRACTOR */}

              <Text style={styles.label}>
                Tractor Asignado (opcional)
              </Text>

              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.tractor_id}
                  onValueChange={(value: string) =>
                    setForm({
                      ...form,
                      tractor_id: value,
                    })
                  }
                  style={styles.picker}
                >
                  <Picker.Item
                    label="Sin asignar"
                    value=""
                  />

                  {tractores
                    .filter((t) => {
                      const cargaMaxForm = parseInt(form.carga_max_batea || '0');
                      const tractorCarga = t.carga_max_tractor;
                      return (
                        t.estado_tractor === 'libre' &&
                        tractorCarga >= cargaMaxForm &&
                        (t.tractor_id === form.tractor_id ||
                          !t.batea_id)
                      );
                    })
                    .map((tractor) => (
                      <Picker.Item
                        key={tractor.tractor_id}
                        label={`${tractor.patente} - ${tractor.marca} (${tractor.carga_max_tractor}t)`}
                        value={tractor.tractor_id}
                      />
                    ))}
                </Picker>
              </View>

              {/* CHOFER */}

              <Text style={styles.label}>
                Chofer Asignado (opcional)
              </Text>

              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.chofer_id}
                  onValueChange={(value: string) =>
                    setForm({
                      ...form,
                      chofer_id: value,
                    })
                  }
                  style={styles.picker}
                >
                  <Picker.Item
                    label="Sin asignar"
                    value=""
                  />

                  {choferes.map((chofer) => (
                    <Picker.Item
                      key={chofer.id_chofer}
                      label={`${chofer.nombre_completo} (${chofer.estado_chofer})`}
                      value={chofer.id_chofer}
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.modalBotones}>
                <TouchableOpacity
                  style={styles.btnGuardar}
                  onPress={guardarBatea}
                  disabled={loading}
                >
                  <Text style={styles.btnTexto}>
                    {loading
                      ? 'Guardando...'
                      : 'Guardar'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnCancelar}
                  onPress={() =>
                    setModalVisible(false)
                  }
                >
                  <Text style={styles.btnTexto}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
        </ScrollView>
      </Modal>

      {/* MODAL DETALLES */}

      <Modal
        visible={modalDetallesVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setModalDetallesVisible(false)
        }
      >
        <View
          style={styles.modalDetallesContainer}
        >
          <View
            style={styles.modalDetallesContent}
          >
            <View
              style={styles.modalDetallesHeader}
            >
              <Text
                style={
                  styles.modalDetallesTitulo
                }
              >
                Detalles de la Batea
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setModalDetallesVisible(
                    false,
                  )
                }
                style={styles.btnCerrar}
              >
                <Text
                  style={styles.btnCerrarTexto}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.detallesScroll}
            >
              {bateaSeleccionada && (
                <>
                  <View
                    style={styles.detalleSeccion}
                  >
                    <Text
                      style={
                        styles.detalleSeccionTitulo
                      }
                    >
                      Información General
                    </Text>

                    <View
                      style={styles.detalleItem}
                    >
                      <Text
                        style={
                          styles.detalleLabel
                        }
                      >
                        ID:
                      </Text>

                      <Text
                        style={
                          styles.detalleValor
                        }
                      >
                        {
                          bateaSeleccionada.batea_id
                        }
                      </Text>
                    </View>

                    <View
                      style={styles.detalleItem}
                    >
                      <Text
                        style={
                          styles.detalleLabel
                        }
                      >
                        Marca:
                      </Text>

                      <Text
                        style={
                          styles.detalleValor
                        }
                      >
                        {bateaSeleccionada.marca ||
                          'No especificada'}
                      </Text>
                    </View>

                    <View
                      style={styles.detalleItem}
                    >
                      <Text
                        style={
                          styles.detalleLabel
                        }
                      >
                        Modelo:
                      </Text>

                      <Text
                        style={
                          styles.detalleValor
                        }
                      >
                        {bateaSeleccionada.modelo ||
                          'No especificado'}
                      </Text>
                    </View>

                    <View
                      style={styles.detalleItem}
                    >
                      <Text
                        style={
                          styles.detalleLabel
                        }
                      >
                        Patente:
                      </Text>

                      <Text
                        style={
                          styles.detalleValor
                        }
                      >
                        {
                          bateaSeleccionada.patente
                        }
                      </Text>
                    </View>

                    {bateaSeleccionada.seguro && (
                      <View
                        style={
                          styles.detalleItem
                        }
                      >
                        <Text
                          style={
                            styles.detalleLabel
                          }
                        >
                          Seguro:
                        </Text>

                        <Text
                          style={
                            styles.detalleValor
                          }
                        >
                          {
                            bateaSeleccionada.seguro
                          }
                        </Text>
                      </View>
                    )}

                    {bateaSeleccionada.transportista && (
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>
                          Transportista:
                        </Text>
                        <Text style={styles.detalleValor}>
                          {bateaSeleccionada.transportista}
                        </Text>
                      </View>
                    )}

                    <View
                      style={styles.detalleItem}
                    >
                      <Text
                        style={
                          styles.detalleLabel
                        }
                      >
                        Carga Máxima:
                      </Text>

                      <Text
                        style={
                          styles.detalleValor
                        }
                      >
                        {
                          bateaSeleccionada.carga_max_batea
                        }
                        t
                      </Text>
                    </View>

                    <View
                      style={styles.detalleItem}
                    >
                      <Text
                        style={
                          styles.detalleLabel
                        }
                      >
                        Estado:
                      </Text>

                      <Text
                        style={
                          styles.detalleValor
                        }
                      >
                        {bateaSeleccionada.estado ||
                          'Sin estado'}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },

  btnCrear: {
    backgroundColor: '#28a745',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },

  btnCrearTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
    fontSize: 14,
  },

  bateaItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },

  bateaInfo: {
    flex: 1,
  },

  bateaPatente: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },

  bateaDetalle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },

  bateaAcciones: {
    flexDirection: 'row',
    gap: 8,
  },

  btnEditar: {
    backgroundColor: '#ffc107',
    padding: 8,
    borderRadius: 6,
  },

  btnEliminar: {
    backgroundColor: '#dc3545',
    padding: 8,
    borderRadius: 6,
  },

  btnTexto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 14,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginTop: 'auto',
    paddingBottom: 30,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },

  infoBox: {
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
  },

  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    fontSize: 14,
    color: '#333',
  },

  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    marginBottom: 12,
    overflow: 'hidden',
  },

  picker: {
    height: 50,
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: '#333',
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 4,
  },

  labelRequired: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 4,
  },

  labelRequiredSmall: {
    fontSize: 11,
    fontWeight: '400',
    color: '#dc3545',
  },

  modalBotones: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },

  btnGuardar: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },

  btnCancelar: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },

  modalDetallesContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  modalDetallesContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 20,
  },

  modalDetallesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  modalDetallesTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },

  btnCerrar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  btnCerrarTexto: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },

  detallesScroll: {
    padding: 20,
  },

  detalleSeccion: {
    marginBottom: 24,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },

  detalleSeccionTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },

  detalleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  detalleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },

  detalleValor: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
});
