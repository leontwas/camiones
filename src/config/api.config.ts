/**
 * Configuración centralizada del API
 *
 * Este archivo maneja la configuración de URLs y timeouts para
 * desarrollo y producción de forma automática.
 */

// Detección automática del ambiente
// FORZAR PRODUCCIÓN: Cambiar a false para usar siempre Render
const isDevelopment = true; // __DEV__;

/**
 * URLs del API según ambiente
 */
export const API_CONFIG = {
  // URL base completa (incluye /api/v1)
  BASE_URL: isDevelopment
    ? 'http://localhost:3000/api/v1'
    : 'https://transportes-api-bp41.onrender.com/api/v1',

  // URL raíz (sin /api/v1) - por si se necesita
  ROOT_URL: isDevelopment
    ? 'http://localhost:3000'
    : 'https://transportes-api-bp41.onrender.com',

  // Timeout: 20 minutos para producción (cold start de Render extremadamente lento)
  // 5 minutos para desarrollo (también puede haber cold start en dev)
  TIMEOUT: isDevelopment ? 300000 : 1200000,

  // Timeout para el cold start (primera request después de inactividad)
  COLD_START_TIMEOUT: 1800000, // 30 minutos

  // Configuración de retry para cold start
  RETRY_CONFIG: {
    maxRetries: 2,
    retryDelay: 2000, // 2 segundos entre reintentos
  },
};

/**
 * Ambiente actual
 */
export const ENVIRONMENT = isDevelopment ? 'development' : 'production';

/**
 * Información de logging
 */
export const logApiConfig = () => {
  console.log('📡 API Configuration:');
  console.log(`   Environment: ${ENVIRONMENT}`);
  console.log(`   Base URL: ${API_CONFIG.BASE_URL}`);
  console.log(`   Timeout: ${API_CONFIG.TIMEOUT}ms`);
};

/**
 * Credenciales de prueba (solo para desarrollo)
 */
export const TEST_CREDENTIALS = isDevelopment
  ? {
      email: 'admin@transporte.com',
      password: 'admin123',
    }
  : null;