# Configuración de Timeouts para Render Cold Start

## Problema
Render (free tier) "duerme" el servidor después de 15 minutos de inactividad. Cuando se hace la primera petición después de este período, el servidor puede tardar hasta 2 minutos en despertar ("cold start").

## Solución Implementada

### Timeouts Configurados

**Desarrollo (local):**
- Timeout inicial: 10 segundos

**Producción (Render):**
- Timeout inicial: **20 minutos** (1,200,000 ms)
- Timeout de reintento (cold start): **30 minutos** (1,800,000 ms)
- **Tiempo total máximo de espera: 50 minutos**

### Archivos Modificados

#### 1. `src/config/api.config.ts`
```typescript
export const API_CONFIG = {
  BASE_URL: isDevelopment
    ? 'http://192.168.0.23:3000/api/v1'
    : 'https://transportes-api-bp41.onrender.com/api/v1',

  ROOT_URL: isDevelopment
    ? 'http://192.168.0.23:3000'
    : 'https://transportes-api-bp41.onrender.com',

  // Timeout: 20 minutos para producción (cold start de Render extremadamente lento)
  // 10 segundos para desarrollo
  TIMEOUT: isDevelopment ? 10000 : 1200000,

  // Timeout para el cold start (primera request después de inactividad)
  COLD_START_TIMEOUT: 1800000, // 30 minutos

  // Configuración de retry para cold start
  RETRY_CONFIG: {
    maxRetries: 2,
    retryDelay: 2000, // 2 segundos entre reintentos
  },
};
```

#### 2. `src/api/apiClient.ts`
- **Retry automático**: Si la primera petición falla por timeout en producción, reintenta automáticamente con el timeout extendido de 30 minutos
- **Header de identificación**: Añade `X-Retry-Cold-Start: true` para evitar reintentos infinitos
- **Logging claro**: Mensajes informativos sobre el proceso de cold start

```typescript
if (!__DEV__ && error.code === 'ECONNABORTED') {
  console.log('⏰ Timeout detectado - posible cold start del servidor');
  console.log('   Reintentando con timeout extendido...');

  if (error.config && !error.config.headers?.['X-Retry-Cold-Start']) {
    const retryConfig = {
      ...error.config,
      timeout: API_CONFIG.COLD_START_TIMEOUT,
      headers: {
        ...error.config.headers,
        'X-Retry-Cold-Start': 'true',
      },
    };

    return await axios.request(retryConfig);
  }
}
```

#### 3. `src/screen/LoginScreen.tsx`
- **Mensaje dinámico**: Cambia después de 5 segundos para informar al usuario sobre el cold start
- **UX mejorada**: Loading indicator con mensaje informativo

```typescript
const [loadingMessage, setLoadingMessage] = useState('Conectando...');

// Cambiar mensaje después de 5 segundos (posible cold start)
const coldStartTimer = setTimeout(() => {
  if (loading) {
    setLoadingMessage(
      '⏰ Despertando el servidor...\n' +
      'Esto puede tardar hasta 2 minutos en la primera conexión.\n' +
      'Por favor, ten paciencia.'
    );
  }
}, 5000);
```

## Flujo de Login con Cold Start

1. **Usuario intenta login** → Mensaje: "Conectando al servidor..."
2. **Después de 5 segundos** → Mensaje cambia a: "⏰ Despertando el servidor... Esto puede tardar hasta 2 minutos..."
3. **Primera petición** → Espera hasta 20 minutos
4. **Si falla por timeout** → Retry automático con timeout de 30 minutos
5. **Total posible espera** → 50 minutos (20 + 30)

## Detección de Ambiente

El sistema detecta automáticamente el ambiente usando `__DEV__`:
- `__DEV__ = true` → Desarrollo (localhost, timeout 10s)
- `__DEV__ = false` → Producción (Render, timeout 20 min)

No se requiere configuración manual.

## Testing

### Probar el Cold Start
1. Esperar 15+ minutos sin actividad en Render
2. Abrir la app e intentar login
3. Observar:
   - Mensaje inicial "Conectando al servidor..."
   - Después de 5s: "⏰ Despertando el servidor..."
   - Esperar hasta 2 minutos para que el servidor despierte
   - Login exitoso

### Logs en Consola (Producción)
```
📡 API Configuration:
   Environment: production
   Base URL: https://transportes-api-bp41.onrender.com/api/v1
   Timeout: 1200000ms

⏰ Timeout detectado - posible cold start del servidor
   Reintentando con timeout extendido...
```

## Consideraciones

### ¿Por qué timeouts tan largos?
- Render free tier puede ser **extremadamente lento** al despertar
- El usuario reportó que incluso 120 segundos no era suficiente
- Se incrementó 10x (de 120s a 1200s) según solicitud del usuario

### ¿Afecta al desarrollo?
No. En desarrollo (`__DEV__ = true`) el timeout sigue siendo 10 segundos.

### ¿Es esto normal?
Es una limitación del free tier de Render. Alternativas:
1. **Mantener el servidor activo** con pings periódicos (no recomendado en free tier)
2. **Upgrade a plan pago** de Render (servidor siempre activo)
3. **Cambiar a otro host** con mejores características en free tier
4. **Aceptar el cold start** y educar a los usuarios (solución actual)

## Próximos Pasos

1. ✅ Configuración implementada
2. 🔄 **Pendiente: Testing por usuario** con timeout de 20 minutos
3. ⏳ Si 20 minutos no es suficiente, incrementar nuevamente

## Comandos Útiles

### Ver logs en tiempo real (Render)
```bash
# Visita el dashboard de Render y ve a "Logs"
```

### Probar en desarrollo
```bash
npm start
# o
npx expo start
```

### Probar en producción (build)
```bash
# Android
eas build --platform android

# iOS
eas build --platform ios
```

## Contacto y Soporte

Si el problema persiste:
1. Revisar logs del backend en Render
2. Verificar que el servidor esté arrancando correctamente
3. Considerar upgrade del plan de Render
4. Contactar soporte de Render si el cold start es excesivo

---

**Última actualización**: 2026-01-13
**Configurado para**: Render free tier (https://transportes-api-bp41.onrender.com)