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
} from 'react-native';
import { bateasAPI, choferesAPI, tractoresAPI } from '../api/apiClient';
import { Batea, Chofer, EstadoBatea, Tractor } from '../types/chofer';

export const GestionarBateas = () => {
  const [bateas, setBateas] = useState<Batea[]>([]);
  const [tractores, setTractores] = useState<Tractor[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalDetallesVisible, setModalDetallesVisible] = useState(false);
  const [bateaSeleccionada, setBateaSeleccionada] = useState<Batea | null>(null);

  const [form, setForm] = useState({
    batea_id: '',
    marca: '',
    modelo: '',
    patente: '',
    seguro: '',
    carga_max_batea: '',
    estado: EstadoBatea.VACIO,
    tractor_id: '',
    chofer_id: '',
  });

  useEffect(() => {
    cargarBateas();
    cargarTractores();
    cargarChoferes();
  }, []);

  const cargarBateas = async () => {
    setLoading(true);
    try {
      const response = await bateasAPI.obtenerTodos();
      console.log('Bateas cargadas exitosamente:', response.data);
      setBateas(response.data || []);
    } catch (error: any) {
      console.error('Error al cargar bateas:', error);
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);

      // Si es error 500, probablemente hay un problema en el backend
      // pero no mostramos alerta molesta, solo dejamos la lista vacía
      if (error.response?.status === 500) {
        console.warn('Error 500 al cargar bateas, dejando lista vacía');
        setBateas([]);
      } else {
        Alert.alert('Error', 'No se pudieron cargar las bateas');
        setBateas([]);
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
      if (error.response?.status !== 404 && error.response?.status !== 500) {
        Alert.alert('Advertencia', 'No se pudieron cargar los tractores. Los selectores estarán vacíos.');
      }
    }
  };

  const cargarChoferes = async () => {
    try {
      const response = await choferesAPI.obtenerTodos();
      setChoferes(response.data || []);
    } catch (error: any) {
      console.error('Error al cargar choferes:', error);
      setChoferes([]);
      if (error.response?.status !== 404 && error.response?.status !== 500) {
        Alert.alert('Advertencia', 'No se pudieron cargar los choferes. Los selectores estarán vacíos.');
      }
    }
  };

  const abrirModalCrear = () => {
    setForm({
      batea_id: '',
      marca: '',
      modelo: '',
      patente: '',
      seguro: '',
      carga_max_batea: '',
      estado: EstadoBatea.VACIO,
      tractor_id: '',
      chofer_id: '',
    });
    setEditando(false);
    setModalVisible(true);
  };

  const abrirModalEditar = (batea: Batea) => {
    setForm({
      batea_id: batea.batea_id,
      marca: batea.marca,
      modelo: batea.modelo,
      patente: batea.patente,
      seguro: batea.seguro || '',
      carga_max_batea: batea.carga_max_batea?.toString() || '',
      estado: batea.estado,
      tractor_id: batea.tractor_id || '',
      chofer_id: batea.chofer_id || '',
    });
    setEditando(true);
    setModalVisible(true);
  };

  const guardarBatea = async () => {
    console.log('========== GUARDAR BATEA ==========');
    console.log('Datos del formulario:', form);

    if (
      !form.batea_id.trim() ||
      !form.marca.trim() ||
      !form.modelo.trim() ||
      !form.patente.trim() ||
      !form.carga_max_batea.trim()
    ) {
      console.log('ERROR: Campos incompletos');
      Alert.alert('Error', 'Completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const data = {
        marca: form.marca,
        modelo: form.modelo,
        patente: form.patente,
        seguro: form.seguro || null,
        carga_max_batea: parseInt(form.carga_max_batea),
        estado: form.estado,
        tractor_id: form.tractor_id || null,
        chofer_id: form.chofer_id || null,
      };

      console.log('Editando:', editando);
      console.log('Datos a enviar:', JSON.stringify(data, null, 2));

      if (editando) {
        console.log('Actualizando batea con ID:', form.batea_id);
        const response = await bateasAPI.actualizar(form.batea_id, data);
        console.log('Respuesta del servidor (actualizar):', response.data);
        Alert.alert('Éxito', 'Batea actualizada');
      } else {
        const payload = {
          batea_id: form.batea_id,
          ...data,
        };
        console.log('Creando nueva batea. Payload completo:', JSON.stringify(payload, null, 2));
        const response = await bateasAPI.crear(payload);
        console.log('Respuesta del servidor (crear):', response.data);
        Alert.alert('Éxito', 'Batea creada');
      }
      setModalVisible(false);

      // Intentar recargar las bateas, pero no fallar si hay error
      try {
        await cargarBateas();
      } catch (reloadError) {
        console.warn('No se pudieron recargar las bateas después de guardar:', reloadError);
        // No mostrar error al usuario, ya guardó exitosamente
      }
    } catch (error: any) {
      console.error('========== ERROR AL GUARDAR BATEA ==========');
      console.error('Error completo:', error);
      console.error('Error message:', error.message);
      console.error('Error response status:', error.response?.status);
      console.error('Error response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Error response headers:', error.response?.headers);
      console.error('Error config:', error.config);
      console.error('Error config URL:', error.config?.url);
      console.error('Error config method:', error.config?.method);
      console.error('Error config data:', error.config?.data);
      console.error('===========================================');

      Alert.alert('Error', error.response?.data?.message || error.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const eliminarBatea = (batea_id: string) => {
    Alert.alert(
      'Eliminar',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await bateasAPI.eliminar(batea_id);
              Alert.alert('Éxito', 'Batea eliminada');
              cargarBateas();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la batea');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const abrirModalDetalles = async (batea: Batea) => {
    try {
      // Cargar la batea completa con sus relaciones desde el backend
      const response = await bateasAPI.obtenerPorId(batea.batea_id);
      setBateaSeleccionada(response.data);
      setModalDetallesVisible(true);
    } catch (error) {
      console.error('Error al cargar detalles de la batea:', error);
      // Si falla, usar los datos que ya tenemos
      setBateaSeleccionada(batea);
      setModalDetallesVisible(true);
    }
  };

  const bateasFiltradas = bateas.filter((b) =>
    b.patente.toLowerCase().includes(searchText.toLowerCase()),
  );

  const renderBatea = ({ item }: { item: Batea }) => (
    <TouchableOpacity
      style={styles.bateaItem}
      onPress={() => abrirModalDetalles(item)}
      activeOpacity={0.7}
    >
      <View style={styles.bateaInfo}>
        <Text style={styles.bateaPatente}>{item.patente}</Text>
        <Text style={styles.bateaDetalle}>
          {item.marca} {item.modelo}
        </Text>
        <Text style={styles.bateaDetalle}>
          Carga: {item.carga_max_batea}t • Estado: {item.estado}
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
        <Text style={styles.title}>Gestionar Bateas</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity style={styles.btnCrear} onPress={abrirModalCrear}>
          <Text style={styles.btnCrearTexto}>+ Agregar Batea</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por patente..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#666"
        />

        {loading && <ActivityIndicator size="large" color="#007AFF" />}

        <FlatList
          data={bateasFiltradas}
          renderItem={renderBatea}
          keyExtractor={(item) => item.batea_id}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay bateas</Text>
          }
        />
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editando ? 'Editar Batea' : 'Nueva Batea'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="ID Batea"
              value={form.batea_id}
              onChangeText={(text) => setForm({ ...form, batea_id: text })}
              editable={!editando}
              placeholderTextColor="#666"
            />

            <TextInput
              style={styles.input}
              placeholder="Marca"
              value={form.marca}
              onChangeText={(text) => setForm({ ...form, marca: text })}
              placeholderTextColor="#666"
            />

            <TextInput
              style={styles.input}
              placeholder="Modelo"
              value={form.modelo}
              onChangeText={(text) => setForm({ ...form, modelo: text })}
              placeholderTextColor="#666"
            />

            <TextInput
              style={styles.input}
              placeholder="Patente"
              value={form.patente}
              onChangeText={(text) => setForm({ ...form, patente: text })}
              placeholderTextColor="#666"
            />

            <TextInput
              style={styles.input}
              placeholder="Seguro (opcional)"
              value={form.seguro}
              onChangeText={(text) => setForm({ ...form, seguro: text })}
              placeholderTextColor="#666"
            />

            <TextInput
              style={styles.input}
              placeholder="Carga Máxima (toneladas)"
              value={form.carga_max_batea}
              onChangeText={(text) =>
                setForm({ ...form, carga_max_batea: text })
              }
              keyboardType="numeric"
              placeholderTextColor="#666"
            />

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.estado}
                onValueChange={(value) =>
                  setForm({ ...form, estado: value })
                }
                style={styles.picker}
              >
                <Picker.Item label="Vacío" value={EstadoBatea.VACIO} />
                <Picker.Item label="Cargado" value={EstadoBatea.CARGADO} />
                <Picker.Item
                  label="En Reparación"
                  value={EstadoBatea.EN_REPARACION}
                />
              </Picker>
            </View>

            <Text style={styles.label}>Tractor Asignado (opcional)</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.tractor_id}
                onValueChange={(value) =>
                  setForm({ ...form, tractor_id: value })
                }
                style={styles.picker}
              >
                <Picker.Item label="Sin asignar" value="" />
                {tractores
                  .filter(t =>
                    // Tractor debe estar libre
                    t.estado_tractor === 'libre' &&
                    // Tractor debe tener capacidad suficiente
                    t.carga_max_tractor >= parseInt(form.carga_max_batea || '0') &&
                    // Permitir el tractor actualmente asignado (para no perderlo al editar)
                    (t.tractor_id === form.tractor_id || !t.batea_id)
                  )
                  .map((tractor) => (
                    <Picker.Item
                      key={tractor.tractor_id}
                      label={`${tractor.patente} - ${tractor.marca} (${tractor.carga_max_tractor}t)`}
                      value={tractor.tractor_id}
                    />
                  ))}
              </Picker>
            </View>

            <Text style={styles.label}>Chofer Asignado (opcional)</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.chofer_id}
                onValueChange={(value) =>
                  setForm({ ...form, chofer_id: value })
                }
                style={styles.picker}
              >
                <Picker.Item label="Sin asignar" value="" />
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
                  {loading ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnTexto}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Modal>

      <Modal
        visible={modalDetallesVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalDetallesVisible(false)}
      >
        <View style={styles.modalDetallesContainer}>
          <View style={styles.modalDetallesContent}>
            <View style={styles.modalDetallesHeader}>
              <Text style={styles.modalDetallesTitulo}>Detalles de la Batea</Text>
              <TouchableOpacity
                onPress={() => setModalDetallesVisible(false)}
                style={styles.btnCerrar}
              >
                <Text style={styles.btnCerrarTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detallesScroll}>
              {bateaSeleccionada && (
                <>
                  <View style={styles.detalleSeccion}>
                    <Text style={styles.detalleSeccionTitulo}>Información General</Text>
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>ID:</Text>
                      <Text style={styles.detalleValor}>{bateaSeleccionada.batea_id}</Text>
                    </View>
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>Marca:</Text>
                      <Text style={styles.detalleValor}>{bateaSeleccionada.marca}</Text>
                    </View>
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>Modelo:</Text>
                      <Text style={styles.detalleValor}>{bateaSeleccionada.modelo}</Text>
                    </View>
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>Patente:</Text>
                      <Text style={styles.detalleValor}>{bateaSeleccionada.patente}</Text>
                    </View>
                    {bateaSeleccionada.seguro && (
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Seguro:</Text>
                        <Text style={styles.detalleValor}>{bateaSeleccionada.seguro}</Text>
                      </View>
                    )}
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>Carga Máxima:</Text>
                      <Text style={styles.detalleValor}>{bateaSeleccionada.carga_max_batea ?? 'N/A'}t</Text>
                    </View>
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>Estado:</Text>
                      <Text style={styles.detalleValor}>{bateaSeleccionada.estado}</Text>
                    </View>
                  </View>

                  {bateaSeleccionada.tractor ? (
                    <View style={styles.detalleSeccion}>
                      <Text style={styles.detalleSeccionTitulo}>Tractor Asignado</Text>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Marca:</Text>
                        <Text style={styles.detalleValor}>{bateaSeleccionada.tractor.marca}</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Modelo:</Text>
                        <Text style={styles.detalleValor}>{bateaSeleccionada.tractor.modelo}</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Patente:</Text>
                        <Text style={styles.detalleValor}>{bateaSeleccionada.tractor.patente}</Text>
                      </View>
                      {bateaSeleccionada.tractor.seguro && (
                        <View style={styles.detalleItem}>
                          <Text style={styles.detalleLabel}>Seguro:</Text>
                          <Text style={styles.detalleValor}>{bateaSeleccionada.tractor.seguro}</Text>
                        </View>
                      )}
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Carga Máxima:</Text>
                        <Text style={styles.detalleValor}>{bateaSeleccionada.tractor.carga_max_tractor ?? 'N/A'}t</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Estado:</Text>
                        <Text style={styles.detalleValor}>{bateaSeleccionada.tractor.estado_tractor}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.detalleSeccion}>
                      <Text style={styles.detalleSeccionTitulo}>Tractor Asignado</Text>
                      <Text style={styles.detalleNoData}>Sin tractor asignado</Text>
                    </View>
                  )}

                  {bateaSeleccionada.chofer ? (
                    <View style={styles.detalleSeccion}>
                      <Text style={styles.detalleSeccionTitulo}>Chofer Asignado</Text>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>ID:</Text>
                        <Text style={styles.detalleValor}>{bateaSeleccionada.chofer.id_chofer}</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Nombre Completo:</Text>
                        <Text style={styles.detalleValor}>{bateaSeleccionada.chofer.nombre_completo}</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Estado:</Text>
                        <Text style={styles.detalleValor}>{bateaSeleccionada.chofer.estado_chofer}</Text>
                      </View>
                      {bateaSeleccionada.chofer.razon_estado && (
                        <View style={styles.detalleItem}>
                          <Text style={styles.detalleLabel}>Razón del Estado:</Text>
                          <Text style={styles.detalleValor}>{bateaSeleccionada.chofer.razon_estado}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.detalleSeccion}>
                      <Text style={styles.detalleSeccionTitulo}>Chofer Asignado</Text>
                      <Text style={styles.detalleNoData}>Sin chofer asignado</Text>
                    </View>
                  )}
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
  content: {
    flex: 1,
    padding: 16,
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    fontSize: 14,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 4,
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
  detalleNoData: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
});