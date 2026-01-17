# Configuración de API para Producción

## Resumen de Cambios

Se ha configurado el frontend para funcionar automáticamente en desarrollo y producción con el backend desplegado en Render.

---

## Archivos Modificados

### 1. `src/config/api.config.ts` (NUEVO)
**Propósito**: Configuración centralizada de URLs y timeouts

**Características**:
- ✅ Detección automática de ambiente con `__DEV__`
- ✅ URLs separadas para desarrollo y producción
- ✅ Timeout de 40 segundos en producción (cold start de Render)
- ✅ Timeout de 10 segundos en desarrollo (red local rápida)
- ✅ Configuración de retry para cold start
- ✅ Logging de configuración en desarrollo

**Configuración Actual**:
```typescript
Desarrollo:  http://192.168.0.23:3000
Producción:  https://transportes-api-bp41.onrender.com
```

### 2. `src/api/apiClient.ts` (MODIFICADO)
**Cambios realizados**:

#### Imports y configuración inicial:
- Importa `API_CONFIG` y `ENVIRONMENT` desde el archivo de configuración
- Usa `API_CONFIG.ROOT_URL` como baseURL
- Usa `API_CONFIG.TIMEOUT` dinámico según ambiente
- Log automático de configuración en desarrollo

#### Manejo de Cold Start:
Se agregó lógica en el interceptor de respuestas para detectar y manejar el cold start de Render:

1. **Detección**: Detecta timeout en producción (`ECONNABORTED`)
2. **Logging informativo**: Informa al usuario que el servidor está despertando
3. **Retry automático**: Reintenta con timeout extendido (45 segundos)
4. **Prevención de loops**: Usa header `X-Retry-Cold-Start` para evitar reintentos infinitos

**Flujo del Cold Start**:
```
Request → Timeout (40s) → Detectar cold start → Log informativo →
Reintentar con 45s → Success o Error final
```

---

## Cómo Funciona

### Ambiente de Desarrollo
```
__DEV__ = true
↓
URL: http://192.168.0.23:3000
Timeout: 10 segundos
Cold Start: No aplica (servidor local)
```

### Ambiente de Producción
```
__DEV__ = false (build de producción)
↓
URL: https://transportes-api-bp41.onrender.com
Timeout: 40 segundos
Cold Start: Manejo automático con retry
```

---

## Endpoints Críticos a Verificar

### 1. Login (POST /api/v1/auth/login)
**Credenciales de prueba**:
```json
{
  "email": "admin@transporte.com",
  "password": "admin123"
}
```

**Respuesta esperada**:
```json
{
  "access_token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "email": "admin@transporte.com",
    "role": "admin"
  }
}
```

### 2. Obtener información del usuario (GET /api/v1/auth/me)
**Headers**: `Authorization: Bearer {token}`

**Respuesta esperada**:
```json
{
  "id": "uuid",
  "email": "admin@transporte.com",
  "role": "admin",
  "chofer_id": null
}
```

### 3. Obtener choferes (GET /api/v1/choferes)
**Headers**: `Authorization: Bearer {token}`

**Respuesta esperada**:
```json
[
  {
    "id_chofer": "uuid",
    "nombre_completo": "Juan Pérez",
    "estado_chofer": "disponible",
    ...
  }
]
```

### 4. Viaje activo del chofer (GET /api/v1/choferes/mi-viaje-activo)
**Headers**: `Authorization: Bearer {token}` (chofer role)

**Respuesta esperada con viaje**:
```json
{
  "id_viaje": "uuid",
  "destino": "Rosario, Santa Fe",
  "tractor": { "patente": "AB123CD" },
  "batea": { "patente": "XY456ZT" }
}
```

**Respuesta sin viaje**:
```json
null
```

### 5. Actualizar estado del chofer (PATCH /api/v1/choferes/mi-estado)
**Headers**: `Authorization: Bearer {token}` (chofer role)

**Body**:
```json
{
  "estado_chofer": "disponible",
  "confirmado": true
}
```

**Respuesta esperada**:
```json
{
  "id_chofer": "uuid",
  "estado_chofer": "disponible",
  ...
}
```

---

## Testing en Producción

### Paso 1: Verificar que el app está en modo producción
```bash
# Build de producción
eas build --platform android --profile production

# O para testing local en modo producción
npx expo start --no-dev --minify
```

### Paso 2: Verificar la configuración
Al abrir el app, deberías ver en los logs:
```
📡 API Configuration:
   Environment: production
   Base URL: https://transportes-api-bp41.onrender.com/api/v1
   Timeout: 40000ms
```

### Paso 3: Primera request (Cold Start)
Si el servidor está dormido:
1. La primera request tardará ~30-40 segundos
2. Verás un mensaje de loading en el app
3. En los logs verás:
   ```
   ⏰ Timeout detectado - posible cold start del servidor
      El servidor en Render puede tardar ~30 segundos en despertar
      Reintentando con timeout extendido...
   ```
4. El retry debería completarse exitosamente

### Paso 4: Requests subsecuentes
- Deberían ser instantáneas (el servidor ya está despierto)
- El servidor permanece activo por 15 minutos
- Después de 15 minutos de inactividad, vuelve a dormir

---

## Manejo de Errores UX

### Loading States
Asegúrate de que tus componentes muestren estados de loading apropiados:

```typescript
// Ejemplo en login
const [loading, setLoading] = useState(false);
const [loadingMessage, setLoadingMessage] = useState('Conectando...');

const handleLogin = async () => {
  setLoading(true);
  setLoadingMessage('Conectando al servidor...');

  // En producción, el primer intento puede tardar
  setTimeout(() => {
    if (loading) {
      setLoadingMessage('El servidor está despertando, esto puede tardar 30 segundos...');
    }
  }, 5000);

  try {
    await apiClient.post('/api/v1/auth/login', credentials);
    // success
  } catch (error) {
    // error handling
  } finally {
    setLoading(false);
  }
};
```

### Mensajes de Usuario
Considera agregar un mensaje amigable cuando se detecta cold start:

```
"🚀 Conectando al servidor..."
↓ (después de 5 segundos)
"⏰ El servidor está despertando. Esto puede tardar hasta 30 segundos en la primera conexión."
↓ (después del cold start)
"✅ Conectado exitosamente"
```

---

## Troubleshooting

### Problema: Timeout en desarrollo
**Síntoma**: Requests fallan con timeout en red local

**Solución**:
1. Verifica que tu computadora y dispositivo estén en la misma red
2. Verifica que la IP `192.168.0.23` sea correcta
3. Ajusta el timeout en `api.config.ts` si tu red local es lenta:
   ```typescript
   TIMEOUT: isDevelopment ? 20000 : 40000, // 20 segundos para dev
   ```

### Problema: Cold start siempre falla
**Síntoma**: Timeout incluso después del retry

**Posibles causas**:
1. Servidor de Render está caído (verificar en dashboard de Render)
2. Problemas de red del dispositivo
3. Firewall bloqueando conexiones HTTPS

**Solución**:
1. Verificar logs en Render
2. Probar con otra red (datos móviles vs WiFi)
3. Aumentar `COLD_START_TIMEOUT` en `api.config.ts`:
   ```typescript
   COLD_START_TIMEOUT: 60000, // 60 segundos
   ```

### Problema: No detecta el ambiente correctamente
**Síntoma**: Usa URL de producción en desarrollo o viceversa

**Solución**:
1. Limpiar cache: `npx expo start -c`
2. Verificar que estás usando el comando correcto:
   - Desarrollo: `npx expo start`
   - Producción: `npx expo start --no-dev`

### Problema: Requests van a URL incorrecta
**Síntoma**: Errores 404 en todos los endpoints

**Verificar**:
1. Que los endpoints en `apiClient.ts` incluyan `/api/v1/` en el path
2. Que `baseURL` sea `ROOT_URL` (sin `/api/v1`)
3. Ejemplo correcto:
   ```typescript
   baseURL: 'https://transportes-api-bp41.onrender.com'
   endpoint: '/api/v1/choferes' ✅

   // NO usar:
   baseURL: 'https://transportes-api-bp41.onrender.com/api/v1'
   endpoint: '/choferes' ❌
   ```

---

## Optimizaciones Futuras

### 1. Keep-Alive en Producción
Considera implementar un "ping" cada 10 minutos para mantener el servidor despierto:

```typescript
// En el App.tsx o componente raíz
useEffect(() => {
  if (!__DEV__) {
    const keepAlive = setInterval(async () => {
      try {
        await apiClient.get('/api/v1/health');
        console.log('✅ Keep-alive ping exitoso');
      } catch (error) {
        console.log('ℹ️ Keep-alive ping falló (normal si no hay token)');
      }
    }, 10 * 60 * 1000); // 10 minutos

    return () => clearInterval(keepAlive);
  }
}, []);
```

### 2. Cache de Datos
Para reducir la dependencia de requests:
- Implementar AsyncStorage para cachear datos de choferes, tractores, bateas
- Sincronizar en background cuando el servidor responda
- Mostrar datos cacheados mientras se recarga

### 3. Offline Mode
- Detectar cuando el dispositivo está offline
- Mostrar mensaje apropiado
- Permitir ver datos cacheados
- Sincronizar cambios cuando vuelva la conexión

---

## Checklist de Deployment

Antes de cada deployment a producción:

- [ ] Verificar que `API_CONFIG.BASE_URL` en producción apunta a Render
- [ ] Build de producción: `eas build --platform android`
- [ ] Testing en ambiente de producción con `--no-dev`
- [ ] Verificar login con credenciales de prueba
- [ ] Verificar cold start (esperar 15 min y probar)
- [ ] Verificar que todas las pantallas funcionan
- [ ] Verificar cambios de estado de choferes
- [ ] Verificar asignación de viajes
- [ ] Logs limpios sin errores críticos

---

## Contacto y Soporte

Si encuentras problemas:

1. **Verificar logs del backend**: https://dashboard.render.com
2. **Verificar logs del frontend**: Consola de desarrollo de Expo
3. **Verificar conectividad**: Probar endpoints con Postman/Insomnia
4. **Revisar este documento**: Sección de Troubleshooting

---

## Resumen de Beneficios

✅ **Configuración centralizada**: Un solo lugar para cambiar URLs
✅ **Ambiente automático**: No más cambios manuales entre dev y prod
✅ **Manejo de cold start**: UX mejorado con retry automático
✅ **Timeouts optimizados**: 10s en dev, 40s en prod
✅ **Logging informativo**: Debugging más fácil
✅ **Preparado para escalar**: Fácil agregar más ambientes (staging, etc.)