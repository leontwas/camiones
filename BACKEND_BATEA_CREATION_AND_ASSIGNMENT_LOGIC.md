# Prompt: Lógica de Creación y Asignación de Bateas en el Backend

## Contexto del Sistema

El sistema de transporte maneja tres entidades que forman una **unidad operativa**: **Chofer**, **Tractor** y **Batea**. Cuando se asignan entre sí, las tres tablas deben mantener referencias cruzadas consistentes:

- `choferes` tiene campos: `tractor_id`, `batea_id`
- `tractores` tiene campos: `chofer_id`, `batea_id`
- `bateas` tiene campos: `chofer_id`, `tractor_id`

### Estados posibles de una Batea
```typescript
enum EstadoBatea {
  VACIO = 'vacio',        // Sin chofer ni carga asignada
  CARGADO = 'cargado',    // Tiene carga
  EN_REPARACION = 'en_reparacion',  // En mantenimiento
  OCUPADO = 'ocupado',    // Asignada a un chofer/tractor
}
```

---

## Regla 1: Creación de Bateas — Estado por defecto "vacio"

Cuando se crea una batea nueva desde el endpoint `POST /api/v1/bateas`, el backend **SIEMPRE** debe asignar el estado `'vacio'` por defecto, **EXCEPTO** cuando en el body de la petición se envía un `chofer_id` y/o `tractor_id`, en cuyo caso el estado debe ser `'ocupado'`.

### Lógica esperada en el servicio de creación:

```typescript
async crear(createBateaDto: CreateBateaDto) {
  // Si el frontend envía un chofer_id o tractor_id, el estado es 'ocupado'
  // Si NO envía ninguno, el estado SIEMPRE es 'vacio'
  
  let estadoFinal = 'vacio'; // DEFAULT
  
  if (createBateaDto.chofer_id || createBateaDto.tractor_id) {
    estadoFinal = 'ocupado';
  }
  
  // Ignorar cualquier estado que venga del frontend al crear
  // (el estado se determina automáticamente por la lógica de negocio)
  const batea = this.bateaRepository.create({
    ...createBateaDto,
    estado: estadoFinal,
  });
  
  const bateaGuardada = await this.bateaRepository.save(batea);
  
  // Si se asignó un chofer, sincronizar las referencias cruzadas (ver Regla 2)
  if (createBateaDto.chofer_id) {
    await this.sincronizarAsignacion(bateaGuardada.batea_id, createBateaDto.chofer_id);
  }
  
  return bateaGuardada;
}
```

### Campos que envía el frontend al crear:

```json
{
  "patente": "ABC123",              // OBLIGATORIO
  "carga_max_batea": 28.5,          // OBLIGATORIO
  "marca": "Randon",                // Opcional
  "modelo": "SR BA 48",             // Opcional
  "seguro": "La Caja Seguros",      // Opcional
  "transportista": "Trans Norte",   // Opcional
  "chofer_id": "uuid-del-chofer",   // Opcional - si se envía, estado = 'ocupado'
  "tractor_id": "uuid-del-tractor"  // Opcional - si se envía, estado = 'ocupado'
}
```

> **IMPORTANTE**: El campo `estado` NO debe ser enviado por el frontend al crear. El backend lo determina automáticamente. Si el frontend envía un `estado`, el backend debe **ignorarlo** durante la creación y aplicar la lógica descrita arriba.

---

## Regla 2: Sincronización de la "Unidad Operativa" (Chofer + Tractor + Batea)

Cuando una batea con estado `'vacio'` se le asigna un `chofer_id`, el backend debe realizar la sincronización completa de las tres entidades que forman la unidad operativa:

### Flujo de asignación: Batea ← Chofer

```
1. Se asigna chofer_id a la batea
2. Se actualiza batea.chofer_id = chofer_id
3. Se actualiza batea.estado = 'ocupado'
4. Se actualiza chofer.batea_id = batea_id
5. Se busca el tractor del chofer: chofer.tractor_id
6. Si el chofer tiene tractor asignado:
   a. Se actualiza batea.tractor_id = chofer.tractor_id
   b. Se actualiza tractor.batea_id = batea_id
```

### Pseudocódigo de la sincronización:

```typescript
async sincronizarAsignacion(batea_id: string, chofer_id: string) {
  // 1. Obtener el chofer completo
  const chofer = await this.choferRepository.findOne({ where: { id_chofer: chofer_id } });
  if (!chofer) throw new NotFoundException('Chofer no encontrado');

  // 2. Actualizar la batea: asignar chofer y cambiar estado a 'ocupado'
  const updateBatea: any = {
    chofer_id: chofer_id,
    estado: 'ocupado',
  };

  // 3. Si el chofer tiene un tractor asignado, vincular también
  if (chofer.tractor_id) {
    updateBatea.tractor_id = chofer.tractor_id;

    // 4. Actualizar el tractor para que apunte a esta batea
    await this.tractorRepository.update(chofer.tractor_id, {
      batea_id: batea_id,
    });
  }

  // 5. Guardar los cambios en la batea
  await this.bateaRepository.update(batea_id, updateBatea);

  // 6. Actualizar el chofer para que apunte a esta batea
  await this.choferRepository.update(chofer_id, {
    batea_id: batea_id,
  });
}
```

### Flujo de desasignación: Batea → quitar Chofer

Cuando se quita el chofer de una batea (se edita la batea y se pone `chofer_id = null`):

```
1. Obtener el chofer anterior (batea.chofer_id actual)
2. Actualizar batea.chofer_id = null
3. Actualizar batea.tractor_id = null
4. Actualizar batea.estado = 'vacio'
5. Actualizar chofer_anterior.batea_id = null
6. Si había tractor vinculado: actualizar tractor.batea_id = null
```

---

## Regla 3: Actualización de Bateas (PATCH /api/v1/bateas/:id)

Cuando se actualiza una batea existente, el backend debe detectar si cambió el `chofer_id`:

```typescript
async actualizar(batea_id: string, updateBateaDto: UpdateBateaDto) {
  const bateaActual = await this.bateaRepository.findOne({ where: { batea_id } });
  if (!bateaActual) throw new NotFoundException('Batea no encontrada');

  const choferAnterior = bateaActual.chofer_id;
  const choferNuevo = updateBateaDto.chofer_id;

  // Caso 1: Se asignó un chofer nuevo (no tenía o cambió)
  if (choferNuevo && choferNuevo !== choferAnterior) {
    // Si tenía un chofer anterior, desvincularlo primero
    if (choferAnterior) {
      await this.desvincularChofer(batea_id, choferAnterior);
    }
    // Vincular el nuevo chofer
    await this.sincronizarAsignacion(batea_id, choferNuevo);
  }
  
  // Caso 2: Se quitó el chofer (tenía uno y ahora viene vacío/null)
  if (choferAnterior && (!choferNuevo || choferNuevo === '')) {
    await this.desvincularChofer(batea_id, choferAnterior);
    updateBateaDto.estado = 'vacio';
    updateBateaDto.tractor_id = null;
  }

  // Guardar el resto de campos actualizados
  await this.bateaRepository.update(batea_id, updateBateaDto);
  return this.bateaRepository.findOne({ where: { batea_id } });
}
```

---

## Excepciones a la Unidad Operativa

La unidad chofer-tractor-batea se **rompe** en los siguientes casos (el backend NO debe forzar la sincronización):

| Caso | Qué sucede |
|------|-----------|
| Chofer en `licencia_anual` | El chofer se desvincula temporalmente. Tractor y batea quedan libres. |
| Chofer en `inactivo` | Mismo que licencia. Se liberan tractor y batea. |
| Tractor en `en_reparacion` | Se desvincula el tractor del chofer y batea. El chofer puede recibir otro tractor. |
| Batea en `en_reparacion` | Se desvincula la batea del chofer y tractor. El chofer puede recibir otra batea. |

---

## Resumen de Endpoints Afectados

| Endpoint | Cambio requerido |
|----------|-----------------|
| `POST /api/v1/bateas` | Estado por defecto `'vacio'`. Si viene `chofer_id`, sincronizar unidad y poner `'ocupado'`. |
| `PATCH /api/v1/bateas/:id` | Detectar cambios en `chofer_id` y sincronizar/desvincular según corresponda. |
| `PATCH /api/v1/bateas/:id/chofer/:chofer_id` | Sincronizar la unidad completa (batea ↔ chofer ↔ tractor). |

---

## Validaciones Importantes

1. **No asignar un chofer que ya tiene batea**: Si el chofer ya tiene un `batea_id` distinto, devolver error 409 Conflict o preguntar si reemplazar.
2. **No asignar un chofer inactivo o en licencia**: Solo choferes con estado `'disponible'` deberían poder ser asignados a una batea.
3. **Patente única**: La patente de la batea debe ser única en la base de datos (validar con unique constraint).

---

## Pruebas Esperadas

### Test 1: Crear batea sin chofer
```bash
POST /api/v1/bateas
Body: { "patente": "XY999ZZ", "carga_max_batea": 30 }
Resultado esperado: batea creada con estado = "vacio", chofer_id = null, tractor_id = null
```

### Test 2: Crear batea con chofer que tiene tractor
```bash
POST /api/v1/bateas
Body: { "patente": "AB123CD", "carga_max_batea": 28, "chofer_id": "uuid-chofer" }
Resultado esperado:
  - batea.estado = "ocupado"
  - batea.chofer_id = "uuid-chofer"
  - batea.tractor_id = tractor del chofer
  - chofer.batea_id = batea_id creada
  - tractor.batea_id = batea_id creada
```

### Test 3: Editar batea y asignarle un chofer
```bash
PATCH /api/v1/bateas/:id
Body: { "chofer_id": "uuid-chofer" }
Resultado esperado: misma sincronización que Test 2
```

### Test 4: Editar batea y quitarle el chofer
```bash
PATCH /api/v1/bateas/:id
Body: { "chofer_id": "" }
Resultado esperado:
  - batea.estado = "vacio"
  - batea.chofer_id = null
  - batea.tractor_id = null
  - chofer_anterior.batea_id = null
  - tractor_anterior.batea_id = null
```
