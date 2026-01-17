# Backend: Validación de Asignación de Recursos (Tractor/Batea/Chofer)

## 🎯 Problema a Resolver

Actualmente, el sistema permite asignar **múltiples bateas a un mismo chofer o tractor**, lo cual genera inconsistencias en la lógica de negocio.

**Reglas de Negocio:**
1. Un **chofer** solo puede tener asignado **1 tractor** a la vez
2. Un **chofer** solo puede tener asignada **1 batea** a la vez
3. Un **tractor** solo puede tener asignado **1 chofer** a la vez
4. Un **tractor** solo puede tener asignada **1 batea** a la vez
5. Una **batea** solo puede estar asignada a **1 chofer** a la vez
6. Una **batea** solo puede estar asignada a **1 tractor** a la vez

---

## ✅ Soluciones a Implementar

### 1. Validaciones a Nivel de Base de Datos (PostgreSQL)

Agregar constraints UNIQUE en las tablas para prevenir duplicados:

```sql
-- TABLA: choferes
-- Asegurar que un chofer solo tenga 1 tractor y 1 batea asignados

-- Si tractor_id y batea_id pueden ser NULL (cuando no están asignados),
-- entonces NO se puede usar UNIQUE directamente porque NULL no es único.
-- En su lugar, usar UNIQUE con condición:

-- Constraint: Un tractor no puede estar asignado a múltiples choferes
CREATE UNIQUE INDEX idx_tractor_unico_por_chofer
ON choferes (tractor_id)
WHERE tractor_id IS NOT NULL;

-- Constraint: Una batea no puede estar asignada a múltiples choferes
CREATE UNIQUE INDEX idx_batea_unica_por_chofer
ON choferes (batea_id)
WHERE batea_id IS NOT NULL;

-- TABLA: tractores
-- Si la tabla tractores tiene columnas chofer_id y batea_id:

-- Constraint: Un chofer no puede estar asignado a múltiples tractores
CREATE UNIQUE INDEX idx_chofer_unico_por_tractor
ON tractores (chofer_id)
WHERE chofer_id IS NOT NULL;

-- Constraint: Una batea no puede estar asignada a múltiples tractores
CREATE UNIQUE INDEX idx_batea_unica_por_tractor
ON tractores (batea_id)
WHERE batea_id IS NOT NULL;

-- TABLA: bateas
-- Si la tabla bateas tiene columnas chofer_id y tractor_id:

-- Constraint: Un chofer no puede tener múltiples bateas asignadas
CREATE UNIQUE INDEX idx_chofer_unico_por_batea
ON bateas (chofer_id)
WHERE chofer_id IS NOT NULL;

-- Constraint: Un tractor no puede tener múltiples bateas asignadas
CREATE UNIQUE INDEX idx_tractor_unico_por_batea
ON bateas (tractor_id)
WHERE tractor_id IS NOT NULL;
```

**Nota:** Ajusta los nombres de las columnas según tu esquema de base de datos.

---

### 2. Validaciones a Nivel de Backend (NestJS)

#### A. Validar ANTES de Asignar un Tractor a un Chofer

**Endpoint:** `PATCH /api/v1/tractores/:tractor_id/chofer/:chofer_id`

```typescript
async asignarChofer(tractor_id: string, chofer_id: string) {
  // 1. Verificar que el chofer existe
  const chofer = await this.choferesRepository.findOne({
    where: { id_chofer: chofer_id },
  });

  if (!chofer) {
    throw new NotFoundException(`Chofer con ID ${chofer_id} no encontrado`);
  }

  // 2. Verificar que el tractor existe
  const tractor = await this.tractoresRepository.findOne({
    where: { tractor_id },
  });

  if (!tractor) {
    throw new NotFoundException(`Tractor con ID ${tractor_id} no encontrado`);
  }

  // 3. Verificar que el chofer NO tenga otro tractor asignado
  if (chofer.tractor_id && chofer.tractor_id !== tractor_id) {
    throw new ConflictException(
      `El chofer ${chofer.nombre_completo} ya tiene asignado el tractor con patente ${chofer.tractor?.patente}. ` +
      `Debes desasignar primero ese tractor antes de asignar uno nuevo.`
    );
  }

  // 4. Verificar que el tractor NO esté asignado a otro chofer
  const otroChoferConTractor = await this.choferesRepository.findOne({
    where: { tractor_id, id_chofer: Not(chofer_id) },
  });

  if (otroChoferConTractor) {
    throw new ConflictException(
      `El tractor con patente ${tractor.patente} ya está asignado al chofer ${otroChoferConTractor.nombre_completo}. ` +
      `Debes desasignarlo primero.`
    );
  }

  // 5. Asignar el tractor al chofer
  chofer.tractor_id = tractor_id;
  await this.choferesRepository.save(chofer);

  // 6. Actualizar estado del tractor si es necesario
  if (tractor.estado_tractor === 'libre') {
    tractor.estado_tractor = 'asignado';
    await this.tractoresRepository.save(tractor);
  }

  return { message: 'Tractor asignado exitosamente', chofer };
}
```

---

#### B. Validar ANTES de Asignar una Batea a un Chofer

**Endpoint:** `PATCH /api/v1/bateas/:batea_id/chofer/:chofer_id`

```typescript
async asignarChofer(batea_id: string, chofer_id: string) {
  // 1. Verificar que el chofer existe
  const chofer = await this.choferesRepository.findOne({
    where: { id_chofer: chofer_id },
  });

  if (!chofer) {
    throw new NotFoundException(`Chofer con ID ${chofer_id} no encontrado`);
  }

  // 2. Verificar que la batea existe
  const batea = await this.bateasRepository.findOne({
    where: { batea_id },
  });

  if (!batea) {
    throw new NotFoundException(`Batea con ID ${batea_id} no encontrada`);
  }

  // 3. Verificar que el chofer NO tenga otra batea asignada
  if (chofer.batea_id && chofer.batea_id !== batea_id) {
    throw new ConflictException(
      `El chofer ${chofer.nombre_completo} ya tiene asignada la batea con patente ${chofer.batea?.patente}. ` +
      `Debes desasignar primero esa batea antes de asignar una nueva.`
    );
  }

  // 4. Verificar que la batea NO esté asignada a otro chofer
  const otroChoferConBatea = await this.choferesRepository.findOne({
    where: { batea_id, id_chofer: Not(chofer_id) },
  });

  if (otroChoferConBatea) {
    throw new ConflictException(
      `La batea con patente ${batea.patente} ya está asignada al chofer ${otroChoferConBatea.nombre_completo}. ` +
      `Debes desasignarla primero.`
    );
  }

  // 5. Asignar la batea al chofer
  chofer.batea_id = batea_id;
  await this.choferesRepository.save(chofer);

  // 6. Actualizar estado de la batea si es necesario
  if (batea.estado === 'vacio') {
    batea.estado = 'asignado';
    await this.bateasRepository.save(batea);
  }

  return { message: 'Batea asignada exitosamente', chofer };
}
```

---

#### C. Validar ANTES de Asignar una Batea a un Tractor

**Endpoint:** `PATCH /api/v1/tractores/:tractor_id/batea/:batea_id`

```typescript
async asignarBatea(tractor_id: string, batea_id: string) {
  // 1. Verificar que el tractor existe
  const tractor = await this.tractoresRepository.findOne({
    where: { tractor_id },
  });

  if (!tractor) {
    throw new NotFoundException(`Tractor con ID ${tractor_id} no encontrado`);
  }

  // 2. Verificar que la batea existe
  const batea = await this.bateasRepository.findOne({
    where: { batea_id },
  });

  if (!batea) {
    throw new NotFoundException(`Batea con ID ${batea_id} no encontrada`);
  }

  // 3. Verificar que el tractor NO tenga otra batea asignada
  if (tractor.batea_id && tractor.batea_id !== batea_id) {
    throw new ConflictException(
      `El tractor con patente ${tractor.patente} ya tiene asignada la batea con patente ${tractor.batea?.patente}. ` +
      `Debes desasignar primero esa batea antes de asignar una nueva.`
    );
  }

  // 4. Verificar que la batea NO esté asignada a otro tractor
  const otroTractorConBatea = await this.tractoresRepository.findOne({
    where: { batea_id, tractor_id: Not(tractor_id) },
  });

  if (otroTractorConBatea) {
    throw new ConflictException(
      `La batea con patente ${batea.patente} ya está asignada al tractor con patente ${otroTractorConBatea.patente}. ` +
      `Debes desasignarla primero.`
    );
  }

  // 5. Asignar la batea al tractor
  tractor.batea_id = batea_id;
  await this.tractoresRepository.save(tractor);

  // 6. Actualizar estado de la batea si es necesario
  if (batea.estado === 'vacio') {
    batea.estado = 'asignado';
    await this.bateasRepository.save(batea);
  }

  return { message: 'Batea asignada exitosamente', tractor };
}
```

---

#### D. Validar ANTES de Crear un Viaje

**Endpoint:** `POST /api/v1/viajes`

```typescript
async crearViaje(createViajeDto: CreateViajeDto) {
  const { chofer_id, tractor_id, batea_id, origen, destino, fecha_salida } = createViajeDto;

  // 1. Verificar que el chofer existe y está activo
  const chofer = await this.choferesRepository.findOne({
    where: { id_chofer: chofer_id },
    relations: ['tractor', 'batea'],
  });

  if (!chofer) {
    throw new NotFoundException(`Chofer con ID ${chofer_id} no encontrado`);
  }

  if (chofer.estado_chofer !== 'activo') {
    throw new BadRequestException(
      `El chofer ${chofer.nombre_completo} no está activo. Estado actual: ${chofer.estado_chofer}`
    );
  }

  // 2. Verificar que el tractor existe y está disponible
  const tractor = await this.tractoresRepository.findOne({
    where: { tractor_id },
  });

  if (!tractor) {
    throw new NotFoundException(`Tractor con ID ${tractor_id} no encontrado`);
  }

  if (tractor.estado_tractor !== 'libre' && tractor.estado_tractor !== 'asignado') {
    throw new BadRequestException(
      `El tractor con patente ${tractor.patente} no está disponible. Estado actual: ${tractor.estado_tractor}`
    );
  }

  // 3. Verificar que la batea existe y está disponible
  const batea = await this.bateasRepository.findOne({
    where: { batea_id },
  });

  if (!batea) {
    throw new NotFoundException(`Batea con ID ${batea_id} no encontrada`);
  }

  if (batea.estado !== 'vacio' && batea.estado !== 'asignado') {
    throw new BadRequestException(
      `La batea con patente ${batea.patente} no está disponible. Estado actual: ${batea.estado}`
    );
  }

  // 4. Validar que el chofer tenga asignado el tractor seleccionado
  if (chofer.tractor_id !== tractor_id) {
    throw new ConflictException(
      `El tractor con patente ${tractor.patente} no está asignado al chofer ${chofer.nombre_completo}. ` +
      `Tractor actual del chofer: ${chofer.tractor?.patente || 'Ninguno'}`
    );
  }

  // 5. Validar que el chofer tenga asignada la batea seleccionada
  if (chofer.batea_id !== batea_id) {
    throw new ConflictException(
      `La batea con patente ${batea.patente} no está asignada al chofer ${chofer.nombre_completo}. ` +
      `Batea actual del chofer: ${chofer.batea?.patente || 'Ninguna'}`
    );
  }

  // 6. Validar que el tractor tenga asignada la batea seleccionada (si aplica en tu modelo)
  if (tractor.batea_id && tractor.batea_id !== batea_id) {
    throw new ConflictException(
      `El tractor con patente ${tractor.patente} tiene asignada una batea diferente (${tractor.batea?.patente})`
    );
  }

  // 7. Crear el viaje
  const viaje = this.viajesRepository.create({
    chofer_id,
    tractor_id,
    batea_id,
    origen,
    destino,
    fecha_salida,
    estado_viaje: 'pendiente',
  });

  const viajeGuardado = await this.viajesRepository.save(viaje);

  // 8. Actualizar estados de recursos
  tractor.estado_tractor = 'en_viaje';
  await this.tractoresRepository.save(tractor);

  batea.estado = 'lleno';
  await this.bateasRepository.save(batea);

  chofer.estado_chofer = 'en_viaje';
  await this.choferesRepository.save(chofer);

  return {
    message: 'Viaje creado exitosamente',
    viaje: viajeGuardado,
  };
}
```

---

### 3. Importar Excepciones en NestJS

Asegúrate de importar las excepciones necesarias:

```typescript
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Not } from 'typeorm';
```

---

### 4. Respuestas de Error Consistentes

Todas las validaciones deben retornar errores HTTP apropiados:

| Código | Excepción | Uso |
|--------|-----------|-----|
| `404 Not Found` | `NotFoundException` | Recurso (chofer/tractor/batea) no existe |
| `400 Bad Request` | `BadRequestException` | Recurso no está en estado válido (ej: chofer inactivo) |
| `409 Conflict` | `ConflictException` | Ya existe una asignación conflictiva (ej: chofer ya tiene otro tractor) |

---

## 🧪 Testing

### Caso 1: Intentar asignar 2 tractores a un mismo chofer

```bash
# Asignar primer tractor
curl -X PATCH http://localhost:3000/api/v1/tractores/TRACTOR-001/chofer/CHOFER-001 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Resultado: ✅ 200 OK

# Intentar asignar segundo tractor al mismo chofer
curl -X PATCH http://localhost:3000/api/v1/tractores/TRACTOR-002/chofer/CHOFER-001 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Resultado esperado: ❌ 409 Conflict
# {
#   "statusCode": 409,
#   "message": "El chofer Juan Pérez ya tiene asignado el tractor con patente ABC-123. Debes desasignar primero ese tractor antes de asignar uno nuevo.",
#   "error": "Conflict"
# }
```

### Caso 2: Intentar asignar una batea a 2 choferes diferentes

```bash
# Asignar batea a primer chofer
curl -X PATCH http://localhost:3000/api/v1/bateas/BATEA-001/chofer/CHOFER-001 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Resultado: ✅ 200 OK

# Intentar asignar la misma batea a otro chofer
curl -X PATCH http://localhost:3000/api/v1/bateas/BATEA-001/chofer/CHOFER-002 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Resultado esperado: ❌ 409 Conflict
# {
#   "statusCode": 409,
#   "message": "La batea con patente XYZ-789 ya está asignada al chofer Juan Pérez. Debes desasignarla primero.",
#   "error": "Conflict"
# }
```

### Caso 3: Crear viaje con recursos que no coinciden

```bash
curl -X POST http://localhost:3000/api/v1/viajes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chofer_id": "CHOFER-001",
    "tractor_id": "TRACTOR-002",
    "batea_id": "BATEA-003",
    "origen": "Mangrullo",
    "destino": "Añelo",
    "fecha_salida": "2026-01-07T08:00:00Z"
  }'

# Resultado esperado: ❌ 409 Conflict
# {
#   "statusCode": 409,
#   "message": "El tractor con patente DEF-456 no está asignado al chofer Juan Pérez. Tractor actual del chofer: ABC-123",
#   "error": "Conflict"
# }
```

---

## 📝 Checklist de Implementación

- [ ] Agregar constraints UNIQUE en la base de datos para `tractor_id` y `batea_id`
- [ ] Implementar validación en `asignarChofer()` del servicio de tractores
- [ ] Implementar validación en `asignarChofer()` del servicio de bateas
- [ ] Implementar validación en `asignarBatea()` del servicio de tractores
- [ ] Implementar validación en `crearViaje()` del servicio de viajes
- [ ] Probar con Postman/CURL todos los casos de conflicto
- [ ] Verificar que los mensajes de error sean claros y descriptivos
- [ ] Actualizar la documentación de la API con los nuevos códigos de error

---

## 🎯 Resumen

Con estas validaciones, el sistema garantizará que:

1. Un chofer solo puede tener 1 tractor y 1 batea asignados a la vez
2. Un tractor solo puede estar asignado a 1 chofer y 1 batea a la vez
3. Una batea solo puede estar asignada a 1 chofer y 1 tractor a la vez
4. Al crear un viaje, los recursos seleccionados deben coincidir con los asignados al chofer
5. Los errores se manejan con códigos HTTP apropiados (404, 400, 409)
6. Los mensajes de error son descriptivos y ayudan al usuario a entender el problema

Esto previene inconsistencias en la base de datos y mejora la integridad de los datos del sistema de transporte.