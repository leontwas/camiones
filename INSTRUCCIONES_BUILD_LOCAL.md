# Build Local de APK (Alternativa a EAS Build)

## Cuándo usar este método

Usa este método si:
- EAS Build está fallando con errores 504 Gateway Timeout
- Necesitas el APK urgentemente
- Tienes experiencia con Android Studio

## Requisitos

### 1. Instalar Android Studio
- Descarga desde: https://developer.android.com/studio
- Durante la instalación, asegúrate de instalar:
  - Android SDK
  - Android SDK Platform-Tools
  - Android Emulator (opcional)

### 2. Configurar Variables de Entorno

**En Windows:**
1. Buscar "Variables de entorno" en el menú inicio
2. Añadir estas variables de sistema:

```
ANDROID_HOME = C:\Users\TU_USUARIO\AppData\Local\Android\Sdk
```

3. Añadir a PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

**Para verificar:**
```bash
adb --version
# Debería mostrar: Android Debug Bridge version X.X.X
```

### 3. Instalar Java JDK 17

```bash
# Verificar si ya tienes Java
java -version

# Si no tienes o es una versión diferente, descarga JDK 17 desde:
# https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html
```

Añadir variable de entorno:
```
JAVA_HOME = C:\Program Files\Java\jdk-17
```

## Pasos para Build Local

### 1. Generar carpeta android (si no existe)

```bash
npx expo prebuild --platform android --clean
```

### 2. Ir a la carpeta android

```bash
cd android
```

### 3. Generar APK

```bash
# Windows (usando gradlew.bat)
.\gradlew.bat assembleRelease

# Linux/Mac
./gradlew assembleRelease
```

Este proceso puede tardar 5-15 minutos la primera vez (descarga dependencias).

### 4. Encontrar el APK

El APK estará en:
```
android\app\build\outputs\apk\release\app-release.apk
```

### 5. Instalar en dispositivo

**Opción A: Por cable USB**
```bash
# Asegúrate de tener USB debugging habilitado
adb install app-release.apk
```

**Opción B: Transferencia manual**
- Copia `app-release.apk` a tu teléfono
- Abre el archivo en el teléfono
- Instala (necesitas habilitar "Instalar apps desconocidas")

## Solución de Problemas

### Error: "ANDROID_HOME not set"
**Solución**: Configura la variable de entorno ANDROID_HOME como se indica arriba.

### Error: "Java version incompatible"
**Solución**: Necesitas JDK 17. Verifica con `java -version`.

### Error: "SDK location not found"
**Solución**:
1. Ve a `android/local.properties`
2. Añade: `sdk.dir=C:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk`
   (usa tu ruta real al SDK)

### Error: "gradlew: command not found"
**Solución**: Asegúrate de estar en la carpeta `android/`:
```bash
cd android
dir gradlew.bat  # Debería existir
```

### Error durante el build de Gradle
**Solución**: Limpia y reintenta:
```bash
.\gradlew.bat clean
.\gradlew.bat assembleRelease
```

### Error: "Execution failed for task ':app:mergeReleaseResources'"
**Solución**: Puede ser falta de memoria. Edita `android/gradle.properties` y añade:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
```

## Ventajas del Build Local

✅ Control total del proceso
✅ No depende de servidores de EAS
✅ Más rápido para debugging (una vez configurado)
✅ Puedes debuggear errores de Gradle directamente

## Desventajas del Build Local

❌ Requiere Android Studio (>10 GB de descarga)
❌ Configuración inicial más compleja
❌ Dependencias de Gradle se descargan en tu máquina (~1-2 GB)
❌ Necesitas mantener el entorno actualizado

## Volver a EAS Build

Una vez que los servidores de EAS se recuperen, puedes volver a usar:
```bash
eas build --platform android --profile preview
```

Y eliminar la carpeta `android/` local:
```bash
cd ..
rm -rf android
```

---

**Nota**: Esta guía asume que ya tienes el proyecto configurado y funcionando en desarrollo.