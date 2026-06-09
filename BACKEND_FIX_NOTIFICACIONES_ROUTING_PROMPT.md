# Prompt para Corregir Error de Enrutamiento en Notificaciones (Backend)

**Contexto del Problema:**
En la aplicación frontend, la llamada al endpoint `GET /api/v1/viajes/notificaciones` está fallando con un código de estado `400 Bad Request`.
El mensaje de error devuelto por la API es:
`{"message":"Validation failed (numeric string is expected)","error":"Bad Request","statusCode":400}`

**Causa Raíz:**
Este es un problema clásico de colisión en el orden de las rutas (Routing Order Collision). 
En el controlador de viajes (`viajes.controller.ts`), el endpoint dinámico `@Get(':id')` está declarado antes que el endpoint estático `@Get('notificaciones')`. 
Por lo tanto, cuando el frontend hace una petición a `/notificaciones`, el framework asume que la palabra "notificaciones" es el parámetro `:id` e intenta validarlo como un número (posiblemente usando un `ParseIntPipe` o similar). Al fallar la conversión de texto a número, lanza el error de validación 400.

**Instrucciones para el Agente / Desarrollador Backend:**

1. Abre el archivo del controlador de viajes (`viajes.controller.ts`).
2. Busca la definición del endpoint que obtiene las notificaciones (ej: `obtenerNotificacionesAdmin()`).
3. Busca la definición del endpoint que obtiene un viaje por su ID (ej: `obtenerPorId(@Param('id') id: string)`).
4. **Mueve el método de notificaciones para que esté declarado ANTES del método de búsqueda por ID.**

**Ejemplo de cómo debe quedar el código (referencia en NestJS):**

```typescript
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

@Controller('api/v1/viajes')
export class ViajesController {
  
  // 1. PRIMERO: Rutas estáticas específicas
  @Get('notificaciones')
  async obtenerNotificacionesAdmin() {
    return this.viajesService.obtenerNotificaciones();
  }

  // ... otras rutas estáticas (por ejemplo: @Get('activos'))

  // 2. ÚLTIMO: Rutas dinámicas con parámetros
  @Get(':id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.viajesService.obtenerPorId(id);
  }
}
```

5. Adicionalmente, verifica si este mismo problema de ordenamiento está ocurriendo en otros endpoints dentro del mismo controlador (por ejemplo, asegurate de que un hipotético `@Get('activos')` o `@Get('mi-viaje')` no esté debajo de `@Get(':id')`).
6. Prueba localmente el endpoint haciendo un GET a `/api/v1/viajes/notificaciones` para verificar que ya no devuelve el error 400.
7. Haz commit y despliega los cambios a producción (Render).
