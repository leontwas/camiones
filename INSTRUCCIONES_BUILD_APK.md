# Instrucciones para Generar APK de Android

## ✅ Preparación Completada

Se han realizado los siguientes cambios para asegurar que la app funcione correctamente después de compilar:

### 1. Placeholders Visibles
- **Problema anterior**: Los placeholders con color `#999` eran demasiado claros y no se veían después de compilar
- **Solución**: Se cambió `placeholderTextColor` de `#999` a `#666` en TODOS los formularios
- **Archivos modificados**:
  - `src/screen/LoginScreen.tsx` (2 placeholders)
  - `src/screen/RegisterScreen.tsx` (4 placeholders)
  - `src/screen/gestonarChoferes.tsx` (2 placeholders)
  - `src/screen/gestionarTractores.tsx` (7 placeholders)
  - `src/screen/gestionarBateas.tsx` (7 placeholders)

### 2. Configuración de Android en app.json
- Añadido `package`: `com.tractoresapp.transporte`
- Añadido `versionCode`: 1
- Añadidos permisos: `INTERNET`, `ACCESS_NETWORK_STATE`

## 📱 Opciones para Generar APK

### Opción 1: Build con Expo (Recomendado - Más Simple)

Este método NO requiere Android Studio ni configuración compleja.

#### Paso 1: Instalar EAS CLI
```bash
npm install -g eas-cli
```

#### Paso 2: Login en Expo
```bash
eas login
```

Si no tienes cuenta, crea una en [expo.dev](https://expo.dev)

#### Paso 3: Configurar EAS
```bash
eas build:configure
```

Esto creará un archivo `eas.json`. Acepta las configuraciones por defecto.

#### Paso 4: Crear el Build APK
```bash
eas build --platform android --profile preview
```

Este comando:
- Creará un APK instalable (no AAB para Google Play)
- Subirá el código a los servidores de Expo
- Compilará en la nube
- Te dará un link de descarga cuando termine (~10-15 minutos)

#### Paso 5: Descargar e Instalar
1. Cuando termine el build, recibirás un link
2. Descarga el APK desde ese link
3. Transfiere el APK a tu teléfono Android
4. Instala el APK (necesitas habilitar "Instalar apps desconocidas")

### Opción 2: Build Local (Requiere Android Studio)

⚠️ **Solo usa esta opción si:**
- Tienes Android Studio instalado y configurado
- Tienes experiencia con builds nativos
- Necesitas hacer debug profundo

#### Requisitos:
1. Android Studio instalado
2. SDK de Android configurado
3. JDK 17 instalado
4. Variables de entorno configuradas:
   - `ANDROID_HOME`
   - `JAVA_HOME`

#### Pasos:
```bash
# 1. Prebuild (genera carpeta android/)
npx expo prebuild --platform android

# 2. Ir a la carpeta android
cd android

# 3. Generar APK con Gradle
./gradlew assembleRelease

# El APK estará en:
# android/app/build/outputs/apk/release/app-release.apk
```

## 🎯 Configuración Recomendada en eas.json

Si EAS pregunta, usa esta configuración:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

## 📋 Checklist Pre-Build

Antes de generar el APK, verifica:

- ✅ Todos los placeholders son visibles con color `#666`
- ✅ La app funciona correctamente en desarrollo
- ✅ `app.json` tiene configuración de Android correcta
- ✅ El backend de producción está funcionando (https://transportes-api-bp41.onrender.com)
- ✅ Los timeouts de API están configurados (20 minutos)
- ✅ No hay errores de TypeScript

## 🔍 Verificación Post-Build

Después de instalar el APK en un dispositivo:

1. **Verificar placeholders**:
   - Abrir pantalla de Login
   - Verificar que se vea "admin@ejemplo.com" en el campo email
   - Verificar que se vea "••••••••" en el campo contraseña

2. **Verificar conectividad**:
   - Intentar login con credenciales reales
   - Verificar que se conecta al backend de Render
   - Esperar hasta 2 minutos para el cold start

3. **Verificar funcionalidades**:
   - Login como Admin
   - Login como Chofer
   - Cambio de estado de chofer
   - Asignación de viajes
   - Gestión de recursos

## 🐛 Solución de Problemas

### Problema: Placeholders no se ven en el APK
**Solución**: Ya está resuelto. Todos los placeholders ahora usan `#666` (gris medio visible).

### Problema: "Could not connect to development server"
**Solución**: Esto es normal en un APK. El APK compilado no necesita Metro bundler.

### Problema: Timeout al hacer login
**Solución**:
- El servidor en Render puede tardar hasta 2 minutos en despertar
- La app está configurada para esperar hasta 20 minutos
- Mensaje informativo aparecerá después de 5 segundos

### Problema: "App not installed"
**Solución**:
1. Ir a Configuración > Seguridad
2. Habilitar "Instalar apps desconocidas" para tu navegador o gestor de archivos
3. Reintentar instalación

### Problema: Build falla en EAS
**Solución**:
- Verifica que no haya errores de TypeScript: `npx tsc --noEmit`
- Verifica que todas las dependencias estén instaladas: `npm install`
- Revisa los logs del build en expo.dev

## 📊 Información del APK

- **Nombre del paquete**: `com.tractoresapp.transporte`
- **Versión**: 1.0.0 (versionCode: 1)
- **Orientación**: Portrait (vertical)
- **Tamaño estimado**: ~50-80 MB

## 🚀 Próximos Pasos

Después de generar el APK:

1. **Testing**: Probar en al menos 2 dispositivos diferentes
2. **Feedback**: Recopilar feedback de usuarios
3. **Iteración**: Hacer ajustes según feedback
4. **Publicación**: Si todo funciona bien, considerar:
   - Subir a Google Play Store (requiere AAB en lugar de APK)
   - Distribución interna vía link de descarga
   - Sistema de actualizaciones OTA con Expo Updates

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del build en expo.dev
2. Verifica que todas las dependencias estén actualizadas
3. Consulta la documentación oficial: https://docs.expo.dev/build/setup/

---

**Última actualización**: 2026-01-13
**Configurado para**: Render backend (https://transportes-api-bp41.onrender.com)