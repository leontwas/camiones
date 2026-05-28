import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiClient from '../api/apiClient';

interface EditViajeModalProps {
    visible: boolean;
    viaje: any;
    onClose: () => void;
    onSuccess: () => void;
}

export const EditViajeModal: React.FC<EditViajeModalProps> = ({ visible, viaje, onClose, onSuccess }) => {
    const [choferes, setChoferes] = useState<any[]>([]);
    const [tractores, setTractores] = useState<any[]>([]);
    const [bateas, setBateas] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [form, setForm] = useState({
        chofer_id: '',
        tractor_id: '',
        batea_id: '',
        origen: '',
        destino: '',
        fecha_salida: new Date(),
        toneladas_cargadas: '',
        numero_remito: ''
    });

    useEffect(() => {
        if (visible && viaje) {
            setForm({
                chofer_id: viaje.chofer_id?.toString() || '',
                tractor_id: viaje.tractor_id?.toString() || '',
                batea_id: viaje.batea_id?.toString() || '',
                origen: viaje.origen || '',
                destino: viaje.destino || '',
                fecha_salida: viaje.fecha_salida ? new Date(viaje.fecha_salida) : new Date(),
                toneladas_cargadas: viaje.toneladas_cargadas?.toString() || '',
                numero_remito: viaje.numero_remito || ''
            });
            cargarRecursos();
        }
    }, [visible, viaje]);

    const cargarRecursos = async () => {
        setLoading(true);
        try {
            const [resChoferes, resTractores, resBateas] = await Promise.all([
                apiClient.get('/api/v1/choferes'),
                apiClient.get('/api/v1/tractores'),
                apiClient.get('/api/v1/bateas')
            ]);
            setChoferes(resChoferes.data || []);
            setTractores(resTractores.data || []);
            setBateas(resBateas.data || []);
        } catch (error) {
            console.error('Error al cargar recursos:', error);
            Alert.alert('Error', 'No se pudieron cargar los recursos');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!form.chofer_id || !form.tractor_id || !form.batea_id || !form.origen || !form.destino || !form.fecha_salida || !form.toneladas_cargadas) {
            Alert.alert('Error', 'Todos los campos obligatorios deben estar completos, incluyendo las toneladas a transportar.');
            return;
        }

        setSaving(true);
        try {
            await apiClient.patch(`/api/v1/viajes/${viaje.id_viaje}`, {
                chofer_id: parseInt(form.chofer_id),
                tractor_id: parseInt(form.tractor_id),
                batea_id: parseInt(form.batea_id),
                origen: form.origen,
                destino: form.destino,
                fecha_salida: form.fecha_salida,
                toneladas_cargadas: parseFloat(form.toneladas_cargadas),
                numero_remito: form.numero_remito || undefined
            });
            Alert.alert('Éxito', 'El viaje ha sido actualizado y se ha notificado al chofer.');
            onSuccess();
        } catch (error: any) {
            console.error('Error al editar viaje:', error);
            Alert.alert('Error', error.response?.data?.message || 'No se pudo editar el viaje');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.title}>Editar Viaje ID: {viaje?.id_viaje}</Text>
                    {loading ? (
                        <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 20}} />
                    ) : (
                        <ScrollView style={{width: '100%'}}>
                            <Text style={styles.labelRequired}>🧑‍✈️ Chofer</Text>
                            <View style={styles.pickerWrapper}>
                                <Picker
                                    selectedValue={form.chofer_id}
                                    onValueChange={(val) => setForm({ ...form, chofer_id: val })}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Seleccionar Chofer..." value="" />
                                    {choferes.map(c => (
                                        <Picker.Item key={c.id_chofer} label={c.nombre_completo} value={c.id_chofer.toString()} />
                                    ))}
                                </Picker>
                            </View>

                            <Text style={styles.labelRequired}>🚛 Tractor</Text>
                            <View style={styles.pickerWrapper}>
                                <Picker
                                    selectedValue={form.tractor_id}
                                    onValueChange={(val) => setForm({ ...form, tractor_id: val })}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Seleccionar Tractor..." value="" />
                                    {tractores.map(t => (
                                        <Picker.Item key={t.tractor_id} label={t.patente} value={t.tractor_id.toString()} />
                                    ))}
                                </Picker>
                            </View>

                            <Text style={styles.labelRequired}>📦 Batea</Text>
                            <View style={styles.pickerWrapper}>
                                <Picker
                                    selectedValue={form.batea_id}
                                    onValueChange={(val) => setForm({ ...form, batea_id: val })}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Seleccionar Batea..." value="" />
                                    {bateas.map(b => (
                                        <Picker.Item key={b.batea_id} label={b.patente} value={b.batea_id.toString()} />
                                    ))}
                                </Picker>
                            </View>

                            <Text style={styles.labelRequired}>📍 Origen</Text>
                            <TextInput
                                style={styles.input}
                                value={form.origen}
                                onChangeText={(val) => setForm({ ...form, origen: val })}
                                placeholderTextColor="#666"
                            />

                            <Text style={styles.labelRequired}>🏁 Destino</Text>
                            <TextInput
                                style={styles.input}
                                value={form.destino}
                                onChangeText={(val) => setForm({ ...form, destino: val })}
                                placeholderTextColor="#666"
                            />

                            <Text style={styles.labelRequired}>📅 Fecha de Salida</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                                <Text style={{color: '#333'}}>{form.fecha_salida.toLocaleString()}</Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={form.fecha_salida}
                                    mode="datetime"
                                    display="default"
                                    onChange={(_, date) => {
                                        setShowDatePicker(Platform.OS === 'ios');
                                        if (date) setForm({ ...form, fecha_salida: date });
                                    }}
                                />
                            )}

                            <Text style={styles.label}>📄 Número de Remito (Opcional)</Text>
                            <TextInput
                                style={styles.input}
                                value={form.numero_remito}
                                onChangeText={(val) => setForm({ ...form, numero_remito: val })}
                                placeholderTextColor="#666"
                            />

                            <Text style={styles.labelRequired}>⚖️ Toneladas a transportar <Text style={styles.labelRequiredSmall}>(Campo obligatorio)</Text></Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={form.toneladas_cargadas}
                                onChangeText={(val) => setForm({ ...form, toneladas_cargadas: val })}
                                placeholderTextColor="#666"
                            />
                            
                            <View style={styles.btnRow}>
                                <TouchableOpacity style={[styles.btn, { backgroundColor: '#DC3545' }]} onPress={onClose}>
                                    <Text style={styles.btnText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btn, { backgroundColor: '#007AFF' }]} onPress={handleSave} disabled={saving}>
                                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Guardar Cambios</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333'
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
    btnRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 20
    },
    btn: {
        padding: 12,
        borderRadius: 8,
        width: '45%',
        alignItems: 'center'
    },
    btnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    }
});
