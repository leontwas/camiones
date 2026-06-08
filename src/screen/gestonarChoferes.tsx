import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState, useRef } from 'react';
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
import { Batea, Chofer, EstadoChofer, Tractor } from '../types/chofer';

export const GestionarChoferes = () => {
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [tractores, setTractores] = useState<Tractor[]>([]);
  const [bateas, setBateas] = useState<Batea[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalDetallesVisible, setModalDetallesVisible] = useState(false);
  const [choferSeleccionado, setChoferSeleccionado] = useState<Chofer | null>(null);

  const cuil2Ref = useRef<TextInput>(null);
  const cuil3Ref = useRef<TextInput>(null);

  const [form, setForm] = useState({
    id_chofer: '',
    nombre_completo: '',
    estado_chofer: EstadoChofer.DISPONIBLE,
    tractor_id: '',
    batea_id: '',
    cuil1: '',
    cuil2: '',
    cuil3: '',
    transportista: '',
  });

  useEffect(() => {
    cargarChoferes();
    cargarTractores();
    cargarBateas();
  }, []);

  const cargarChoferes = async () => {
    setLoading(true);
    try {
      const response = await choferesAPI.obtenerTodos();
      setChoferes(response.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los choferes');
      console.error(error);
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

  const formatCuil = (cuilText: string | number) => {
    const text = String(cuilText);
    if (!text || text.length < 11) return text;
    return `${text.substring(0, 2)} - ${text.substring(2, 10)} - ${text.substring(10, 11)}`;
  };

  const abrirModalCrear = () => {
    setForm({
      id_chofer: '',
      nombre_completo: '',
      estado_chofer: EstadoChofer.DISPONIBLE,
      tractor_id: '',
      batea_id: '',
      cuil1: '',
      cuil2: '',
      cuil3: '',
      transportista: '',
    });
    setEditando(false);
    setModalVisible(true);
  };

  const abrirModalEditar = (chofer: Chofer) => {
    setForm({
      id_chofer: chofer.id_chofer,
      nombre_completo: chofer.nombre_completo,
      estado_chofer: chofer.estado_chofer,
      tractor_id: chofer.tractor_id || '',
      batea_id: chofer.batea_id || '',
      cuil1: chofer.cuil ? String(chofer.cuil).substring(0, 2) : '',
      cuil2: chofer.cuil ? String(chofer.cuil).substring(2, 10) : '',
      cuil3: chofer.cuil ? String(chofer.cuil).substring(10, 11) : '',
      transportista: chofer.transportista || '',
    });
    setEditando(true);
    setModalVisible(true);
  };

  const guardarChofer = async () => {
    console.log('DATOS A ENVIAR:', form);

    // Validar solo el nombre (el ID se genera automáticamente en el backend)
    if (!form.nombre_completo?.trim()) {
      Alert.alert('Error', 'Debes ingresar el nombre completo del chofer');
      return;
    }

    // Al editar, validar que exista el ID
    if (editando && !form.id_chofer) {
      Alert.alert('Error', 'ID de chofer inválido');
      return;
    }

    setLoading(true);
    try {
      const cuilCompleto = `${form.cuil1}${form.cuil2}${form.cuil3}`;
      const cuilParsed = cuilCompleto.length === 11 ? parseInt(cuilCompleto) : null;

      const data: any = {
        nombre_completo: form.nombre_completo,
        estado_chofer: form.estado_chofer,
        tractor_id: form.tractor_id || null,
        batea_id: form.batea_id || null,
        transportista: form.transportista?.trim() || null,
      };

      if (cuilParsed) {
        data.cuil = cuilParsed;
      } else if (cuilCompleto.length > 0) {
        Alert.alert('Error', 'El CUIL debe tener exactamente 11 dígitos');
        setLoading(false);
        return;
      }

      if (editando) {
        await choferesAPI.actualizar(form.id_chofer, data);
      } else {
        // Al crear, NO enviar id_chofer (se genera automáticamente)
        await choferesAPI.crear(data);
      }

      Alert.alert('Éxito', editando ? 'Chofer actualizado' : 'Chofer creado');
      setModalVisible(false);
      cargarChoferes();
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

  const eliminarChofer = (id_chofer: string) => {
    const onConfirmar = async () => {
      setLoading(true);
      try {
        await choferesAPI.eliminar(id_chofer);
        if (Platform.OS === 'web') window.alert('Éxito: Chofer eliminado');
        else Alert.alert('Éxito', 'Chofer eliminado');
        cargarChoferes();
      } catch (error: any) {
        const msg = error.response?.data?.message || 'No se pudo eliminar el chofer';
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
      const seguro = window.confirm('¿Estás seguro de que deseas eliminar este chofer?');
      if (seguro) onConfirmar();
    } else {
      Alert.alert('Eliminar', '¿Estás seguro?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: onConfirmar },
      ]);
    }
  };

  const abrirModalDetalles = async (chofer: Chofer) => {
    try {
      // Cargar el chofer completo con sus relaciones desde el backend
      const response = await choferesAPI.obtenerPorId(chofer.id_chofer);
      setChoferSeleccionado(response.data);
      setModalDetallesVisible(true);
    } catch (error) {
      console.error('Error al cargar detalles del chofer:', error);
      // Si falla, usar los datos que ya tenemos
      setChoferSeleccionado(chofer);
      setModalDetallesVisible(true);
    }
  };

  const chofersFiltrados = choferes.filter((c) =>
    c.nombre_completo.toLowerCase().includes(searchText.toLowerCase()),
  );

  const renderChofer = ({ item }: { item: Chofer }) => (
    <TouchableOpacity
      style={styles.choferItem}
      onPress={() => abrirModalDetalles(item)}
      activeOpacity={0.7}
    >
      <View style={styles.choferInfo}>
        <Text style={styles.choferNombre}>{item.nombre_completo}</Text>
        <Text style={styles.choferDetalle}>ID: {item.id_chofer}</Text>
        <Text style={styles.choferDetalle}>Estado: {item.estado_chofer}</Text>
      </View>
      <View style={styles.choferAcciones}>
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
            eliminarChofer(item.id_chofer);
          }}
        >
          <Text style={styles.btnTexto}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const esChoferActivo = form.estado_chofer === EstadoChofer.CARGANDO ||
    form.estado_chofer === EstadoChofer.VIAJANDO ||
    form.estado_chofer === EstadoChofer.DESCANSANDO ||
    form.estado_chofer === EstadoChofer.DESCARGANDO ||
    form.estado_chofer === EstadoChofer.ENTREGA_FINALIZADA;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestionar Choferes</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity style={styles.btnCrear} onPress={abrirModalCrear}>
          <Text style={styles.btnCrearTexto}>+ Agregar Chofer</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#666"
        />

        {loading && <ActivityIndicator size="large" color="#007AFF" />}

        <FlatList
          data={chofersFiltrados}
          renderItem={renderChofer}
          keyExtractor={(item) => item.id_chofer}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay choferes</Text>
          }
        />
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editando ? 'Editar Chofer' : 'Nuevo Chofer'}
            </Text>

            {editando && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>ID:</Text>
                <Text style={styles.infoValue}>{form.id_chofer}</Text>
              </View>
            )}

            <Text style={styles.labelRequired}>
              Nombre Completo <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre Completo"
              value={form.nombre_completo}
              onChangeText={(text) =>
                setForm({ ...form, nombre_completo: text })
              }
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>CUIL (solo números)</Text>
            <View style={styles.cuilContainer}>
              <TextInput
                style={[styles.input, styles.cuilInput1]}
                placeholder="XX"
                value={form.cuil1}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '');
                  setForm({ ...form, cuil1: cleaned });
                  if (cleaned.length === 2) {
                    cuil2Ref.current?.focus();
                  }
                }}
                keyboardType="numeric"
                maxLength={2}
                placeholderTextColor="#999"
              />
              <Text style={styles.cuilSeparator}>-</Text>
              <TextInput
                ref={cuil2Ref}
                style={[styles.input, styles.cuilInput2]}
                placeholder="XXXXXXXX"
                value={form.cuil2}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '');
                  setForm({ ...form, cuil2: cleaned });
                  if (cleaned.length === 8) {
                    cuil3Ref.current?.focus();
                  }
                }}
                keyboardType="numeric"
                maxLength={8}
                placeholderTextColor="#999"
              />
              <Text style={styles.cuilSeparator}>-</Text>
              <TextInput
                ref={cuil3Ref}
                style={[styles.input, styles.cuilInput3]}
                placeholder="X"
                value={form.cuil3}
                onChangeText={(text) => setForm({ ...form, cuil3: text.replace(/\D/g, '') })}
                keyboardType="numeric"
                maxLength={1}
                placeholderTextColor="#999"
              />
            </View>

            <Text style={styles.label}>Transportista (Opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Transportista (Opcional)"
              value={form.transportista}
              onChangeText={(text) =>
                setForm({ ...form, transportista: text })
              }
              placeholderTextColor="#666"
            />

            <Text style={styles.labelRequired}>
              Estado <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text>
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.estado_chofer}
                onValueChange={(value) =>
                  setForm({ ...form, estado_chofer: value })
                }
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

            {esChoferActivo && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>
                  ⚠️ No es posible modificar los recursos de un chofer con jornada activa.
                </Text>
              </View>
            )}

            <Text style={styles.label}>Tractor Asignado (opcional)</Text>
            <View style={[styles.pickerContainer, esChoferActivo && styles.pickerDisabled]}>
              <Picker
                selectedValue={form.tractor_id}
                onValueChange={(value) =>
                  setForm({ ...form, tractor_id: value })
                }
                style={styles.picker}
                enabled={!esChoferActivo}
              >
                <Picker.Item label="Sin asignar" value="" />
                {tractores
                  .filter(t =>
                    (t.estado_tractor === 'libre' || String(t.tractor_id) === String(form.tractor_id)) &&
                    (String(t.tractor_id) === String(form.tractor_id) || !t.chofer_id) &&
                    (t.transportista || '').trim().toLowerCase() === (form.transportista || '').trim().toLowerCase()
                  )
                  .map((tractor) => (
                    <Picker.Item
                      key={tractor.tractor_id}
                      label={`${tractor.patente} - ${tractor.marca} ${tractor.modelo} • ${tractor.transportista || 'Sin transp.'}`}
                      value={tractor.tractor_id}
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
                  .filter(b =>
                    b.estado !== 'en_reparacion' &&
                    (b.batea_id === form.batea_id || !b.chofer_id) &&
                    (b.transportista || '').trim().toLowerCase() === (form.transportista || '').trim().toLowerCase()
                  )
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
                onPress={guardarChofer}
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
        </View>
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
              <Text style={styles.modalDetallesTitulo}>Detalles del Chofer</Text>
              <TouchableOpacity
                onPress={() => setModalDetallesVisible(false)}
                style={styles.btnCerrar}
              >
                <Text style={styles.btnCerrarTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detallesScroll}>
              {choferSeleccionado && (
                <>
                  <View style={styles.detalleSeccion}>
                    <Text style={styles.detalleSeccionTitulo}>Información Personal</Text>
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>ID:</Text>
                      <Text style={styles.detalleValor}>{choferSeleccionado.id_chofer}</Text>
                    </View>
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>Nombre Completo:</Text>
                      <Text style={styles.detalleValor}>{choferSeleccionado.nombre_completo}</Text>
                    </View>
                    {choferSeleccionado.cuil && (
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>CUIL:</Text>
                        <Text style={styles.detalleValor}>{formatCuil(choferSeleccionado.cuil)}</Text>
                      </View>
                    )}
                    {choferSeleccionado.transportista && (
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Transportista:</Text>
                        <Text style={styles.detalleValor}>{choferSeleccionado.transportista}</Text>
                      </View>
                    )}
                    <View style={styles.detalleItem}>
                      <Text style={styles.detalleLabel}>Estado:</Text>
                      <Text style={styles.detalleValor}>{choferSeleccionado.estado_chofer}</Text>
                    </View>
                    {choferSeleccionado.razon_estado && (
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Razón del Estado:</Text>
                        <Text style={styles.detalleValor}>{choferSeleccionado.razon_estado}</Text>
                      </View>
                    )}
                  </View>

                  {choferSeleccionado.tractor ? (
                    <View style={styles.detalleSeccion}>
                      <Text style={styles.detalleSeccionTitulo}>Tractor Asignado</Text>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Marca:</Text>
                        <Text style={styles.detalleValor}>{choferSeleccionado.tractor.marca}</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Modelo:</Text>
                        <Text style={styles.detalleValor}>{choferSeleccionado.tractor.modelo}</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Patente:</Text>
                        <Text style={styles.detalleValor}>{choferSeleccionado.tractor.patente}</Text>
                      </View>
                      {choferSeleccionado.tractor.seguro && (
                        <View style={styles.detalleItem}>
                          <Text style={styles.detalleLabel}>Seguro:</Text>
                          <Text style={styles.detalleValor}>{choferSeleccionado.tractor.seguro}</Text>
                        </View>
                      )}
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Carga Máxima:</Text>
                        <Text style={styles.detalleValor}>{choferSeleccionado.tractor.carga_max_tractor ?? 'N/A'}t</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Estado:</Text>
                        <Text style={styles.detalleValor}>{choferSeleccionado.tractor.estado_tractor}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.detalleSeccion}>
                      <Text style={styles.detalleSeccionTitulo}>Tractor Asignado</Text>
                      <Text style={styles.detalleNoData}>Sin tractor asignado</Text>
                    </View>
                  )}

                  {choferSeleccionado.batea ? (
                    <View style={styles.detalleSeccion}>
                      <Text style={styles.detalleSeccionTitulo}>Batea Asignada</Text>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Marca:</Text>
                        <Text style={styles.detalleValor}>{choferSeleccionado.batea.marca}</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Modelo:</Text>
                        <Text style={styles.detalleValor}>{choferSeleccionado.batea.modelo}</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Patente:</Text>
                        <Text style={styles.detalleValor}>{choferSeleccionado.batea.patente}</Text>
                      </View>
                      {choferSeleccionado.batea.seguro && (
                        <View style={styles.detalleItem}>
                          <Text style={styles.detalleLabel}>Seguro:</Text>
                          <Text style={styles.detalleValor}>{choferSeleccionado.batea.seguro}</Text>
                        </View>
                      )}
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Carga Máxima:</Text>
                        <Text style={styles.detalleValor}>{choferSeleccionado.batea.carga_max_batea ?? 'N/A'}t</Text>
                      </View>
                      <View style={styles.detalleItem}>
                        <Text style={styles.detalleLabel}>Estado:</Text>
                        <Text style={styles.detalleValor}>{choferSeleccionado.batea.estado}</Text>
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
  choferItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  choferInfo: {
    flex: 1,
  },
  choferNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  choferDetalle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  choferAcciones: {
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
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
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    fontSize: 14,
  },
  cuilContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cuilInput1: {
    flex: 0.2,
    marginBottom: 0,
    textAlign: 'center',
  },
  cuilInput2: {
    flex: 0.6,
    marginBottom: 0,
    textAlign: 'center',
  },
  cuilInput3: {
    flex: 0.2,
    marginBottom: 0,
    textAlign: 'center',
  },
  cuilSeparator: {
    marginHorizontal: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
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