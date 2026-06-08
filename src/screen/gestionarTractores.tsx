import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { bateasAPI, choferesAPI, tractoresAPI } from '../api/apiClient';
import { Batea, Chofer, EstadoChofer, EstadoTractor, Tractor } from '../types/chofer';

export const GestionarTractores = () => {
  const [tractores, setTractores] = useState<Tractor[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [bateas, setBateas] = useState<Batea[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalDetallesVisible, setModalDetallesVisible] = useState(false);
  const [tractorSeleccionado, setTractorSeleccionado] = useState<Tractor | null>(null);

  const [form, setForm] = useState({
    tractor_id: '',
    marca: '',
    modelo: '',
    patente: '',
    seguro: '',
    transportista: '',
    carga_max_tractor: '',
    estado_tractor: EstadoTractor.LIBRE,
    chofer_id: '',
    batea_id: '',
  });

  useEffect(() => {
    cargarTractores();
    cargarChoferes();
    cargarBateas();
  }, []);

  const cargarTractores = async () => {
    setLoading(true);
    try {
      const response = await tractoresAPI.obtenerTodos();
      setTractores(response.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los tractores');
      console.error(error);
    } finally {
      setLoading(false);
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

  const cargarBateas = async () => {
    try {
      const response = await bateasAPI.obtenerTodos();
      setBateas(response.data || []);
    } catch (error: any) {
      console.error('Error al cargar bateas:', error);
      setBateas([]);
      if (error.response?.status !== 404 && error.response?.status !== 500) {
        Alert.alert('Advertencia', 'No se pudieron cargar las bateas. Los selectores estarán vacíos.');
      }
    }
  };

  const abrirModalCrear = () => {
    setForm({
      tractor_id: '',
      marca: '',
      modelo: '',
      patente: '',
      seguro: '',
      transportista: '',
      carga_max_tractor: '',
      estado_tractor: EstadoTractor.LIBRE,
      chofer_id: '',
      batea_id: '',
    });
    setEditando(false);
    setModalVisible(true);
  };

  const abrirModalEditar = (tractor: Tractor) => {
    setForm({
      tractor_id: tractor.tractor_id,
      marca: tractor.marca,
      modelo: tractor.modelo,
      patente: tractor.patente,
      seguro: tractor.seguro || '',
      transportista: tractor.transportista || '',
      carga_max_tractor: tractor.carga_max_tractor?.toString() || '',
      estado_tractor: tractor.estado_tractor,
      chofer_id: tractor.chofer_id || '',
      batea_id: tractor.batea_id || '',
    });
    setEditando(true);
    setModalVisible(true);
  };

  const verificarTractorExiste = async (tractor_id: string): Promise<boolean> => {
    try {
      await tractoresAPI.obtenerPorId(tractor_id);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 500) {
        return false;
      }
      if (!error.response) {
        return false;
      }
      throw error;
    }
  };

  const crearOActualizarTractor = async (sobreescribir: boolean = false) => {
    setLoading(true);
    try {
      const data: any = {
        patente: String(form.patente || '').trim().toUpperCase(),
        carga_max_tractor: parseFloat(String(form.carga_max_tractor).replace(',', '.')),
        marca: form.marca ? String(form.marca).trim() : 'S/M',
        modelo: form.modelo ? String(form.modelo).trim() : 'S/M',
      };

      if (form.seguro) data.seguro = String(form.seguro).trim();
      if (form.transportista) data.transportista = String(form.transportista).trim();
      if (form.estado_tractor) data.estado_tractor = form.estado_tractor;
      if (form.chofer_id) data.chofer_id = form.chofer_id;
      if (form.batea_id) data.batea_id = form.batea_id;

      if (editando || sobreescribir) {
        await tractoresAPI.actualizar(form.tractor_id, data);
        Alert.alert('Éxito', 'Tractor actualizado');
      } else {
        await tractoresAPI.crear(data);
        Alert.alert('Éxito', 'Tractor creado');
      }
      setModalVisible(false);
      cargarTractores();
    } catch (error: any) {
      if (error.response && (error.response.status === 400 || error.response.status === 409)) {
        console.log('Intento de guardar duplicado o inválido:', error.response.data?.message);
      } else {
        console.error('Error completo:', error);
      }
      
      let errorMessage = error.response?.data?.message || error.message || 'Error al guardar';
      if (Array.isArray(errorMessage)) errorMessage = errorMessage.join('\n');
      errorMessage = String(errorMessage);

      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const guardarTractor = async () => {
    if (!String(form.patente || '').trim() || !String(form.carga_max_tractor || '').trim()) {
      Alert.alert('Error', 'Patente y carga máxima son obligatorios');
      return;
    }

    if (editando) {
      crearOActualizarTractor(false);
      return;
    }

    if (!form.tractor_id?.trim()) {
      crearOActualizarTractor(false);
      return;
    }

    try {
      const existe = await verificarTractorExiste(form.tractor_id);

      if (existe) {
        Alert.alert(
          'Tractor existente',
          `Ya existe un tractor con el ID "${form.tractor_id}". ¿Deseas sobreescribirlo?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Sobreescribir',
              style: 'destructive',
              onPress: () => crearOActualizarTractor(true),
            },
          ],
        );
      } else {
        crearOActualizarTractor(false);
      }
    } catch (error: any) {
      console.error('Error al verificar tractor:', error);
      Alert.alert(
        'Error de verificación',
        'No se pudo verificar si el tractor existe. ¿Deseas intentar crear el tractor de todas formas?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Intentar crear',
            onPress: () => crearOActualizarTractor(false),
          },
        ],
      );
    }
  };

  const eliminarTractor = (tractor_id: string) => {
    const onConfirmar = async () => {
      setLoading(true);
      try {
        await tractoresAPI.eliminar(tractor_id);
        if (Platform.OS === 'web') window.alert('Éxito: Tractor eliminado');
        else Alert.alert('Éxito', 'Tractor eliminado');
        cargarTractores();
      } catch (error: any) {
        const msg = error.response?.data?.message || 'No se pudo eliminar el tractor';
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
      const seguro = window.confirm('¿Estás seguro de que deseas eliminar este tractor?');
      if (seguro) onConfirmar();
    } else {
      Alert.alert('Eliminar', '¿Estás seguro?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: onConfirmar },
      ]);
    }
  };

  const abrirModalDetalles = async (tractor: Tractor) => {
    try {
      setTractorSeleccionado(tractor);
      setModalDetallesVisible(true);

      const response = await tractoresAPI.obtenerPorId(tractor.tractor_id);
      const data = response.data;

      const promises = [];

      if (data.chofer_id && !data.chofer) {
        promises.push(
          choferesAPI.obtenerPorId(data.chofer_id)
            .then(res => { data.chofer = res.data; })
            .catch(() => { })
        );
      }

      if (data.batea_id && !data.batea) {
        promises.push(
          bateasAPI.obtenerPorId(data.batea_id)
            .then(res => { data.batea = res.data; })
            .catch(() => { })
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      setTractorSeleccionado({ ...data });
    } catch (error) {
      console.error(error);
    }
  };

  const tractoresFiltrados = tractores.filter((t) =>
    t.patente.toLowerCase().includes(searchText.toLowerCase()),
  );

  const renderTractor = ({ item }: { item: Tractor }) => (
    <TouchableOpacity
      style={styles.tractorItem}
      onPress={() => abrirModalDetalles(item)}
      activeOpacity={0.7}
    >
      <View style={styles.tractorInfo}>
        <Text style={styles.tractorPatente}>{item.patente}</Text>
        <Text style={styles.tractorDetalle}>
          {item.marca} {item.modelo}
        </Text>
        <Text style={styles.tractorDetalle}>
          Carga: {item.carga_max_tractor}t • Estado: {item.estado_tractor}
        </Text>
      </View>
      <View style={styles.tractorAcciones}>
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
            eliminarTractor(item.tractor_id);
          }}
        >
          <Text style={styles.btnTexto}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const choferAsignado = choferes.find((c) => String(c.id_chofer) === String(form.chofer_id));
  const esChoferActivo = choferAsignado
    ? [
        EstadoChofer.CARGANDO,
        EstadoChofer.VIAJANDO,
        EstadoChofer.DESCANSANDO,
        EstadoChofer.DESCARGANDO,
        EstadoChofer.ENTREGA_FINALIZADA,
      ].includes(choferAsignado.estado_chofer)
    : false;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestionar Tractores</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity style={styles.btnCrear} onPress={abrirModalCrear}>
          <Text style={styles.btnCrearTexto}>+ Agregar Tractor</Text>
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
          data={tractoresFiltrados}
          renderItem={renderTractor}
          keyExtractor={(item) => item.tractor_id}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay tractores</Text>
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
              {editando ? 'Editar Tractor' : 'Nuevo Tractor'}
            </Text>

            {editando && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>ID Tractor:</Text>
                <Text style={styles.infoValue}>{form.tractor_id}</Text>
              </View>
            )}

            <Text style={styles.label}>Marca (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Marca (opcional)"
              value={form.marca}
              onChangeText={(text) => setForm({ ...form, marca: text })}
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>Modelo (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Modelo (opcional)"
              value={form.modelo}
              onChangeText={(text) => setForm({ ...form, modelo: text })}
              placeholderTextColor="#666"
            />

            <Text style={styles.labelRequired}>
              Patente <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Patente"
              value={form.patente}
              onChangeText={(text) => setForm({ ...form, patente: text })}
              autoCapitalize="characters"
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>Seguro (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Seguro (opcional)"
              value={form.seguro}
              onChangeText={(text) => setForm({ ...form, seguro: text })}
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>Transportista (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Transportista (opcional)"
              value={form.transportista}
              onChangeText={(text) => setForm({ ...form, transportista: text })}
              placeholderTextColor="#666"
            />

            <Text style={styles.labelRequired}>
              Carga Máxima (toneladas) <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Carga Máxima (toneladas)"
              value={form.carga_max_tractor}
              onChangeText={(text) =>
                setForm({ ...form, carga_max_tractor: text })
              }
              keyboardType="numeric"
              placeholderTextColor="#666"
            />

            <Text style={styles.labelRequired}>
              Estado <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text>
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.estado_tractor}
                onValueChange={(value) =>
                  setForm({ ...form, estado_tractor: value })
                }
                style={styles.picker}
              >
                <Picker.Item label="Libre" value={EstadoTractor.LIBRE} />
                <Picker.Item label="Ocupado" value={EstadoTractor.OCUPADO} />
                <Picker.Item
                  label="En Reparación"
                  value={EstadoTractor.EN_REPARACION}
                />
              </Picker>
            </View>

            {esChoferActivo && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>
                  ⚠️ No es posible modificar los recursos de un chofer con jornada activa.
                </Text>
              </View>
            )}

            <Text style={styles.label}>Chofer Asignado (opcional)</Text>
            <View style={[styles.pickerContainer, esChoferActivo && styles.pickerDisabled]}>
              <Picker
                selectedValue={form.chofer_id}
                onValueChange={(value) =>
                  setForm({ ...form, chofer_id: value })
                }
                style={styles.picker}
                enabled={!esChoferActivo}
              >
                <Picker.Item label="Sin asignar" value="" />
                {choferes
                  .filter(c =>
                    (String(c.id_chofer) === String(form.chofer_id) || !c.tractor_id) &&
                    (c.transportista || '').trim().toLowerCase() === (form.transportista || '').trim().toLowerCase()
                  )
                  .map((chofer) => (
                  <Picker.Item
                    key={chofer.id_chofer}
                    label={`${chofer.nombre_completo} (${chofer.estado_chofer}) • ${chofer.transportista || 'Sin transp.'}`}
                    value={chofer.id_chofer}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Batea Asignada (opcional)</Text>
            <View style={[styles.pickerContainer, esChoferActivo && styles.pickerDisabled]}>
              <Picker
                selectedValue={form.batea_id}
                onValueChange={(value) =>
                  setForm({ ...form, batea_id: value })
                }
                style={styles.picker}
                enabled={!esChoferActivo}
              >
                <Picker.Item label="Sin asignar" value="" />
                {bateas
                  .filter(b => {
                    const mismoTransp = !form.transportista || (b.transportista || '').trim().toLowerCase() === (form.transportista || '').trim().toLowerCase();
                    const sinTractor = !b.tractor_id || String(b.batea_id) === String(form.batea_id);
                    return (
                      b.estado !== 'en_reparacion' &&
                      sinTractor &&
                      mismoTransp
                    );
                  })
                  .map((batea) => (
                  <Picker.Item
                    key={batea.batea_id}
                    label={`${batea.patente} - ${batea.marca} ${batea.modelo} • ${batea.transportista || 'Sin transp.'}`}
                    value={batea.batea_id}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.btnGuardar}
                onPress={guardarTractor}
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
              <Text style={styles.modalDetallesTitulo}>Detalles del Tractor</Text>
              <TouchableOpacity
                onPress={() => setModalDetallesVisible(false)}
                style={styles.btnCerrar}
              >
                <Text style={styles.btnCerrarTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detallesScroll}>
              {tractorSeleccionado && (
                <>
                  <View style={styles.detalleSeccion}>
                    <Text style={styles.detalleSeccionTitulo}>Información General</Text>
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>ID:</Text>
                      <Text style={styles.detalleValor}>{tractorSeleccionado.tractor_id}</Text>
                    </View>
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>Marca:</Text>
                      <Text style={styles.detalleValor}>{tractorSeleccionado.marca}</Text>
                    </View>
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>Modelo:</Text>
                      <Text style={styles.detalleValor}>{tractorSeleccionado.modelo}</Text>
                    </View>
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>Patente:</Text>
                      <Text style={styles.detalleValor}>{tractorSeleccionado.patente}</Text>
                    </View>
                    {tractorSeleccionado.seguro && (
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Seguro:</Text>
                        <Text style={styles.detalleValor}>{tractorSeleccionado.seguro}</Text>
                      </View>
                    )}
                    {tractorSeleccionado.transportista && (
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Transportista:</Text>
                        <Text style={styles.detalleValor}>{tractorSeleccionado.transportista}</Text>
                      </View>
                    )}
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>Carga Máxima:</Text>
                      <Text style={styles.detalleValor}>{tractorSeleccionado.carga_max_tractor ?? 'N/A'}t</Text>
                    </View>
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>Estado:</Text>
                      <Text style={styles.detalleValor}>{tractorSeleccionado.estado_tractor}</Text>
                    </View>
                  </View>

                  {tractorSeleccionado.chofer ? (
                    <View style={styles.detalleSeccion}>
                      <Text style={styles.detalleSeccionTitulo}>Chofer Asignado</Text>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>ID:</Text>
                        <Text style={styles.detalleValor}>{tractorSeleccionado.chofer.id_chofer}</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Nombre:</Text>
                        <Text style={styles.detalleValor}>{tractorSeleccionado.chofer.nombre_completo}</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Estado:</Text>
                        <Text style={styles.detalleValor}>{tractorSeleccionado.chofer.estado_chofer}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.detalleSeccion}>
                      <Text style={styles.detalleSeccionTitulo}>Chofer Asignado</Text>
                      <Text style={styles.detalleNoData}>Sin chofer asignado</Text>
                    </View>
                  )}

                  {tractorSeleccionado.batea ? (
                    <View style={styles.detalleSeccion}>
                      <Text style={styles.detalleSeccionTitulo}>Batea Asignada</Text>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>ID:</Text>
                        <Text style={styles.detalleValor}>{tractorSeleccionado.batea.batea_id}</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Patente:</Text>
                        <Text style={styles.detalleValor}>{tractorSeleccionado.batea.patente}</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Modelo:</Text>
                        <Text style={styles.detalleValor}>{tractorSeleccionado.batea.modelo}</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Estado:</Text>
                        <Text style={styles.detalleValor}>{tractorSeleccionado.batea.estado}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.detalleSeccion}>
                      <Text style={styles.detalleSeccionTitulo}>Batea Asignada</Text>
                      <Text style={styles.detalleNoData}>Sin batea asignada</Text>
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
  tractorItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  tractorInfo: {
    flex: 1,
  },
  tractorPatente: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tractorDetalle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  tractorAcciones: {
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
  detalleNoData: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEBAA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerDisabled: {
    backgroundColor: '#e9ecef',
    opacity: 0.6,
  },
});