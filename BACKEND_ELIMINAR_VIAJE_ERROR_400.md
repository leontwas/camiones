# Solución: Error 400 al Eliminar Viaje

## 🔍 Diagnóstico

### Problema Reportado
Al intentar eliminar un viaje desde el frontend, se recibe el error:
```
AxiosError: Request failed with status code 400
```

### Causa Identificada

El endpoint `DELETE /api/v1/viajes/:id_viaje` utiliza **ParseIntPipe** en el controller:

```typescript
@Delete(':id_viaje')
@Roles(RolUsuario.ADMIN)
async eliminar(
    @Param('id_viaje', ParseIntPipe) id_viaje: number,  // ← ParseIntPipe valida aquí
    @Request() req
) {
    return this.viajesService.eliminar(id_viaje, req.user);
}
```

**ParseIntPipe** valida que el parámetro sea un número entero válido. Si el valor no es válido, retorna **400 Bad Request** ANTES de ejecutar el método eliminar().

### Valores que Causan Error 400

❌ **Estos valores causan error 400:**
- `undefined` → `DELETE /api/v1/viajes/undefined`
- `null` → `DELETE /api/v1/viajes/null`
- `""` (string vacío) → `DELETE /api/v1/viajes/`
- `"abc"` → `DELETE /api/v1/viajes/abc`
- `NaN` → `DELETE /api/v1/viajes/NaN`

✅ **Estos valores son válidos:**
- `1` → `DELETE /api/v1/viajes/1`
- `123` → `DELETE /api/v1/viajes/123`
- `"456"` (string numérico) → `DELETE /api/v1/viajes/456`

## 🛠️ Solución en el Frontend

### Verificar el Tipo de Dato de viaje_id

El problema está en que `viaje.viaje_id` puede NO ser un número. En tu frontend:

```typescript
// En InformeViajesScreen.tsx línea 129
await viajesAPI.eliminar(viaje.viaje_id);
```

**Necesitas verificar qué tipo de dato es `viaje.viaje_id`**

### Solución 1: Agregar Validación (RECOMENDADO)

Modifica el archivo `InformeViajesScreen.tsx`:

```typescript
// Función para eliminar un viaje (solo admin)
const handleEliminarViaje = (viaje: Viaje) => {
  // VALIDACIÓN AGREGADA
  if (!viaje?.viaje_id) {
    console.error('❌ Error: viaje_id no está definido', viaje);
    Alert.alert('❌ Error', 'No se puede eliminar: ID de viaje inválido');
    return;
  }

  // Convertir a número si es string
  const viajeId = typeof viaje.viaje_id === 'string'
    ? parseInt(viaje.viaje_id, 10)
    : viaje.viaje_id;

  // Validar que sea un número válido
  if (isNaN(viajeId) || viajeId <= 0) {
    console.error('❌ Error: viaje_id no es un número válido:', viaje.viaje_id);
    Alert.alert('❌ Error', `ID de viaje inválido: ${viaje.viaje_id}`);
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
            await viajesAPI.eliminar(viajeId.toString()); // Convertir a string para la URL
            Alert.alert('✅ Éxito', 'El viaje ha sido eliminado correctamente');
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
```

### Solución 2: Verificar el Tipo de Dato en types/chofer.ts

Verifica que la interfaz `Viaje` tenga el tipo correcto para `viaje_id`:

```typescript
// En src/types/chofer.ts
export interface Viaje {
  viaje_id: number;  // ← Debe ser number, NO string
  chofer_id: string;
  tractor_id: string;
  batea_id: string;
  origen: string;
  destino: string;
  fecha_salida: string;
  fecha_descarga?: string;
  numero_remito?: string;
  toneladas_descargadas?: number;
  estado_viaje: EstadoViaje;
  chofer?: {
    nombre_completo: string;
  };
  tractor?: {
    patente: string;
  };
  batea?: {
    patente: string;
  };
}
```

### Solución 3: Debugging - Agregar Logs

Para identificar el problema, agrega estos logs temporalmente:

```typescript
const renderViajeRow = (viaje: Viaje) => {
  // LOG TEMPORAL PARA DEBUGGING
  console.log('🔍 Viaje:', {
    viaje_id: viaje.viaje_id,
    tipo_viaje_id: typeof viaje.viaje_id,
    es_numero: !isNaN(Number(viaje.viaje_id)),
    objeto_completo: viaje
  });

  const backgroundColor = getRowColor(viaje.origen, viaje.destino);
  // ... resto del código
};
```

## 📊 Respuestas del Endpoint

### ✅ Eliminación Exitosa (200 OK)
```json
{
  "message": "Viaje eliminado correctamente",
  "viaje_id": 11,
  "recursos_liberados": {
    "chofer": {
      "id": 1,
      "nombre": "Leonardo Daniel Lipiejko",
      "nuevo_estado": "disponible"
    },
    "tractor": {
      "id": 1,
      "patente": "AA040TR",
      "nuevo_estado": "libre"
    },
    "batea": {
      "id": 1,
      "patente": "AA050BA",
      "nuevo_estado": "vacio"
    }
  }
}
```

### ❌ Error 400 (ParseIntPipe)
```json
{
  "statusCode": 400,
  "message": "Validation failed (numeric string is expected)",
  "error": "Bad Request"
}
```

**Causa:** El ID enviado no es un número válido (undefined, null, string no numérico, etc.)

### ❌ Error 403 (Forbidden)
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

**Causa:** El usuario no tiene rol ADMIN.

### ❌ Error 404 (Not Found)
```json
{
  "statusCode": 404,
  "message": "El viaje con ID 99999 no existe",
  "error": "Not Found"
}
```

**Causa:** El viaje no existe en la base de datos.

## 🔍 Cómo Identificar el Problema

### Paso 1: Inspeccionar en el Navegador

1. Abre **Expo Go** o tu navegador con React Native Web
2. Abre las **DevTools** (en navegador: F12)
3. Ve a la pestaña **Console**
4. Intenta eliminar un viaje
5. Busca los logs que agregamos:
   ```
   🔍 Viaje: { viaje_id: "11", tipo_viaje_id: "string", ... }
   ```

### Paso 2: Verificar la Petición HTTP

En DevTools → Network:
1. Busca la petición `DELETE` a `/api/v1/viajes/...`
2. Verifica la URL completa (debe ser `/api/v1/viajes/11`, NO `/api/v1/viajes/undefined`)
3. Revisa el Response

### Paso 3: Verificar la Respuesta del Backend

En la consola del backend, deberías ver:
```
[ViajesService] [DELETE] Iniciando eliminación de viaje ID=11 por usuario Admin
```

Si ves un error antes de este log, el problema está en el ParseIntPipe (ID inválido).

## ✅ Checklist de Verificación

- [ ] El `viaje_id` existe en el objeto viaje
- [ ] El `viaje_id` es un número o string numérico válido
- [ ] La URL generada es `/api/v1/viajes/[NUMERO]` (NO undefined/null)
- [ ] El usuario está autenticado con un token JWT válido
- [ ] El usuario tiene rol `admin`
- [ ] El viaje existe en la base de datos

## 🧪 Test Manual

Prueba estos casos en tu frontend:

```typescript
// Test 1: Viaje válido
const viajeValido = { viaje_id: 1, origen: 'A', destino: 'B', ... };
handleEliminarViaje(viajeValido); // ✅ Debe funcionar

// Test 2: Viaje con ID string
const viajeString = { viaje_id: "2", origen: 'A', destino: 'B', ... };
handleEliminarViaje(viajeString); // ✅ Debe funcionar (con la validación agregada)

// Test 3: Viaje sin ID
const viajeSinId = { origen: 'A', destino: 'B', ... };
handleEliminarViaje(viajeSinId); // ❌ Debe mostrar error ANTES de llamar al backend

// Test 4: Viaje con ID undefined
const viajeUndefined = { viaje_id: undefined, origen: 'A', destino: 'B', ... };
handleEliminarViaje(viajeUndefined); // ❌ Debe mostrar error ANTES de llamar al backend
```

## 🎯 Resumen

**El error 400 ocurre porque:**
- El frontend envía un `viaje_id` que no es un número válido
- El `ParseIntPipe` de NestJS rechaza la petición inmediatamente

**La solución es:**
1. Agregar validación en el frontend ANTES de llamar a la API
2. Convertir el `viaje_id` a número si es necesario
3. Verificar que el tipo de dato en la interfaz `Viaje` sea correcto
4. Agregar logs para debugging

**Próximos pasos:**
1. Implementa la Solución 1 (validación)
2. Agrega los logs temporales de debugging
3. Prueba eliminar un viaje y revisa los logs
4. Compárteme los logs para ayudarte más específicamente

---

**Fecha**: 9 de enero de 2026
**Estado**: ✅ Diagnosticado - Pendiente de implementación