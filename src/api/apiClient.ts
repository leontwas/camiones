import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import { API_CONFIG, ENVIRONMENT } from '../config/api.config';

// Log de configuración SIEMPRE (para verificar que esté funcionando)
console.log('📡 API Configuration:');
console.log(`   Environment: ${ENVIRONMENT}`);
console.log(`   Base URL: ${API_CONFIG.BASE_URL}`);
console.log(`   Timeout: ${API_CONFIG.TIMEOUT}ms (${API_CONFIG.TIMEOUT / 1000} segundos)`);
console.log(`   Cold Start Timeout: ${API_CONFIG.COLD_START_TIMEOUT}ms (${API_CONFIG.COLD_START_TIMEOUT / 1000} segundos)`);

const apiClient = axios.create({
  baseURL: API_CONFIG.ROOT_URL,
  timeout: API_CONFIG.TIMEOUT,
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response) {
      const url = error.config?.url || '';
      const isAuthFlow = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/forgot-password');

      // Silenciar errores de autenticación (manejados por el componente)
      if (isAuthFlow && (error.response.status === 400 || error.response.status === 401)) {
        // No loggear nada - el LoginScreen maneja estos errores
        return Promise.reject(error);
      }

      // Silenciar errores 403 (permisos insuficientes - manejados por componentes)
      if (error.response.status === 403) {
        return Promise.reject(error);
      }

      // Loggear otros errores de forma menos verbosa
      if (error.response.status >= 500) {
        console.error(`Error del servidor [${error.response.status}]:`, url);
      } else if (error.response.status === 401 && !isAuthFlow) {
        console.warn('No autenticado. Redirigir al login.');
      } else if (error.response.status === 400) {
        // Errores 400 - verificar si es del flujo de estados
        const isEstadoFlow = url.includes('/mi-estado') || url.includes('/estado');

        if (isEstadoFlow) {
          // Errores del flujo de estados - log más limpio
          const data = error.response.data as { message?: string } | undefined;
          const message = data?.message || 'Transición no permitida';
          console.log(`ℹ️ Flujo de estados: ${message}`);
        } else {
          // Otros errores 400 - mostrar más detalles para debugging
          console.warn(`Error 400 en ${url}:`, error.response.data);
        }
      } else if (error.response.status >= 400) {
        // Otros errores 4xx (excepto 401 y 403 ya manejados)
        console.warn(`Error cliente [${error.response.status}]:`, url);
      }
    } else if (error.request) {
      // Error de red - posible cold start
      if (error.code === 'ECONNABORTED') {
        console.log('⏰ Timeout detectado - posible cold start del servidor');
        console.log(`   Timeout usado: ${error.config?.timeout}ms`);
        console.log('   El servidor en Render puede tardar hasta 2 minutos en despertar');
        console.log('   Reintentando con timeout extendido...');

        // Reintentar con timeout extendido
        if (error.config && !error.config.headers?.['X-Retry-Cold-Start']) {
          const retryConfig = {
            ...error.config,
            timeout: API_CONFIG.COLD_START_TIMEOUT,
            headers: {
              ...error.config.headers,
              'X-Retry-Cold-Start': 'true',
            },
          };

          console.log(`   Reintentando con timeout de ${API_CONFIG.COLD_START_TIMEOUT / 1000} segundos...`);

          try {
            const response = await axios.request(retryConfig);
            console.log('✅ Reintento exitoso después de cold start');
            return response;
          } catch (retryError) {
            console.error('❌ Error después de reintento:', retryError);
            return Promise.reject(retryError);
          }
        }
      }

      console.error('Error de red: No se recibió respuesta del servidor');
      console.error('Código de error:', error.code);
      console.error('Mensaje:', error.message);
    } else {
      console.error('Error de configuración:', error.message);
    }
    return Promise.reject(error);
  },
);

// ==================== CHOFERES ====================
export const choferesAPI = {
  obtenerTodos: () => apiClient.get('/api/v1/choferes'),
  obtenerPorId: (id_chofer: string) =>
    apiClient.get(`/api/v1/choferes/${id_chofer}`),
  buscarPorApellido: (apellido: string) =>
    apiClient.get(`/api/v1/choferes/search/${apellido}`),
  crear: (data: any) => apiClient.post('/api/v1/choferes', data),
  actualizar: (id_chofer: string, data: any) =>
    apiClient.patch(`/api/v1/choferes/${id_chofer}`, data),
  eliminar: (id_chofer: string) =>
    apiClient.delete(`/api/v1/choferes/${id_chofer}`),
  actualizarEstado: (id_chofer: string, estado: string, razon?: string) =>
    apiClient.patch(`/api/v1/choferes/${id_chofer}/estado`, {
      estado_chofer: estado,
      razon_estado: razon,
    }),
  verificarDisponibilidad: (tractor_id: string, batea_id: string) =>
    apiClient.get(
      `/api/v1/choferes/tractor/${tractor_id}/disponibilidad/${batea_id}`,
    ),
};

// ==================== TRACTORES ====================
export const tractoresAPI = {
  obtenerTodos: () => apiClient.get('/api/v1/tractores'),
  obtenerPorId: (tractor_id: string) =>
    apiClient.get(`/api/v1/tractores/${tractor_id}`),
  crear: (data: any) => apiClient.post('/api/v1/tractores', data),
  actualizar: (tractor_id: string, data: any) =>
    apiClient.patch(`/api/v1/tractores/${tractor_id}`, data),
  eliminar: (tractor_id: string) =>
    apiClient.delete(`/api/v1/tractores/${tractor_id}`),
  cambiarEstado: (tractor_id: string, estado_tractor: string) =>
    apiClient.patch(`/api/v1/tractores/${tractor_id}/estado`, {
      estado_tractor,
    }),
  asignarChofer: (tractor_id: string, chofer_id: string) =>
    apiClient.patch(`/api/v1/tractores/${tractor_id}/chofer/${chofer_id}`),
  asignarBatea: (tractor_id: string, batea_id: string) =>
    apiClient.patch(`/api/v1/tractores/${tractor_id}/batea/${batea_id}`),
};

// ==================== BATEAS ====================
export const bateasAPI = {
  obtenerTodos: () => apiClient.get('/api/v1/bateas'),
  obtenerPorId: (batea_id: string) =>
    apiClient.get(`/api/v1/bateas/${batea_id}`),
  crear: (data: any) => apiClient.post('/api/v1/bateas', data),
  actualizar: (batea_id: string, data: any) =>
    apiClient.patch(`/api/v1/bateas/${batea_id}`, data),
  eliminar: (batea_id: string) =>
    apiClient.delete(`/api/v1/bateas/${batea_id}`),
  cambiarEstado: (batea_id: string, estado: string) =>
    apiClient.patch(`/api/v1/bateas/${batea_id}/estado`, { estado }),
  asignarChofer: (batea_id: string, chofer_id: string) =>
    apiClient.patch(`/api/v1/bateas/${batea_id}/chofer/${chofer_id}`),
  asignarTractor: (batea_id: string, tractor_id: string) =>
    apiClient.patch(`/api/v1/bateas/${batea_id}/tractor/${tractor_id}`),
};

// ==================== VIAJES ====================
export const viajesAPI = {
  crear: (data: any) => apiClient.post('/api/v1/viajes', data),
  obtenerTodos: () => apiClient.get('/api/v1/viajes'),
  obtenerPorId: (id: string) => apiClient.get(`/api/v1/viajes/${id}`),
  eliminar: (id: string) => apiClient.delete(`/api/v1/viajes/${id}`),
};

export default apiClient;