# Prompt para Backend: Endpoint de Viaje Activo del Chofer

## Contexto

El frontend ahora muestra automáticamente información del viaje asignado cuando un chofer inicia sesión. Para optimizar esta funcionalidad, necesitamos un endpoint específico que devuelva el viaje activo del chofer autenticado.

## Objetivo

Crear un endpoint que permita a un chofer obtener la información de su viaje activo (si tiene uno asignado), incluyendo detalles del tractor, batea y destino.

## Endpoint Requerido

### GET `/api/v1/choferes/mi-viaje-activo`

**Autenticación**: Requerida (JWT token con rol `chofer`)

**Descripción**: Devuelve el viaje activo del chofer autenticado, o `null` si no tiene ningún viaje asignado.

---

## Implementación Sugerida

### 1. Controlador (`choferes.controller.ts`)

```typescript
@Get('mi-viaje-activo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('chofer')
async obtenerMiViajeActivo(@Request() req): Promise<Viaje | null> {
  return this.choferesService.obtenerViajeActivo(req.user.chofer_id);
}
```

### 2. Servicio (`choferes.service.ts`)

```typescript
async obtenerViajeActivo(choferId: string): Promise<Viaje | null> {
  // Buscar el chofer con su viaje activo
  const chofer = await this.choferesRepository.findOne({
    where: { chofer_id: choferId },
    relations: ['viaje_activo', 'viaje_activo.tractor', 'viaje_activo.batea'],
  });

  if (!chofer) {
    throw new NotFoundException('Chofer no encontrado');
  }

  // Si el chofer tiene un viaje activo, devolverlo
  if (chofer.viaje_activo && chofer.viaje_activo.estado_viaje !== 'finalizado') {
    return chofer.viaje_activo;
  }

  // Si no tiene viaje activo o está finalizado, devolver null
  return null;
}
```

**Nota**: Este servicio asume que la entidad `Chofer` tiene una relación `viaje_activo` (OneToOne) con `Viaje`. Si la relación es diferente, ajustar la consulta.

---

## Respuesta Esperada

### Caso 1: Chofer con viaje asignado

**Status**: `200 OK`

```json
{
  "id_viaje": "uuid-del-viaje",
  "destino": "Rosario, Santa Fe",
  "estado_viaje": "asignado",
  "fecha_asignacion": "2025-01-12T10:30:00.000Z",
  "toneladas_cargadas": null,
  "toneladas_descargadas": null,
  "fecha_carga": null,
  "fecha_descarga": null,
  "chofer_id": "uuid-del-chofer",
  "tractor_id": "uuid-del-tractor",
  "batea_id": "uuid-del-batea",
  "tractor": {
    "tractor_id": "uuid-del-tractor",
    "patente": "AB123CD",
    "estado_tractor": "en_viaje"
  },
  "batea": {
    "batea_id": "uuid-del-batea",
    "patente": "XY456ZT",
    "estado_batea": "en_viaje"
  }
}
```

### Caso 2: Chofer sin viaje asignado

**Status**: `200 OK`

```json
null
```

---

## Validaciones y Reglas de Negocio

1. **Autenticación obligatoria**: Solo choferes autenticados pueden acceder
2. **Solo su propio viaje**: El chofer solo puede ver su viaje activo, no el de otros
3. **Filtrar viajes finalizados**: No devolver viajes con `estado_viaje = 'finalizado'`
4. **Incluir relaciones**: Siempre incluir `tractor` y `batea` en la respuesta

---

## Estados de Viaje

El viaje puede tener los siguientes estados:

- `asignado`: Viaje recién asignado, chofer aún no comenzó
- `en_curso`: Chofer está en camino
- `finalizado`: Viaje completado

**Importante**: Solo devolver viajes que **NO** estén en estado `finalizado`.

---

## Casos de Uso en el Frontend

1. **Al iniciar sesión**: El frontend llamará a este endpoint para verificar si hay un viaje asignado
2. **Al cambiar estado a DISPONIBLE**: Se verifica nuevamente si hay un nuevo viaje
3. **En la pantalla "Mi Estado"**: Se muestra la información del viaje en una tarjeta destacada

---

## Errores Posibles

### Error 401 - No autenticado
```json
{
  "statusCode": 401,
  "message": "No autorizado"
}
```

### Error 403 - Rol incorrecto
```json
{
  "statusCode": 403,
  "message": "No tienes permisos para acceder a este recurso"
}
```

### Error 404 - Chofer no encontrado
```json
{
  "statusCode": 404,
  "message": "Chofer no encontrado"
}
```

---

## Testing

### Caso de prueba 1: Chofer con viaje activo
1. Crear un viaje asignado a un chofer
2. Autenticar como ese chofer
3. Llamar a `GET /api/v1/choferes/mi-viaje-activo`
4. Verificar que devuelve el viaje con tractor y batea incluidos

### Caso de prueba 2: Chofer sin viaje
1. Autenticar como un chofer sin viajes asignados
2. Llamar a `GET /api/v1/choferes/mi-viaje-activo`
3. Verificar que devuelve `null`

### Caso de prueba 3: Chofer con viaje finalizado
1. Crear un viaje finalizado para un chofer
2. Autenticar como ese chofer
3. Llamar a `GET /api/v1/choferes/mi-viaje-activo`
4. Verificar que devuelve `null` (no debe devolver viajes finalizados)

### Caso de prueba 4: Usuario no autenticado
1. Llamar al endpoint sin token de autenticación
2. Verificar que devuelve `401 Unauthorized`

### Caso de prueba 5: Usuario con rol admin
1. Autenticar como admin (no chofer)
2. Llamar al endpoint
3. Verificar que devuelve `403 Forbidden`

---

## Optimización Opcional

Si el volumen de choferes es alto, considerar agregar un índice en la base de datos:

```sql
CREATE INDEX idx_chofer_viaje_activo ON choferes(viaje_activo_id) WHERE viaje_activo_id IS NOT NULL;
```

Esto acelera las consultas de choferes con viajes activos.

---

## Integración con Frontend

El frontend ya está preparado para consumir este endpoint. Actualmente usa:

```typescript
GET /api/v1/viajes?chofer_id=${choferId}
```

Una vez implementado este nuevo endpoint, se recomienda actualizar el frontend para usar:

```typescript
GET /api/v1/choferes/mi-viaje-activo
```

Esto simplifica la lógica y mejora la seguridad (el chofer no necesita enviar su ID como parámetro).

---

## Próximos Pasos

1. Implementar el endpoint en el backend
2. Probar con los casos de prueba mencionados
3. Actualizar el frontend para usar el nuevo endpoint (opcional, funciona con ambos)
4. Documentar en Swagger/OpenAPI