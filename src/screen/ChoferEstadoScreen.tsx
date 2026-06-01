import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
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
  View,
} from 'react-native';
import apiClient from '../api/apiClient';
import { EstadoChofer, type EstadoConfig } from '../types/chofer';

// Configuración de colores y emojis para cada estado
const ESTADOS_CONFIG: Record<EstadoChofer, EstadoConfig> = {
  [EstadoChofer.DISPONIBLE]: {
    label: 'Disponible',
    emoji: '🙋‍♂️',
    color: '#fff',
    backgroundColor: '#2196F3',
  },
  [EstadoChofer.CARGANDO]: {
    label: 'Cargando',
    emoji: '📦',
    color: '#fff',
    backgroundColor: '#FF9800',
  },
  [EstadoChofer.VIAJANDO]: {
    label: 'Viajando',
    emoji: '🚛',
    color: '#fff',
    backgroundColor: '#585555',
  },
  [EstadoChofer.DESCANSANDO]: {
    label: 'Descansando',
    emoji: '😴',
    color: '#fff',
    backgroundColor: '#9C27B0',
  },
  [EstadoChofer.DESCARGANDO]: {
    label: 'Descargando',
    emoji: '📤',
    color: '#fff',
    backgroundColor: '#FF5722',
  },
  [EstadoChofer.ENTREGA_FINALIZADA]: {
    label: 'Entrega Finalizada',
    emoji: '✅',
    color: '#fff',
    backgroundColor: '#4CAF50',
    requiresToneladas: true,
  },
  [EstadoChofer.FRANCO]: {
    label: 'Franco',
    emoji: '🏠',
    color: '#fff',
    backgroundColor: '#2e977d',
    requiresDates: true,
  },
    [EstadoChofer.LICENCIA_ANUAL]: {
    label: 'Licencia Anual',
    emoji: '🏖️',
    color: '#fff',
    backgroundColor: '#00BCD4',
    requiresDates: true,
  },
  [EstadoChofer.EQUIPO_EN_REPARACION]: {
    label: 'Equipo en Reparación',
    emoji: '🔧',
    color: '#fff',
    backgroundColor: '#ff0404',
  },
  [EstadoChofer.INACTIVO]: {
    label: 'Inactivo',
    emoji: '❌',
    color: '#fff',
    backgroundColor: '#9E9E9E',
  },
};

export const ChoferEstadoScreen = () => {
  const [estadoActual, setEstadoActual] = useState<EstadoChofer | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showToneladasModal, setShowToneladasModal] = useState(false);
  const [selectedEstado, setSelectedEstado] = useState<EstadoChofer | null>(null);
  const [choferData, setChoferData] = useState<any>(null);

  // Flag para reordenar el botón "Viajando" debajo de "Descansando"
  // Se activa cuando el chofer entra en la segunda mitad del ciclo de viaje
  // y se mantiene hasta que vuelve a DISPONIBLE o un estado fuera de viaje.
  const [reordenarViajando, setReordenarViajando] = useState(false);

  useEffect(() => {
    if (
      estadoActual === EstadoChofer.DESCANSANDO ||
      estadoActual === EstadoChofer.DESCARGANDO ||
      estadoActual === EstadoChofer.ENTREGA_FINALIZADA
    ) {
      // Segunda mitad del viaje: VIAJANDO va debajo de DESCANSANDO
      setReordenarViajando(true);
    } else if (
      estadoActual === EstadoChofer.DISPONIBLE ||
      estadoActual === EstadoChofer.CARGANDO ||
      estadoActual === EstadoChofer.FRANCO ||
      estadoActual === EstadoChofer.LICENCIA_ANUAL ||
      estadoActual === EstadoChofer.EQUIPO_EN_REPARACION ||
      estadoActual === EstadoChofer.INACTIVO
    ) {
      // Primera mitad del viaje o fuera de viaje: orden normal
      setReordenarViajando(false);
    }
    // VIAJANDO: mantiene el valor actual del flag (puede ser 1ra o 2da vez)
  }, [estadoActual]);

  // Estados para las fechas
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(true);

  // Helper para alertas web
  const showCustomAlert = (title: string, message: string, buttons?: any[], options?: any) => {
    if (Platform.OS === 'web') {
      if (buttons && buttons.length > 1) {
        const confirmBtn = buttons.find(b => b.style !== 'cancel' && b.text !== 'Cancel');
        if (window.confirm(`${title}\n\n${message}`)) {
           if (confirmBtn && confirmBtn.onPress) confirmBtn.onPress();
        } else {
           const cancelBtn = buttons.find(b => b.style === 'cancel' || b.text === 'Cancel');
           if (cancelBtn && cancelBtn.onPress) cancelBtn.onPress();
        }
      } else {
        window.alert(`${title}\n\n${message}`);
        if (buttons && buttons.length > 0 && buttons[0].onPress) {
          buttons[0].onPress();
        }
      }
    } else {
      Alert.alert(title, message, buttons, options);
    }
  };

  // Estados para toneladas descargadas
  const [toneladasDescargadas, setToneladasDescargadas] = useState('');

  // Estados para validación de viaje asignado
  const [tieneViajeAsignado, setTieneViajeAsignado] = useState(false);
  const [viajeAsignado, setViajeAsignado] = useState<any>(null);
  const [notificacionMostrada, setNotificacionMostrada] = useState(false);

  const marcarNotificacionLeida = async (idViaje: number) => {
    try {
      await apiClient.patch(`/api/v1/viajes/${idViaje}/marcar-notificacion-leida`);
      // Actualizar estado local para que no vuelva a saltar hasta recargar
      setViajeAsignado((prev: any) => prev ? { ...prev, viaje_modificado: false } : prev);
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
    }
  };

  const verificarViajeAsignado = useCallback(async (choferId: string, mostrarNotificacion = false) => {
    try {
      const response = await apiClient.get(`/api/v1/viajes?chofer_id=${choferId}`);
      const viajes = response.data;

      // Filtrar viajes activos (no finalizados)
      const viajesActivos = viajes.filter((v: any) => v.estado_viaje !== 'finalizado');

      if (viajesActivos.length > 0) {
        const viaje = viajesActivos[0];
        setTieneViajeAsignado(true);
        setViajeAsignado(viaje);
        console.log('✅ Chofer tiene viaje asignado:', viaje);

        // Notificar si el viaje fue modificado por el Admin
        if (viaje.viaje_modificado) {
            showCustomAlert(
              '⚠️ Viaje Modificado',
              'El administrador ha modificado los datos de tu viaje actual.\nPor favor revisa los nuevos datos (Destino, Tractor, Batea, Toneladas, etc).',
              [
                { 
                  text: 'Entendido', 
                  onPress: () => marcarNotificacionLeida(viaje.id_viaje) 
                }
              ]
            );
        }

        // Mostrar notificación de viaje asignado solo si se solicita y no se ha mostrado antes
        if (mostrarNotificacion && !notificacionMostrada) {
          setNotificacionMostrada(true);
          mostrarNotificacionViajeAsignado(viaje);
        }
      } else {
        setTieneViajeAsignado(false);
        setViajeAsignado(null);
        console.log('ℹ️ Chofer NO tiene viaje asignado');
      }
    } catch {
      console.log('ℹ️ No se pudieron cargar los viajes del chofer');
      setTieneViajeAsignado(false);
      setViajeAsignado(null);
    }
  }, [notificacionMostrada]);

  const mostrarNotificacionViajeAsignado = (viaje: any) => {
    const destino = viaje.destino || 'destino asignado';
    const tractor = viaje.tractor?.patente || 'N/A';
    const batea = viaje.batea?.patente || 'N/A';

    showCustomAlert(
      '🚛 ¡Nuevo Viaje Asignado!',
      `Se te ha asignado un nuevo viaje.\n\n` +
      `📍 Destino: ${destino}\n` +
      `🚛 Tractor: ${tractor}\n` +
      `📦 Batea: ${batea}\n\n` +
      `Ya puedes cambiar tu estado a CARGANDO para comenzar.`,
      [
        {
          text: 'Entendido',
          style: 'default'
        }
      ]
    );
  };

  // Recargar estado cada vez que la pantalla gana el foco
  useFocusEffect(
    useCallback(() => {
      const cargarEstadoActual = async () => {
        try {
          setLoading(true);
          const response = await apiClient.get('/api/v1/auth/me');

          if (response.data.chofer_id) {
            const choferResponse = await apiClient.get(
              `/api/v1/choferes/${response.data.chofer_id}`
            );

            setChoferData(choferResponse.data);
            const estadoChofer = choferResponse.data.estado_chofer;
            setEstadoActual(estadoChofer);

            // Verificar si tiene viaje asignado y mostrar notificación si está DISPONIBLE
            const deberiaNotificar = estadoChofer === EstadoChofer.DISPONIBLE;
            await verificarViajeAsignado(response.data.chofer_id, deberiaNotificar);
          }
        } catch (error: any) {
          // Manejo silencioso de errores de autenticación
          if (error.response?.status === 403 || error.response?.status === 401) {
            // No mostrar alerta ni error, solo log informativo
            console.log('ℹ️ Acceso no autorizado al cargar estado del chofer');
          } else {
            // Para otros errores, mostrar detalles y alerta
            console.error('❌ Error al cargar estado:', error);
            showCustomAlert('Error', 'No se pudo cargar el estado actual');
          }
        } finally {
          setLoading(false);
        }
      };

      cargarEstadoActual();
    }, [verificarViajeAsignado])
  );

  const handleEstadoPress = (estado: EstadoChofer) => {
    const config = ESTADOS_CONFIG[estado];

    if (estado === estadoActual) {
      showCustomAlert('Información', 'Ya tienes este estado activo');
      return;
    }

    // Validación especial para CARGANDO: verificar que tenga viaje asignado
    if (estado === EstadoChofer.CARGANDO && estadoActual === EstadoChofer.DISPONIBLE) {
      if (!tieneViajeAsignado) {
        showCustomAlert(
          '⚠️ Viaje no asignado',
          'No puedes cambiar a CARGANDO sin tener un viaje asignado.\n\nEspera a que el administrador te asigne un viaje.',
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Actualizar',
              onPress: () => {
                if (choferData?.id_chofer) {
                  verificarViajeAsignado(choferData.id_chofer);
                }
              }
            }
          ]
        );
        return;
      }
    }

    // Validación: Restricción VIAJANDO → FRANCO/LICENCIA_ANUAL
    if (
      estadoActual === EstadoChofer.VIAJANDO &&
      (estado === EstadoChofer.FRANCO || estado === EstadoChofer.LICENCIA_ANUAL)
    ) {
      showCustomAlert(
        'Cambio no permitido',
        'No puedes tomar franco o licencia mientras estás viajando.\n\n' +
        'Debes completar el viaje primero:\n' +
        '1. Pasar a DESCANSANDO para registrar tu descanso\n' +
        '2. Volver a VIAJANDO después del descanso\n' +
        '3. Cambiar a DESCARGANDO al llegar\n' +
        '4. Finalizar la entrega\n' +
        '5. Volver a DISPONIBLE\n' +
        '6. Ahí podrás pedir franco o licencia',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    // Mostrar diálogo de confirmación antes de proceder
    showCustomAlert(
      '¿Confirmar cambio de estado?',
      `¿Estás seguro de cambiar de "${estadoActual ? ESTADOS_CONFIG[estadoActual]?.label : 'estado actual'}" a "${config.label}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: () => {
            // Proceder con el cambio según el tipo de estado
            if (config.requiresDates) {
              setSelectedEstado(estado);
              setFechaInicio(new Date());
              setFechaFin(null);
              setHasEndDate(false);
              setShowDatesModal(true);
            } else if (config.requiresToneladas) {
              setSelectedEstado(estado);
              setToneladasDescargadas('');
              setShowToneladasModal(true);
            } else {
              actualizarEstado(estado);
            }
          },
          style: 'default'
        }
      ],
      { cancelable: false }
    );
  };

  const actualizarEstado = async (
    estado: EstadoChofer,
    fechaInicioParam?: Date,
    fechaFinParam?: Date | null,
    toneladasParam?: number
  ) => {
    try {
      setUpdating(true);

      const data: any = {
        estado_chofer: estado,
        confirmado: true, // ← OBLIGATORIO desde el backend
      };

      // Solo agregar fechas si es una licencia
      if (ESTADOS_CONFIG[estado].requiresDates) {
        data.fecha_inicio_licencia = fechaInicioParam?.toISOString();
        data.fecha_fin_licencia = fechaFinParam?.toISOString() || null;
      }

      // Agregar toneladas descargadas si es entrega finalizada
      if (ESTADOS_CONFIG[estado].requiresToneladas && toneladasParam !== undefined) {
        data.toneladas_descargadas = toneladasParam;
      }

      await apiClient.patch('/api/v1/choferes/mi-estado', data);

      setEstadoActual(estado);
      showCustomAlert(
        '✅ Estado Actualizado',
        `Tu estado se cambió a: ${ESTADOS_CONFIG[estado].label}`
      );

      setShowDatesModal(false);
      setShowToneladasModal(false);
      setSelectedEstado(null);
    } catch (error: any) {
      // Extraer mensaje de error
      let errorMessage = 'No se pudo actualizar el estado';
      let errorTitle = '⚠️ Error';

      if (error.response?.data?.message) {
        const backendMessage = error.response.data.message;
        // Si el mensaje es un array, unirlo con saltos de línea
        const rawMessage = Array.isArray(backendMessage)
          ? backendMessage.join('\n')
          : backendMessage;

        // Detectar errores específicos y mostrar mensajes con guía paso a paso

        // 1. Error de falta de confirmación
        if (rawMessage.toLowerCase().includes('confirmación') ||
            rawMessage.toLowerCase().includes('confirmar')) {
          errorTitle = '⚠️ Confirmación requerida';
          errorMessage =
            'Este cambio de estado requiere confirmación.\n\n' +
            'Por favor, confirma el cambio e intenta nuevamente.';
        }
        // 2. Error de restricción VIAJANDO → FRANCO/LICENCIA
        else if (
          (rawMessage.toLowerCase().includes('viajando') ||
           rawMessage.toLowerCase().includes('viaje')) &&
          (rawMessage.toLowerCase().includes('franco') ||
           rawMessage.toLowerCase().includes('licencia'))
        ) {
          errorTitle = '❌ Cambio no permitido';
          errorMessage =
            'No puedes tomar franco o licencia mientras estás viajando.\n\n' +
            '📋 Debes completar el viaje primero:\n' +
            '1️⃣ Pasar a DESCANSANDO para registrar tu descanso\n' +
            '2️⃣ Volver a VIAJANDO después del descanso\n' +
            '3️⃣ Cambiar a DESCARGANDO al llegar\n' +
            '4️⃣ Finalizar la entrega\n' +
            '5️⃣ Volver a DISPONIBLE\n' +
            '6️⃣ Ahí podrás pedir franco o licencia';
        }
        // 3. Error genérico de transición no válida
        else if (rawMessage.toLowerCase().includes('cambiar del estado') ||
                 rawMessage.toLowerCase().includes('transición') ||
                 rawMessage.toLowerCase().includes('no se puede')) {
          errorTitle = '⚠️ Transición no permitida';
          errorMessage = rawMessage;
        }
        // 4. Usar mensaje del backend tal cual
        else {
          errorMessage = rawMessage;
        }
      }

      // Log más limpio para errores 400 (transiciones inválidas del flujo)
      if (error.response?.status === 400) {
        console.log(`ℹ️ Transición de estado no permitida: ${errorMessage}`);
      } else {
        // Para otros errores, mostrar más detalles
        console.error('❌ Error al actualizar estado:', error);
      }

      // Mostrar alerta con mensaje descriptivo en todos los casos
      showCustomAlert(errorTitle, errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDates = () => {
    if (!fechaInicio) {
      showCustomAlert('Atención', 'Debes seleccionar una fecha de inicio');
      return;
    }

    if (hasEndDate && !fechaFin) {
      showCustomAlert('Atención', 'Debes seleccionar una fecha de fin o desmarcar la opción');
      return;
    }

    if (hasEndDate && fechaFin && fechaFin < fechaInicio) {
      showCustomAlert('Error', 'La fecha de fin no puede ser anterior a la fecha de inicio');
      return;
    }

    if (selectedEstado) {
      actualizarEstado(selectedEstado, fechaInicio, hasEndDate ? fechaFin : null);
    }
  };

  const handleConfirmToneladas = () => {
    if (!toneladasDescargadas || toneladasDescargadas.trim() === '') {
      showCustomAlert('⚠️ Atención', 'Debes ingresar las toneladas descargadas');
      return;
    }

    const toneladas = parseFloat(toneladasDescargadas.replace(',', '.'));

    if (isNaN(toneladas) || toneladas <= 0) {
      showCustomAlert('⚠️ Error', 'Debes ingresar un número válido mayor a 0');
      return;
    }

    // Validar que no supere las toneladas cargadas en el viaje asignado
    if (viajeAsignado?.toneladas_cargadas) {
      const maxToneladas = parseFloat(viajeAsignado.toneladas_cargadas);
      if (!isNaN(maxToneladas) && toneladas > maxToneladas) {
        showCustomAlert(
          '⚠️ Toneladas excedidas',
          `No puedes descargar más de lo que cargaste.\n\n` +
          `Toneladas cargadas en el viaje: ${maxToneladas}t\n` +
          `Toneladas ingresadas: ${toneladas}t\n\n` +
          `La carga puede disminuir durante el viaje (pérdida por viento, etc.) pero nunca aumentar.`
        );
        return;
      }
    }

    if (selectedEstado) {
      actualizarEstado(selectedEstado, undefined, undefined, toneladas);
    }
  };

  const onStartDateChange = (_event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFechaInicio(selectedDate);
    }
  };

  const onEndDateChange = (_event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFechaFin(selectedDate);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'No seleccionada';
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando estado...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🚛</Text>
        <Text style={styles.headerTitle}>Mi Estado</Text>
        <Text style={styles.headerSubtitle}>
          Actualiza tu estado en tiempo real
        </Text>
        {choferData && (
          <Text style={styles.choferName}>{choferData.nombre_completo}</Text>
        )}
      </View>

      {estadoActual && (
        <View style={styles.currentStateContainer}>
          <Text style={styles.currentStateLabel}>Estado Actual:</Text>
          <View
            style={[
              styles.currentStateBadge,
              { backgroundColor: ESTADOS_CONFIG[estadoActual].backgroundColor },
            ]}
          >
            <Text style={styles.currentStateEmoji}>
              {ESTADOS_CONFIG[estadoActual].emoji}
            </Text>
            <Text style={styles.currentStateText}>
              {ESTADOS_CONFIG[estadoActual].label}
            </Text>
          </View>
        </View>
      )}

      {viajeAsignado && (
        <View style={styles.viajeAsignadoContainer}>
          <View style={styles.viajeHeader}>
            <Text style={styles.viajeHeaderEmoji}>🚛</Text>
            <Text style={styles.viajeHeaderTitle}>Viaje Asignado</Text>
          </View>
          <View style={styles.viajeInfo}>
            {viajeAsignado.origen && (
              <View style={styles.viajeInfoRow}>
                <Text style={styles.viajeInfoLabel}>🏢 Origen:</Text>
                <Text style={styles.viajeInfoValue}>{viajeAsignado.origen}</Text>
              </View>
            )}
            {viajeAsignado.destino && (
              <View style={styles.viajeInfoRow}>
                <Text style={styles.viajeInfoLabel}>📍 Destino:</Text>
                <Text style={styles.viajeInfoValue}>{viajeAsignado.destino}</Text>
              </View>
            )}
            {viajeAsignado.numero_remito && (
              <View style={styles.viajeInfoRow}>
                <Text style={styles.viajeInfoLabel}>📄 Remito:</Text>
                <Text style={styles.viajeInfoValue}>{viajeAsignado.numero_remito}</Text>
              </View>
            )}
            {viajeAsignado.toneladas_cargadas != null && viajeAsignado.toneladas_cargadas > 0 && (
              <View style={styles.viajeInfoRow}>
                <Text style={styles.viajeInfoLabel}>⚖️ Toneladas:</Text>
                <Text style={styles.viajeInfoValue}>{viajeAsignado.toneladas_cargadas}</Text>
              </View>
            )}
            {viajeAsignado.fecha_salida && (
              <View style={styles.viajeInfoRow}>
                <Text style={styles.viajeInfoLabel}>📅 Fecha Salida:</Text>
                <Text style={styles.viajeInfoValue}>
                  {new Date(viajeAsignado.fecha_salida).toLocaleDateString('es-AR')}
                </Text>
              </View>
            )}
            {viajeAsignado.tractor?.patente && (
              <View style={styles.viajeInfoRow}>
                <Text style={styles.viajeInfoLabel}>🚜 Tractor:</Text>
                <Text style={styles.viajeInfoValue}>{viajeAsignado.tractor.patente}</Text>
              </View>
            )}
            {viajeAsignado.batea?.patente && (
              <View style={styles.viajeInfoRow}>
                <Text style={styles.viajeInfoLabel}>🚚 Batea:</Text>
                <Text style={styles.viajeInfoValue}>{viajeAsignado.batea.patente}</Text>
              </View>
            )}
          </View>
          {estadoActual === EstadoChofer.DISPONIBLE && (
            <Text style={styles.viajeHint}>
              💡 Cambia a CARGANDO cuando estés listo para comenzar
            </Text>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>Cambiar Estado:</Text>

      <View style={styles.gridContainer}>
        {(() => {
          // Reordenar: durante la segunda mitad del viaje, mover VIAJANDO
          // justo después de DESCANSANDO para que el siguiente estado
          // siempre esté por debajo del actual
          let estadosOrdenados = Object.keys(ESTADOS_CONFIG) as EstadoChofer[];
          if (reordenarViajando) {
            estadosOrdenados = estadosOrdenados.filter(e => e !== EstadoChofer.VIAJANDO);
            const idxDescansando = estadosOrdenados.indexOf(EstadoChofer.DESCANSANDO);
            estadosOrdenados.splice(idxDescansando + 1, 0, EstadoChofer.VIAJANDO);
          }
          return estadosOrdenados;
        })().map((estado) => {
          const config = ESTADOS_CONFIG[estado];
          const isActive = estado === estadoActual;

          return (
            <TouchableOpacity
              key={estado}
              style={[
                styles.estadoButton,
                isActive 
                  ? { backgroundColor: config.backgroundColor, borderColor: config.backgroundColor } 
                  : { backgroundColor: '#fff', borderColor: config.backgroundColor },
                isActive ? styles.estadoButtonActive : styles.estadoButtonInactive,
              ]}
              onPress={() => handleEstadoPress(estado)}
              disabled={updating}
            >
              <View style={styles.leftIconContainer}>
                <Text style={styles.estadoEmoji}>{config.emoji}</Text>
              </View>
              <Text style={[styles.estadoLabel, { color: isActive ? '#fff' : '#333' }]}>
                {config.label}
              </Text>
              <View style={styles.rightIconContainer}>
                {isActive && <Text style={styles.activeIndicator}>●</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Modal para ingresar fechas */}
      <Modal
        visible={showDatesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedEstado === EstadoChofer.FRANCO ? 'Establecer Duración del Franco' : 'Configurar Licencia'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selectedEstado && ESTADOS_CONFIG[selectedEstado].label}
            </Text>

            {/* Fecha de Inicio */}
            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>Fecha de Inicio *</Text>
              {Platform.OS === 'web' ? (
                React.createElement('input', {
                  type: 'date',
                  min: new Date().toISOString().split('T')[0],
                  value: fechaInicio.toISOString().split('T')[0],
                  onChange: (e: any) => {
                    if (e.target.value) {
                      const date = new Date(e.target.value + 'T12:00:00');
                      setFechaInicio(date);
                    }
                  },
                  style: {
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid #ddd',
                    fontSize: '16px',
                    width: '100%',
                    backgroundColor: '#f9f9f9',
                    boxSizing: 'border-box',
                    color: '#333'
                  }
                })
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={styles.dateButtonText}>
                      📅 {formatDate(fechaInicio)}
                    </Text>
                  </TouchableOpacity>
                  {showStartDatePicker && (
                    <DateTimePicker
                      value={fechaInicio}
                      mode="date"
                      display="default"
                      minimumDate={new Date()}
                      onChange={onStartDateChange}
                    />
                  )}
                </>
              )}
            </View>

            {/* Checkbox para fecha de fin */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => {
                setHasEndDate(!hasEndDate);
                if (hasEndDate) {
                  setFechaFin(null);
                }
              }}
            >
              <View style={styles.checkbox}>
                {hasEndDate && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                Establecer fecha de finalización
              </Text>
            </TouchableOpacity>

            {/* Fecha de Fin (condicional) */}
            {hasEndDate && (
              <View style={styles.dateSection}>
                <Text style={styles.dateLabel}>Fecha de Fin</Text>
                {Platform.OS === 'web' ? (
                  React.createElement('input', {
                    type: 'date',
                    min: fechaInicio.toISOString().split('T')[0],
                    value: fechaFin ? fechaFin.toISOString().split('T')[0] : '',
                    onChange: (e: any) => {
                      if (e.target.value) {
                        const date = new Date(e.target.value + 'T12:00:00');
                        setFechaFin(date);
                      } else {
                        setFechaFin(null);
                      }
                    },
                    style: {
                      padding: '14px',
                      borderRadius: '10px',
                      border: '1px solid #ddd',
                      fontSize: '16px',
                      width: '100%',
                      backgroundColor: '#f9f9f9',
                      boxSizing: 'border-box',
                      color: '#333'
                    }
                  })
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Text style={styles.dateButtonText}>
                        📅 {formatDate(fechaFin)}
                      </Text>
                    </TouchableOpacity>
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={fechaFin || new Date()}
                        mode="date"
                        display="default"
                        minimumDate={fechaInicio}
                        onChange={onEndDateChange}
                      />
                    )}
                  </>
                )}
              </View>
            )}

            <Text style={styles.infoText}>
              * La fecha de fin es opcional. Si no la conoces, puedes dejarla sin
              establecer.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowDatesModal(false);
                  setSelectedEstado(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirmDates}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.modalButtonText,
                      styles.modalButtonTextConfirm,
                    ]}
                  >
                    Confirmar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para ingresar toneladas descargadas */}
      <Modal
        visible={showToneladasModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowToneladasModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Entrega Finalizada</Text>
            <Text style={styles.modalSubtitle}>
              Ingresa las toneladas descargadas
            </Text>

            {viajeAsignado?.toneladas_cargadas != null && (
              <View style={{ backgroundColor: '#E3F2FD', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 14, color: '#1565C0', fontWeight: '600', textAlign: 'center' }}>
                  ⚖️ Toneladas cargadas en este viaje: {parseFloat(viajeAsignado.toneladas_cargadas)}t
                </Text>
                <Text style={{ fontSize: 11, color: '#1976D2', textAlign: 'center', marginTop: 4 }}>
                  No puedes ingresar más de este valor
                </Text>
              </View>
            )}

            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>Toneladas Descargadas *</Text>
              <TextInput
                style={styles.toneladasInput}
                placeholder="Ej: 25.5"
                keyboardType="numeric"
                value={toneladasDescargadas}
                onChangeText={setToneladasDescargadas}
                autoFocus
              />
            </View>

            <Text style={styles.infoText}>
              * Ingresa las toneladas que fueron descargadas. Puedes usar punto o coma como separador decimal.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowToneladasModal(false);
                  setSelectedEstado(null);
                  setToneladasDescargadas('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirmToneladas}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.modalButtonText,
                      styles.modalButtonTextConfirm,
                    ]}
                  >
                    Confirmar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  choferName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 8,
  },
  currentStateContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentStateLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  currentStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  currentStateEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  currentStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  viajeAsignadoContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  viajeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  viajeHeaderEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  viajeHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  viajeInfo: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  viajeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  viajeInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    backgroundColor: '#f9f9f9',
    width: 130,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  viajeInfoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  viajeHint: {
    fontSize: 13,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
  },
  estadoButton: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  estadoButtonActive: {
    transform: [{ scale: 1.02 }],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  estadoButtonInactive: {
    opacity: 1, // Ahora son opacos, solo cambia el relleno
  },
  leftIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  rightIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  estadoEmoji: {
    fontSize: 28,
  },
  estadoLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  activeIndicator: {
    fontSize: 20,
    color: '#FFD700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  dateSection: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCheck: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonConfirm: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalButtonTextConfirm: {
    color: '#fff',
  },
  toneladasInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
});