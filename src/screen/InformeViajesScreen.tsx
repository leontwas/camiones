import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { viajesAPI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { Viaje } from '../types/chofer';

export const InformeViajesScreen = () => {
  const { isAuthenticated, user } = useAuth();
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar viajes si está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      cargarViajes();
    }
  }, [isAuthenticated, user]);

  // Recargar viajes cada vez que la pantalla obtiene foco
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        console.log('📊 InformeViajesScreen obtuvo foco - recargando viajes...');
        cargarViajes();
      }
    }, [isAuthenticated])
  );

  const cargarViajes = async () => {
    setLoading(true);
    try {
      const response = await viajesAPI.obtenerTodos();
      setViajes(response.data || []);
    } catch (error) {
      console.error('Error al cargar viajes:', error);

      // Manejo de errores 403 (Prohibido)
      if ((error as any).response?.status === 403) {
        if (user?.rol === 'admin') {
          Alert.alert('Acceso Denegado', 'No tienes permisos para ver los informes.');
        } else {
          // Si es chofer y da 403, probablemente el backend aún no permite su acceso
          // o no hay una ruta específica para sus viajes.
          Alert.alert('Acceso Denegado', 'Aún no tienes acceso a tus viajes. Contacta al administrador.');
        }
      } else if ((error as any).response?.status !== 401) {
        Alert.alert('Error', 'No se pudieron cargar los viajes');
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para determinar el color de fila según origen y destino
  const getRowColor = (origen: string, destino: string): string => {
    const origenLower = origen.toLowerCase();
    const destinoLower = destino.toLowerCase();

    // Mangrullo -> amarillo, excepto si destino es Sand Point -> verde
    if (origenLower.includes('mangrullo')) {
      if (destinoLower.includes('sand point')) {
        return '#90EE90'; // Verde claro
      }
      return '#FFEB3B'; // Amarillo
    }

    // San Pedro -> celeste
    if (origenLower.includes('san pedro')) {
      return '#87CEEB'; // Celeste
    }

    // San Nicolas -> violeta
    if (origenLower.includes('san nicolas') || origenLower.includes('san nicolás')) {
      return '#BA68C8'; // Violeta
    }

    // Cristamine -> naranja
    if (origenLower.includes('cristamine')) {
      return '#FFA726'; // Naranja
    }

    // Chola -> gris
    if (origenLower.includes('chola')) {
      return '#BDBDBD'; // Gris
    }

    // Default -> blanco
    return '#FFFFFF';
  };

  // Función para formatear fecha y hora
  const formatearFechaHora = (fecha?: string): string => {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    const hora = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${año}\n${hora}:${min}`;
  };

  // Función para obtener el texto del estado del viaje
  const getEstadoTexto = (viaje: Viaje): string => {
    const estadoViaje = viaje.estado_viaje?.toLowerCase() || '';

    // Si el viaje NO está finalizado ni en reclamo, lo consideramos "activo"
    // y mostramos el estado actual del chofer para mayor detalle
    const esViajeActivo = estadoViaje !== 'finalizado' && estadoViaje !== 'en_reclamo';

    if (esViajeActivo && viaje.chofer?.estado_chofer) {
      const estadoChofer = viaje.chofer.estado_chofer.toLowerCase();
      switch (estadoChofer) {
        case 'disponible': return 'Disponible';
        case 'cargando': return 'Cargando';
        case 'viajando': return 'Viajando';
        case 'descansando': return 'Descansando';
        case 'descargando': return 'Descargando';
        case 'entrega_finalizada': return 'Entrega Finalizada';
        case 'licencia_anual': return 'Licencia Anual';
        case 'franco': return 'Franco';
        case 'equipo_en_reparacion': return 'En Reparación';
        case 'inactivo': return 'Inactivo';
        default: return estadoChofer.charAt(0).toUpperCase() + estadoChofer.slice(1);
      }
    }

    // Para otros estados de viaje (finalizado o en reclamo), mostrar el texto estándar
    switch (estadoViaje) {
      case 'finalizado':
        return 'Finalizado';
      case 'en_reclamo':
        return 'En Reclamo';
      default:
        // Si no tenemos estado de chofer pero el viaje es activo, mostramos el estado del viaje formateado
        return estadoViaje.charAt(0).toUpperCase() + estadoViaje.slice(1);
    }
  };

  // Función para formatear horas de descanso de forma segura
  const formatearHorasDescanso = (horas?: number | string | null): string => {
    if (horas === null || horas === undefined || horas === '') return 'N/A';

    // Convertir a número por si viene como string desde el backend
    const numHoras = typeof horas === 'string' ? parseFloat(horas) : horas;

    if (isNaN(numHoras)) return 'N/A';

    return `${numHoras.toFixed(1)}h`;
  };

  // Función para eliminar un viaje (solo admin)
  const handleEliminarViaje = (viaje: Viaje) => {
    // Validación del ID antes de proceder
    if (!viaje?.id_viaje) {
      console.error('❌ Error: id_viaje no está definido', viaje);
      Alert.alert('❌ Error', 'No se puede eliminar: ID de viaje inválido');
      return;
    }

    // El id_viaje ya es un número según el tipo
    const viajeId = viaje.id_viaje;

    // Validar que sea un número válido
    if (isNaN(viajeId) || viajeId <= 0) {
      console.error('❌ Error: id_viaje no es un número válido:', viaje.id_viaje);
      Alert.alert('❌ Error', `ID de viaje inválido: ${viaje.id_viaje}`);
      return;
    }

    console.log('🔍 Eliminando viaje con ID:', viajeId, '(tipo:', typeof viajeId, ')');

    Alert.alert(
      '🗑️ Eliminar Viaje',
      `¿Estás seguro que deseas eliminar este viaje?\n\nID: ${viajeId}\nChofer: ${viaje.chofer?.nombre_completo || 'N/A'}\nOrigen: ${viaje.origen}\nDestino: ${viaje.destino}`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('📤 Enviando DELETE para viaje ID:', viajeId);
              await viajesAPI.eliminar(viajeId.toString());
              Alert.alert('✅ Éxito', 'El viaje ha sido eliminado correctamente');
              // Recargar la lista de viajes
              cargarViajes();
            } catch (error: any) {
              console.error('❌ Error al eliminar viaje:', error);
              console.error('❌ Error response:', error.response?.data);

              let errorMessage = 'No se pudo eliminar el viaje';

              if (error.response?.status === 400) {
                errorMessage = 'Error 400: ID de viaje inválido o petición mal formada';
              } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              }

              Alert.alert('❌ Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const isAdmin = user?.rol === 'admin';

  const renderTablaHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.fechaCargaCol]}>F/H Carga</Text>
      <Text style={[styles.headerCell, styles.origenCol]}>Origen</Text>
      <Text style={[styles.headerCell, styles.destinoCol]}>Destino</Text>
      <Text style={[styles.headerCell, styles.remitoCol]}>N° Remito</Text>
      <Text style={[styles.headerCell, styles.toneladasCol]}>Ton. Desc.</Text>
      <Text style={[styles.headerCell, styles.horasDescansadasCol]}>Hs de Desc.</Text>
      <Text style={[styles.headerCell, styles.choferCol]}>Chofer</Text>
      <Text style={[styles.headerCell, styles.tractorCol]}>Tractor</Text>
      <Text style={[styles.headerCell, styles.bateaCol]}>Batea</Text>
      <Text style={[styles.headerCell, styles.estadoCol]}>Estado</Text>
      {isAdmin && <Text style={[styles.headerCell, styles.accionesCol]}>Acciones</Text>}
    </View>
  );

  const renderViajeRow = (viaje: Viaje) => {
    const backgroundColor = getRowColor(viaje.origen, viaje.destino);

    return (
      <View key={viaje.id_viaje} style={[styles.tableRow, { backgroundColor }]}>
        <Text style={[styles.cell, styles.fechaCargaCol]}>
          {formatearFechaHora(viaje.fecha_salida)}
        </Text>
        <Text style={[styles.cell, styles.origenCol]}>{viaje.origen}</Text>
        <Text style={[styles.cell, styles.destinoCol]}>{viaje.destino}</Text>
        <Text style={[styles.cell, styles.remitoCol]}>
          {viaje.numero_remito || 'N/A'}
        </Text>
        <Text style={[styles.cell, styles.toneladasCol]}>
          {viaje.toneladas_descargadas ? `${viaje.toneladas_descargadas}t` : 'N/A'}
        </Text>
        <Text style={[styles.cell, styles.horasDescansadasCol]}>
          {formatearHorasDescanso(viaje.horas_descansadas)}
        </Text>
        <Text style={[styles.cell, styles.choferCol]}>
          {viaje.chofer?.nombre_completo || 'N/A'}
        </Text>
        <Text style={[styles.cell, styles.tractorCol]}>
          {viaje.tractor?.patente || 'N/A'}
        </Text>
        <Text style={[styles.cell, styles.bateaCol]}>
          {viaje.batea?.patente || 'N/A'}
        </Text>
        <Text style={[styles.cell, styles.estadoCol]}>
          {getEstadoTexto(viaje)}
        </Text>
        {isAdmin && (
          <View style={[styles.cell, styles.accionesCol]}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleEliminarViaje(viaje)}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Informe de Viajes</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando viajes...</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          style={styles.horizontalScroll}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.tableContainer}>
            {renderTablaHeader()}
            <ScrollView
              style={styles.verticalScroll}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={cargarViajes} />
              }
            >
              {viajes.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No hay viajes registrados</Text>
                </View>
              ) : (
                viajes.map((viaje) => renderViajeRow(viaje))
              )}
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* Leyenda de colores */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Leyenda de Colores:</Text>
        <View style={styles.legendGrid}>
          {[
            { id: 'mangrullo', color: '#FFEB3B', text: 'Mangrullo' },
            { id: 'mangrullo-sand', color: '#90EE90', text: 'Mangrullo → Sand Point' },
            { id: 'san-pedro', color: '#87CEEB', text: 'San Pedro' },
            { id: 'san-nicolas', color: '#BA68C8', text: 'San Nicolas' },
            { id: 'cristamine', color: '#FFA726', text: 'Cristamine' },
            { id: 'chola', color: '#BDBDBD', text: 'Chola' },
          ].map((legend) => (
            <View key={legend.id} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: legend.color }]} />
              <Text style={styles.legendText}>{legend.text}</Text>
            </View>
          ))}
        </View>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  horizontalScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  verticalScroll: {
    maxHeight: 500,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#0056b3',
  },
  headerCell: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  cell: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  // Anchos de columnas
  fechaCargaCol: {
    width: 90,
  },
  origenCol: {
    width: 100,
  },
  destinoCol: {
    width: 100,
  },
  remitoCol: {
    width: 100,
  },
  toneladasCol: {
    width: 80,
  },
  horasDescansadasCol: {
    width: 90,
  },
  choferCol: {
    width: 150,
  },
  tractorCol: {
    width: 100,
  },
  bateaCol: {
    width: 100,
  },
  estadoCol: {
    width: 120,
  },
  accionesCol: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  legendContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#999',
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
});