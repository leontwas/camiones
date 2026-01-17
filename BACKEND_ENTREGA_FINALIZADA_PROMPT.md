# Prompt para Backend: Estado "Entrega Finalizada" con Toneladas Descargadas

## Contexto

El frontend ahora incluye un nuevo estado para choferes llamado **"ENTREGA_FINALIZADA"**. Este estado debe registrar:
1. Las **toneladas descargadas** (ingresadas por el chofer)
2. La **fecha y hora de descarga** (timestamp automático del sistema)

Estos datos se mostrarán en la tabla de "Informe de Viajes" en las columnas:
- **Ton. Desc.**: Toneladas descargadas
- **F/H Desc.**: Fecha/Hora de descarga

## Cambios Necesarios en el Backend

### 1. Actualizar el Enum `EstadoChofer`

Agregar el nuevo estado al enum existente:

```typescript
export enum EstadoChofer {
  DISPONIBLE = 'disponible',
  CARGANDO = 'cargando',
  VIAJANDO = 'viajando',
  DESCANSANDO = 'descansando',
  DESCARGANDO = 'descargando',
  ENTREGA_FINALIZADA = 'entrega_finalizada',  // ← NUEVO
  LICENCIA_ANUAL = 'licencia_anual',
  FRANCO = 'franco',
  EQUIPO_EN_REPARACION = 'equipo_en_reparacion',
  INACTIVO = 'inactivo',
}
```

### 2. Actualizar el Endpoint PATCH `/api/v1/choferes/mi-estado`

El endpoint ya existe y recibe actualizaciones de estado. Ahora debe aceptar el campo adicional `toneladas_descargadas`:

#### DTO de Actualización

```typescript
export class ActualizarMiEstadoDto {
  @IsEnum(EstadoChofer)
  @IsNotEmpty()
  estado_chofer: EstadoChofer;

  @IsOptional()
  @IsISO8601()
  fecha_inicio_licencia?: string;

  @IsOptional()
  @IsISO8601()
  fecha_fin_licencia?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Las toneladas descargadas deben ser mayores a 0' })
  toneladas_descargadas?: number;  // ← NUEVO CAMPO
}
```

#### Lógica del Servicio

Cuando el estado es `ENTREGA_FINALIZADA`:

```typescript
async actualizarMiEstado(
  choferId: string,
  actualizarEstadoDto: ActualizarMiEstadoDto,
): Promise<Chofer> {
  const { estado_chofer, toneladas_descargadas, ...resto } = actualizarEstadoDto;

  // 1. Validar que el chofer existe y tiene un viaje activo
  const chofer = await this.choferesRepository.findOne({
    where: { chofer_id: choferId },
    relations: ['viaje_activo'],
  });

  if (!chofer) {
    throw new NotFoundException('Chofer no encontrado');
  }

  // 2. Validar transición de estado (lógica existente)
  this.validarTransicionEstado(chofer.estado_chofer, estado_chofer);

  // 3. Si el estado es ENTREGA_FINALIZADA, actualizar el viaje activo
  if (estado_chofer === EstadoChofer.ENTREGA_FINALIZADA) {
    if (!chofer.viaje_activo) {
      throw new BadRequestException(
        'No puedes finalizar la entrega sin tener un viaje activo'
      );
    }

    if (!toneladas_descargadas) {
      throw new BadRequestException(
        'Debes proporcionar las toneladas descargadas'
      );
    }

    // Actualizar el viaje con las toneladas y fecha de descarga
    await this.viajesRepository.update(
      { id_viaje: chofer.viaje_activo.id_viaje },
      {
        toneladas_descargadas: toneladas_descargadas,
        fecha_descarga: new Date(), // ← Timestamp automático
        estado_viaje: 'finalizado',  // ← Cambiar estado del viaje
      }
    );

    // Liberar recursos: marcar chofer, tractor y batea como disponibles
    await this.liberarRecursos(chofer.viaje_activo);
  }

  // 4. Actualizar estado del chofer
  chofer.estado_chofer = estado_chofer;

  // Si es una licencia, guardar las fechas
  if (this.esEstadoConLicencia(estado_chofer)) {
    chofer.fecha_inicio_licencia = resto.fecha_inicio_licencia
      ? new Date(resto.fecha_inicio_licencia)
      : null;
    chofer.fecha_fin_licencia = resto.fecha_fin_licencia
      ? new Date(resto.fecha_fin_licencia)
      : null;
  }

  return await this.choferesRepository.save(chofer);
}

// Método auxiliar para liberar recursos
private async liberarRecursos(viaje: Viaje): Promise<void> {
  const updates: Promise<any>[] = [];

  // Liberar chofer
  updates.push(
    this.choferesRepository.update(
      { chofer_id: viaje.chofer_id },
      {
        estado_chofer: EstadoChofer.DISPONIBLE,
        viaje_activo_id: null,
      }
    )
  );

  // Liberar tractor
  if (viaje.tractor_id) {
    updates.push(
      this.tractoresRepository.update(
        { tractor_id: viaje.tractor_id },
        { estado_tractor: EstadoTractor.DISPONIBLE }
      )
    );
  }

  // Liberar batea
  if (viaje.batea_id) {
    updates.push(
      this.bateasRepository.update(
        { batea_id: viaje.batea_id },
        { estado_batea: EstadoBatea.DISPONIBLE }
      )
    );
  }

  await Promise.all(updates);
}
```

### 3. Actualizar Validaciones de Flujo de Estados

Asegúrate de que la transición al estado `ENTREGA_FINALIZADA` solo sea válida desde `DESCARGANDO`:

```typescript
private validarTransicionEstado(
  estadoActual: EstadoChofer,
  estadoNuevo: EstadoChofer,
): void {
  const transicionesValidas: Record<EstadoChofer, EstadoChofer[]> = {
    [EstadoChofer.DISPONIBLE]: [
      EstadoChofer.CARGANDO,
      EstadoChofer.LICENCIA_ANUAL,
      EstadoChofer.FRANCO,
      EstadoChofer.EQUIPO_EN_REPARACION,
      EstadoChofer.INACTIVO,
    ],
    [EstadoChofer.CARGANDO]: [
      EstadoChofer.VIAJANDO,
      EstadoChofer.DISPONIBLE,
    ],
    [EstadoChofer.VIAJANDO]: [
      EstadoChofer.DESCANSANDO,
      EstadoChofer.DESCARGANDO,
    ],
    [EstadoChofer.DESCANSANDO]: [
      EstadoChofer.VIAJANDO,
      EstadoChofer.DESCARGANDO,
    ],
    [EstadoChofer.DESCARGANDO]: [
      EstadoChofer.ENTREGA_FINALIZADA,  // ← NUEVA TRANSICIÓN
    ],
    [EstadoChofer.ENTREGA_FINALIZADA]: [
      EstadoChofer.DISPONIBLE,  // ← Automático después de finalizar
    ],
    [EstadoChofer.LICENCIA_ANUAL]: [EstadoChofer.DISPONIBLE],
    [EstadoChofer.FRANCO]: [EstadoChofer.DISPONIBLE],
    [EstadoChofer.EQUIPO_EN_REPARACION]: [EstadoChofer.DISPONIBLE],
    [EstadoChofer.INACTIVO]: [EstadoChofer.DISPONIBLE],
  };

  const transicionesPerm itidas = transicionesValidas[estadoActual] || [];

  if (!transicionesPerm itidas.includes(estadoNuevo)) {
    throw new BadRequestException(
      `No se puede cambiar del estado "${estadoActual}" al estado "${estadoNuevo}"`
    );
  }
}
```

## Flujo Completo

1. **Chofer está en estado DESCARGANDO**
2. **Chofer selecciona "Entrega Finalizada" en la app**
3. **Frontend muestra modal solicitando toneladas descargadas**
4. **Chofer ingresa las toneladas (ej: 25.5)**
5. **Frontend envía al backend:**
   ```json
   {
     "estado_chofer": "entrega_finalizada",
     "toneladas_descargadas": 25.5
   }
   ```
6. **Backend procesa la solicitud:**
   - Valida que la transición sea válida (DESCARGANDO → ENTREGA_FINALIZADA)
   - Valida que el chofer tenga un viaje activo
   - Valida que `toneladas_descargadas` sea un número > 0
   - Actualiza el viaje: `toneladas_descargadas`, `fecha_descarga`, `estado_viaje = 'finalizado'`
   - Libera recursos (chofer, tractor, batea)
   - Devuelve el chofer actualizado con estado `DISPONIBLE`

## Validaciones Importantes

1. **Solo se puede marcar "Entrega Finalizada" si:**
   - El chofer está en estado `DESCARGANDO`
   - El chofer tiene un `viaje_activo`
   - Se proporcionan las `toneladas_descargadas`

2. **Errores a retornar:**
   - `400 Bad Request` si falta `toneladas_descargadas`
   - `400 Bad Request` si `toneladas_descargadas <= 0`
   - `400 Bad Request` si no tiene viaje activo
   - `400 Bad Request` si la transición de estado no es válida

3. **Al finalizar la entrega:**
   - El viaje debe cambiar a estado `'finalizado'`
   - El chofer debe quedar `DISPONIBLE` (automáticamente)
   - El tractor debe quedar `DISPONIBLE`
   - La batea debe quedar `DISPONIBLE`

## Respuesta Esperada

```json
{
  "chofer_id": "uuid-del-chofer",
  "nombre_completo": "Leonardo Daniel Lipiejko",
  "estado_chofer": "disponible",
  "viaje_activo": null,
  ...
}
```

## Testing

1. **Caso exitoso:**
   - Chofer en estado `DESCARGANDO` con viaje activo
   - Enviar `{ estado_chofer: 'entrega_finalizada', toneladas_descargadas: 30 }`
   - Verificar que el viaje se actualizó con `toneladas_descargadas` y `fecha_descarga`
   - Verificar que los recursos quedaron disponibles

2. **Caso de error - sin toneladas:**
   - Enviar `{ estado_chofer: 'entrega_finalizada' }` (sin toneladas)
   - Debe retornar `400 Bad Request`

3. **Caso de error - sin viaje activo:**
   - Chofer sin viaje activo intenta finalizar entrega
   - Debe retornar `400 Bad Request`

4. **Caso de error - transición inválida:**
   - Chofer en estado `DISPONIBLE` intenta cambiar a `ENTREGA_FINALIZADA`
   - Debe retornar `400 Bad Request`