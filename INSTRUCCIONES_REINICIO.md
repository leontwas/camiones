# Instrucciones para Reiniciar la App

## ⚠️ IMPORTANTE: Los cambios en la configuración requieren reiniciar completamente

### Paso 1: Detener todo
```bash
# Presiona Ctrl+C en la terminal donde corre Expo
# O cierra la terminal completamente
```

### Paso 2: Limpiar caché de Metro bundler
```bash
npx expo start -c
```

Este comando:
- `-c` limpia la caché del bundler
- Asegura que los nuevos valores de timeout se carguen

### Paso 3: Recargar la app
1. Si usas Expo Go: Cierra la app completamente y vuelve a abrirla
2. Si usas emulador: Reinicia la app

### Paso 4: Verificar en consola
Cuando la app inicie, deberías ver:
```
📡 API Configuration:
   Environment: development (o production)
   Base URL: https://transportes-api-bp41.onrender.com/api/v1
   Timeout: 300000ms (300 segundos)
   Cold Start Timeout: 1800000ms (1800 segundos)
```

### Paso 5: Intentar login
Ahora debería esperar:
- **5 minutos** (300 segundos) en desarrollo
- **20 minutos** (1200 segundos) en producción
- Si falla, **reintenta automáticamente** con 30 minutos más

## ¿Sigue sin funcionar?

Si ves que el timeout sigue siendo de ~3 segundos:

1. Verifica que veas los logs de configuración en consola
2. Si NO ves los logs, el archivo de config no se está cargando
3. Asegúrate de haber limpiado la caché: `npx expo start -c`

## Configuraciones actuales:

- **Desarrollo**: 5 minutos (300 segundos)
- **Producción**: 20 minutos (1200 segundos)
- **Retry**: 30 minutos (1800 segundos)
- **Total máximo**: 50 minutos en producción, 35 minutos en desarrollo