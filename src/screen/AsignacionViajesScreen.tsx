import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { bateasAPI, choferesAPI, tractoresAPI, viajesAPI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { Batea, Chofer, EstadoChofer, Tractor } from '../types/chofer';

// Definición de tipos locales para el formulario de viaje
interface ViajeForm {
    chofer_id: string;
    tractor_id: string;
    batea_id: string;
    origen: string;
    destino: string;
    fecha_salida: Date;
    numero_remito: string;
    toneladas_cargadas: string;
}

export const AsignacionViajesScreen = () => {
    const { isAuthenticated, user } = useAuth();

    const [dateError, setDateError] = useState<string | null>(null);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    // Estados para datos maestros
    const [choferes, setChoferes] = useState<Chofer[]>([]);
    const [tractores, setTractores] = useState<Tractor[]>([]);
    const [bateas, setBateas] = useState<Batea[]>([]);

    // Estados de control UI
    const [loading, setLoading] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Estados de Negocio - Meta Diaria
    const [metaDiaria, setMetaDiaria] = useState(5); // Valor por defecto
    const [viajesAsignadosHoy, setViajesAsignadosHoy] = useState(0); // Esto podría venir del backend
    const [editandoMeta, setEditandoMeta] = useState(false);
    const [tempMeta, setTempMeta] = useState('5');

    // Estado del formulario
    const [form, setForm] = useState<ViajeForm>({
        chofer_id: '',
        tractor_id: '',
        batea_id: '',
        origen: '',
        destino: '',
        fecha_salida: new Date(),
        numero_remito: '',
        toneladas_cargadas: '',
    });

    // DatePicker control
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Cargar recursos solo si está autenticado y es admin
    useEffect(() => {
        if (isAuthenticated && user?.rol === 'admin') {
            cargarRecursos();
        }
    }, [isAuthenticated, user]);

    const cargarRecursos = async () => {
        setLoading(true);
        try {
            const [resChoferes, resTractores, resBateas] = await Promise.all([
                choferesAPI.obtenerTodos(),
                tractoresAPI.obtenerTodos(),
                bateasAPI.obtenerTodos()
            ]);

            const choferesData = resChoferes.data || [];

            // DEBUG: Mostrar todos los choferes recibidos del backend
            console.log('=== DEBUG: Choferes recibidos del backend ===');
            console.log('Total choferes:', choferesData.length);
            choferesData.forEach((c: Chofer) => {
                console.log(`- ${c.nombre_completo}: estado_chofer="${c.estado_chofer}"`);
            });
            console.log('===========================================');

            setChoferes(choferesData);
            setTractores(resTractores.data || []);
            setBateas(resBateas.data || []);
        } catch (error) {
            console.error('Error cargando recursos:', error);
            // Silenciar el alert si es un error de autenticación
            if ((error as any).response?.status !== 403 && (error as any).response?.status !== 401) {
                showAlert('Error', 'No se pudieron cargar los recursos necesarios.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Filtrado de recursos
    const choferesActivos = useMemo(() => {
        const filtered = choferes.filter(c => c.estado_chofer === EstadoChofer.DISPONIBLE);

        // DEBUG: Mostrar resultados del filtro
        console.log('=== DEBUG: Filtrado de choferes disponibles ===');
        console.log(`EstadoChofer.DISPONIBLE = "${EstadoChofer.DISPONIBLE}"`);
        console.log(`Total choferes filtrados: ${filtered.length} de ${choferes.length}`);
        filtered.forEach((c: Chofer) => {
            console.log(`- ${c.nombre_completo}: estado_chofer="${c.estado_chofer}"`);
        });
        console.log('===============================================');

        return filtered;
    }, [choferes]);

    // Tractores disponibles: libres O el que ya tiene asignado el chofer seleccionado
    const tractoresDisponibles = useMemo(() => {
        const choferSeleccionado = choferes.find(c => c.id_chofer?.toString() === form.chofer_id?.toString());
        return tractores.filter(t =>
            t.estado_tractor === 'libre' ||
            (choferSeleccionado && t.tractor_id === choferSeleccionado.tractor_id)
        );
    }, [tractores, form.chofer_id, choferes]);

    // Bateas disponibles: vacías O la que ya tiene asignada el chofer seleccionado
    const bateasDisponibles = useMemo(() => {
        const choferSeleccionado = choferes.find(c => c.id_chofer?.toString() === form.chofer_id?.toString());
        return bateas.filter(b =>
            b.estado === 'vacio' ||
            (choferSeleccionado && b.batea_id === choferSeleccionado.batea_id)
        );
    }, [bateas, form.chofer_id, choferes]);

    // Selección inteligente de recursos al elegir Chofer
    const handleChoferChange = (choferId: string | number) => {
        const chofer = choferes.find(c => c.id_chofer?.toString() === choferId?.toString());

        // Actualizar chofer
        let updates: any = { chofer_id: choferId, tractor_id: '', batea_id: '' };

        if (chofer) {
            // Siempre intentar pre-seleccionar tractor asignado si existe
            if (chofer.tractor_id) {
                const tractor = tractores.find(t => t.tractor_id === chofer.tractor_id);
                if (tractor) {
                    updates.tractor_id = chofer.tractor_id;
                    console.log(`🚜 Tractor asignado automáticamente: ${tractor.patente}`);
                }
            }

            // Siempre intentar pre-seleccionar batea asignada si existe
            if (chofer.batea_id) {
                const batea = bateas.find(b => b.batea_id === chofer.batea_id);
                if (batea) {
                    updates.batea_id = chofer.batea_id;
                    console.log(`🚛 Batea asignada automáticamente: ${batea.patente}`);
                }
            }
        }

        setForm(prev => ({ ...prev, ...updates }));
    };

    const handleGuardarViaje = async () => {
        // Validaciones básicas
        if (!form.chofer_id || !form.tractor_id || !form.batea_id || !form.origen || !form.destino || !form.fecha_salida || !form.toneladas_cargadas) {
            showAlert('Error', 'Todos los campos obligatorios deben estar completos, incluyendo las toneladas a transportar.');
            return;
        }

        // Validar rango de fecha de salida (no anterior a la actual, y no posterior a 2 meses)
        const ahora = new Date();
        const ahoraMargen = new Date(ahora.getTime() - 5 * 60 * 1000); // 5 minutos de margen por si se demora unos minutos en llenar el form
        if (form.fecha_salida < ahoraMargen) {
            const errorStr = 'La fecha y hora de salida no puede ser anterior a la actual.';
            setDateError(errorStr);
            showAlert('⚠️ Fecha Inválida', errorStr);
            return;
        }

        const dosMesesDespues = new Date();
        dosMesesDespues.setMonth(dosMesesDespues.getMonth() + 2);
        if (form.fecha_salida > dosMesesDespues) {
            const errorStr = 'La fecha de salida no puede ser posterior a dos meses desde la fecha actual.';
            setDateError(errorStr);
            showAlert('⚠️ Fecha Inválida', errorStr);
            return;
        }

        // Si pasa la validación, limpiar error
        setDateError(null);

        setLoadingSubmit(true);
        try {
            const choferSeleccionado = choferes.find(c => c.id_chofer?.toString() === form.chofer_id?.toString());
            
            // Asignar tractor al vuelo si no lo tiene asignado
            if (choferSeleccionado && choferSeleccionado.tractor_id !== form.tractor_id) {
                console.log(`Asignando tractor ${form.tractor_id} al chofer ${form.chofer_id} al vuelo...`);
                await tractoresAPI.asignarChofer(form.tractor_id, form.chofer_id);
            }

            // Asignar batea al vuelo si no la tiene asignada
            if (choferSeleccionado && choferSeleccionado.batea_id !== form.batea_id) {
                console.log(`Asignando batea ${form.batea_id} al chofer ${form.chofer_id} al vuelo...`);
                await bateasAPI.asignarChofer(form.batea_id, form.chofer_id);
            }

            const payload = {
                ...form,
                toneladas_cargadas: parseFloat(form.toneladas_cargadas) || 0,
                fecha_salida: form.fecha_salida.toISOString(),
            };

            await viajesAPI.crear(payload);

            showAlert('✅ ¡Viaje Creado!', '🚚 El viaje se ha asignado correctamente.');
            setViajesAsignadosHoy(prev => prev + 1);
            setModalVisible(false);

            // Resetear form
            setForm({
                chofer_id: '',
                tractor_id: '',
                batea_id: '',
                origen: '',
                destino: '',
                fecha_salida: new Date(),
                numero_remito: '',
                toneladas_cargadas: '',
            });
            setDateError(null);

            // Recargar recursos para actualizar estados (ahora ocupados)
            cargarRecursos();

        } catch (error: any) {
            console.error('Error creando viaje:', error);
            const mensaje = error.response?.data?.message || 'Hubo un error al crear el viaje. Inténtalo de nuevo.';
            showAlert('❌ Error', mensaje);
        } finally {
            setLoadingSubmit(false);
        }
    };

    const actualizarMeta = () => {
        const nuevaMeta = parseInt(tempMeta);
        if (!isNaN(nuevaMeta) && nuevaMeta > 0) {
            setMetaDiaria(nuevaMeta);
            setEditandoMeta(false);
        } else {
            showAlert('⚠️ Error', 'Ingresa un número válido mayor a 0');
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || form.fecha_salida;
        setShowDatePicker(Platform.OS === 'ios');
        setForm({ ...form, fecha_salida: currentDate });

        // Validar en tiempo real
        const ahora = new Date();
        const ahoraMargen = new Date(ahora.getTime() - 5 * 60 * 1000);
        const dosMesesDespues = new Date();
        dosMesesDespues.setMonth(dosMesesDespues.getMonth() + 2);

        if (currentDate < ahoraMargen) {
            setDateError('La fecha de salida no puede ser anterior a la actual.');
        } else if (currentDate > dosMesesDespues) {
            setDateError('La fecha de salida no puede ser posterior a dos meses.');
        } else {
            setDateError(null);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header con Meta Diaria */}
            <View style={styles.metaContainer}>
                <View style={styles.metaHeader}>
                    <Text style={styles.metaTitle}>🎯 Meta Diaria: {metaDiaria} Viajes</Text>
                    <TouchableOpacity onPress={() => setEditandoMeta(!editandoMeta)}>
                        <Text style={styles.linkText}>{editandoMeta ? '❌ Cancelar' : '✏️ Cambiar'}</Text>
                    </TouchableOpacity>
                </View>

                {editandoMeta && (
                    <View style={styles.editMetaRow}>
                        <TextInput
                            style={styles.metaInput}
                            keyboardType="numeric"
                            value={tempMeta}
                            onChangeText={setTempMeta}
                        />
                        <TouchableOpacity style={styles.btnSmall} onPress={actualizarMeta}>
                            <Text style={styles.btnSmallText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: `${Math.min((viajesAsignadosHoy / metaDiaria) * 100, 100)}%` }]} />
                </View>
                <Text style={styles.progressText}>{viajesAsignadosHoy} de {metaDiaria} viajes asignados hoy</Text>
            </View>

            {/* Contenido Principal */}
            <ScrollView contentContainerStyle={styles.content}>
                <TouchableOpacity
                    style={styles.btnAsignar}
                    onPress={() => {
                        setForm(prev => ({ ...prev, fecha_salida: new Date() }));
                        setModalVisible(true);
                    }}
                >
                    <Text style={styles.btnAsignarText}>🚚 ASIGNAR NUEVO VIAJE</Text>
                </TouchableOpacity>

                {/* Historial o Dashboard simple podría ir aquí */}
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>📋 Los viajes asignados aparecerán en el historial.</Text>
                </View>
            </ScrollView>

            {/* Modal de Creación de Viaje */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>🚚 Nuevo Viaje</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text style={styles.closeText}>✖️ Cerrar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#007AFF" />
                        ) : (
                            <>
                                {/* SECCION RECURSOS */}
                                <Text style={styles.sectionTitle}>👥 Recursos</Text>

                                <Text style={styles.labelRequired}>🧑‍✈️ Chofer (Disponibles) <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text></Text>
                                <View style={styles.pickerWrapper}>
                                    <Picker
                                        selectedValue={form.chofer_id}
                                        onValueChange={handleChoferChange}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label="Seleccionar Chofer..." value="" />
                                        {choferesActivos.map(c => (
                                            <Picker.Item
                                                key={c.id_chofer}
                                                label={c.nombre_completo}
                                                value={c.id_chofer}
                                            />
                                        ))}
                                    </Picker>
                                </View>

                                <Text style={styles.labelRequired}>🚛 Tractor (Disponibles) <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text></Text>
                                <View style={styles.pickerWrapper}>
                                    <Picker
                                        selectedValue={form.tractor_id}
                                        onValueChange={(val) => setForm({ ...form, tractor_id: val })}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label="Seleccionar Tractor..." value="" />
                                        {tractoresDisponibles.map(t => (
                                            <Picker.Item
                                                key={t.tractor_id}
                                                label={`${t.patente} - ${t.modelo}${t.estado_tractor !== 'libre' ? ' (Asignado)' : ''}`}
                                                value={t.tractor_id}
                                            />
                                        ))}
                                    </Picker>
                                </View>

                                <Text style={styles.labelRequired}>📦 Batea (Disponibles) <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text></Text>
                                <View style={styles.pickerWrapper}>
                                    <Picker
                                        selectedValue={form.batea_id}
                                        onValueChange={(val) => setForm({ ...form, batea_id: val })}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label="Seleccionar Batea..." value="" />
                                        {bateasDisponibles.map(b => (
                                            <Picker.Item
                                                key={b.batea_id}
                                                label={`${b.patente} - ${b.modelo}${b.estado !== 'vacio' ? ' (Asignada)' : ''}`}
                                                value={b.batea_id}
                                            />
                                        ))}
                                    </Picker>
                                </View>

                                {/* SECCION DATOS DEL VIAJE */}
                                <Text style={styles.sectionTitleMargin}>📝 Datos del Viaje</Text>

                                <Text style={styles.labelRequired}>📍 Origen <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text></Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: Mangrullo"
                                    value={form.origen}
                                    onChangeText={(text) => setForm({ ...form, origen: text })}
                                    placeholderTextColor="#666"
                                />
                                <View style={styles.suggestions}>
                                    {['Mangrullo', 'San Pedro', 'San Nicolas', 'Cristamine', 'Chola'].map(s => (
                                        <TouchableOpacity key={s} onPress={() => setForm({ ...form, origen: s })} style={styles.suggestionTag}>
                                            <Text style={styles.suggestionText}>{s}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.labelRequired}>🏁 Destino <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text></Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: Añelo"
                                    value={form.destino}
                                    onChangeText={(text) => setForm({ ...form, destino: text })}
                                    placeholderTextColor="#666"
                                />

                                <Text style={styles.labelRequired}>📅 Fecha y Hora de Salida <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text></Text>
                                {Platform.OS === 'web' ? (
                                    React.createElement('input', {
                                        type: 'datetime-local',
                                        value: form.fecha_salida.getFullYear() + '-' +
                                            String(form.fecha_salida.getMonth() + 1).padStart(2, '0') + '-' +
                                            String(form.fecha_salida.getDate()).padStart(2, '0') + 'T' +
                                            String(form.fecha_salida.getHours()).padStart(2, '0') + ':' +
                                            String(form.fecha_salida.getMinutes()).padStart(2, '0'),
                                        min: (() => {
                                            const now = new Date();
                                            return now.getFullYear() + '-' +
                                                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                                                String(now.getDate()).padStart(2, '0') + 'T' +
                                                String(now.getHours()).padStart(2, '0') + ':' +
                                                String(now.getMinutes()).padStart(2, '0');
                                        })(),
                                        max: (() => {
                                            const maxDate = new Date();
                                            maxDate.setMonth(maxDate.getMonth() + 2);
                                            return maxDate.getFullYear() + '-' +
                                                String(maxDate.getMonth() + 1).padStart(2, '0') + '-' +
                                                String(maxDate.getDate()).padStart(2, '0') + 'T' +
                                                String(maxDate.getHours()).padStart(2, '0') + ':' +
                                                String(maxDate.getMinutes()).padStart(2, '0');
                                        })(),
                                        onChange: (e: any) => {
                                            if (e.target.value) {
                                                const date = new Date(e.target.value);
                                                setForm({ ...form, fecha_salida: date });
                                                
                                                // Validar en tiempo real para web
                                                const ahora = new Date();
                                                const ahoraMargen = new Date(ahora.getTime() - 5 * 60 * 1000);
                                                const dosMesesDespues = new Date();
                                                dosMesesDespues.setMonth(dosMesesDespues.getMonth() + 2);

                                                if (date < ahoraMargen) {
                                                    setDateError('La fecha de salida no puede ser anterior a la actual.');
                                                } else if (date > dosMesesDespues) {
                                                    setDateError('La fecha de salida no puede ser posterior a dos meses.');
                                                } else {
                                                    setDateError(null);
                                                }
                                            }
                                        },
                                        style: {
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid #ced4da',
                                            fontSize: '14px',
                                            width: '100%',
                                            backgroundColor: '#f8f9fa',
                                            boxSizing: 'border-box',
                                            color: '#333',
                                            marginBottom: '12px',
                                        }
                                    })
                                ) : (
                                    <>
                                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                                            <Text style={{color: '#333'}}>{form.fecha_salida.toLocaleString()}</Text>
                                        </TouchableOpacity>
                                        {showDatePicker && (
                                            <DateTimePicker
                                                value={form.fecha_salida}
                                                mode="datetime"
                                                display="default"
                                                minimumDate={new Date()}
                                                maximumDate={(() => {
                                                    const maxDate = new Date();
                                                    maxDate.setMonth(maxDate.getMonth() + 2);
                                                    return maxDate;
                                                 })()}
                                                onChange={onDateChange}
                                            />
                                        )}
                                    </>
                                )}

                                {dateError && (
                                    <View style={{ backgroundColor: '#fff5f5', borderLeftWidth: 4, borderLeftColor: '#dc3545', padding: 10, borderRadius: 4, marginBottom: 12 }}>
                                        <Text style={{ color: '#dc3545', fontSize: 13, fontWeight: 'bold' }}>
                                            ⚠️ {dateError}
                                        </Text>
                                    </View>
                                )}

                                <Text style={styles.label}>📄 Número de Remito (Opcional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="12345-6789"
                                    value={form.numero_remito}
                                    onChangeText={(text) => setForm({ ...form, numero_remito: text })}
                                    placeholderTextColor="#666"
                                />

                                <Text style={styles.labelRequired}>⚖️ Toneladas a transportar <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text></Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: 28.5"
                                    keyboardType="numeric"
                                    value={form.toneladas_cargadas}
                                    onChangeText={(text) => setForm({ ...form, toneladas_cargadas: text })}
                                    placeholderTextColor="#666"
                                />

                                <TouchableOpacity
                                    style={[styles.btnConfirmar, loadingSubmit && styles.btnDisabled]}
                                    onPress={handleGuardarViaje}
                                    disabled={loadingSubmit}
                                >
                                    {loadingSubmit ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.btnConfirmarText}>✅ CONFIRMAR VIAJE</Text>
                                    )}
                                </TouchableOpacity>
                                <View style={{ height: 40 }} />
                            </>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    metaContainer: {
        backgroundColor: '#fff',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    metaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    metaTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1C1C1E',
    },
    linkText: {
        color: '#007AFF',
        fontSize: 16,
    },
    editMetaRow: {
        flexDirection: 'row',
        marginBottom: 10,
        alignItems: 'center',
    },
    metaInput: {
        borderWidth: 1,
        borderColor: '#C7C7CC',
        borderRadius: 8,
        padding: 8,
        width: 60,
        textAlign: 'center',
        marginRight: 10,
    },
    btnSmall: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
    },
    btnSmallText: {
        color: '#fff',
        fontWeight: '600',
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#E5E5EA',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#34C759',
    },
    progressText: {
        color: '#8E8E93',
        fontSize: 14,
    },
    content: {
        padding: 20,
        flexGrow: 1,
    },
    btnAsignar: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
    },
    btnAsignarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: '#8E8E93',
        fontSize: 16,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeText: {
        color: '#007AFF',
        fontSize: 16,
    },
    formContainer: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1C1C1E',
        marginTop: 10,
        marginBottom: 15,
    },
    sectionTitleMargin: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1C1C1E',
        marginTop: 30,
        marginBottom: 15,
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
    input: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ced4da',
        fontSize: 14,
        color: '#333',
        marginBottom: 12,
        justifyContent: 'center',
    },
    pickerWrapper: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ced4da',
        overflow: 'hidden',
        marginBottom: 12,
    },
    picker: {
        height: 50,
        backgroundColor: 'transparent',
        borderWidth: 0,
        color: '#333',
    },
    suggestions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 8,
    },
    suggestionTag: {
        backgroundColor: '#E5E5EA',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    suggestionText: {
        color: '#333',
        fontSize: 12,
    },
    btnConfirmar: {
        backgroundColor: '#34C759',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    btnDisabled: {
        opacity: 0.7,
    },
    btnConfirmarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
