# Backend: Actualización del Flujo de Estados de Choferes

## 🎯 Cambios Requeridos

Se necesita actualizar el sistema de estados de choferes para reflejar el flujo de trabajo real de un viaje de transporte.

### Estados Anteriores (A ELIMINAR):
- ❌ `activo` → Reemplazar por `disponible`
- ❌ `licencia_medica` → Reemplazar por `franco`
- ❌ `licencia_art` → Reemplazar por `equipo_en_reparacion`

### Nuevos Estados (IMPLEMENTAR):

| Estado | Valor en DB | Descripción | Orden en Flujo |
|--------|-------------|-------------|----------------|
| **Disponible** | `disponible` | Chofer libre y listo para recibir asignación | 1 / 7 |
| **Cargando** | `cargando` | Chofer está cargando mercancía en origen | 2 |
| **Viajando** | `viajando` | Chofer en ruta (puede repetirse: origen→destino, destino→origen) | 3 / 5 / 7 |
| **Descansando** | `descansando` | Descanso obligatorio durante el viaje | 4 |
| **Descargando** | `descargando` | Descargando mercancía en destino | 6 |
| **Licencia Anual** | `licencia_anual` | Vacaciones programadas | - |
| **Franco** | `franco` | Día franco/descanso semanal | - |
| **Equipo en Reparación** | `equipo_en_reparacion` | Tractor o batea en taller | - |
| **Inactivo** | `inactivo` | Chofer no disponible para viajes | - |

---

## ✅ Flujo de Estados Durante un Viaje

El flujo típico de un chofer durante un viaje completo es:

```
1. DISPONIBLE
   ↓ (Se le asigna un viaje)

2. CARGANDO
   ↓ (Termina de cargar)

3. VIAJANDO (Hacia destino)
   ↓ (Necesita descansar obligatorio)

4. DESCANSANDO
   ↓ (Captura: hora_inicio_descanso = ahora())
   ↓ (Termina descanso y retoma viaje)

5. VIAJANDO (Continuando hacia destino)
   ↓ (Captura: hora_fin_descanso = ahora())
   ↓ (Calcula: horas_descanso = hora_fin - hora_inicio)
   ↓ (Llega a destino)

6. DESCARGANDO
   ↓ (Debe informar toneladas reales descargadas)
   ↓ (Termina descarga)

7. VIAJANDO (Regresando a origen) o DISPONIBLE
```

### Notas Importantes sobre el Flujo:

1. **Captura de Horas de Descanso:**
   - Al marcar `descansando` → capturar `hora_inicio_descanso`
   - Al marcar `viajando` después de `descansando` → capturar `hora_fin_descanso`
   - Calcular automáticamente: `horas_descanso = hora_fin_descanso - hora_inicio_descanso`

2. **Descargando:**
   - Cuando el chofer marca `descargando`, debe poder ingresar las **toneladas reales descargadas**
   - Este dato se almacena en la tabla `viajes` en el campo `toneladas_descargadas`

3. **Estados Especiales:**
   - `franco`: Día de descanso semanal (requiere fecha inicio y opcionalmente fin)
   - `licencia_anual`: Vacaciones (requiere fecha inicio y opcionalmente fin)
   - `equipo_en_reparacion`: Tractor/batea en mantenimiento (requiere fecha inicio y opcionalmente fin)
   - `inactivo`: No disponible para asignaciones

---

## 📝 Cambios en la Base de Datos

### 1. Actualizar ENUM de Estado Chofer

```sql
-- PostgreSQL: Modificar el ENUM existente

-- Paso 1: Agregar los nuevos valores al enum
ALTER TYPE estado_chofer_enum ADD VALUE IF NOT EXISTS 'disponible';
ALTER TYPE estado_chofer_enum ADD VALUE IF NOT EXISTS 'franco';
ALTER TYPE estado_chofer_enum ADD VALUE IF NOT EXISTS 'equipo_en_reparacion';

-- Paso 2: Actualizar registros existentes
UPDATE choferes SET estado_chofer = 'disponible' WHERE estado_chofer = 'activo';
UPDATE choferes SET estado_chofer = 'franco' WHERE estado_chofer = 'licencia_medica';
UPDATE choferes SET estado_chofer = 'equipo_en_reparacion' WHERE estado_chofer = 'licencia_art';

-- Paso 3: Si deseas eliminar los valores antiguos (OPCIONAL y PELIGROSO)
-- NOTA: Esto requiere recrear el ENUM y puede ser complejo.
-- Es más seguro dejar los valores antiguos en el enum pero no usarlos.
-- Si decides eliminarlos, sigue este proceso:

-- 3.1. Crear nuevo ENUM con los valores correctos
CREATE TYPE estado_chofer_enum_new AS ENUM (
  'disponible',
  'cargando',
  'viajando',
  'descansando',
  'descargando',
  'licencia_anual',
  'franco',
  'equipo_en_reparacion',
  'inactivo'
);

-- 3.2. Modificar la columna para usar el nuevo enum
ALTER TABLE choferes
  ALTER COLUMN estado_chofer TYPE estado_chofer_enum_new
  USING estado_chofer::text::estado_chofer_enum_new;

-- 3.3. Eliminar el enum antiguo
DROP TYPE estado_chofer_enum;

-- 3.4. Renombrar el nuevo enum
ALTER TYPE estado_chofer_enum_new RENAME TO estado_chofer_enum;
```

### 2. Agregar Campos para Tracking de Descanso (Si no existen)

```sql
-- Tabla: viajes (o crear tabla viajes_tracking si prefieres separar)

ALTER TABLE viajes ADD COLUMN IF NOT EXISTS hora_inicio_descanso TIMESTAMP;
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS hora_fin_descanso TIMESTAMP;
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS horas_descanso DECIMAL(5,2); -- Calculado automáticamente

-- Trigger para calcular horas_descanso automáticamente
CREATE OR REPLACE FUNCTION calcular_horas_descanso()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hora_fin_descanso IS NOT NULL AND NEW.hora_inicio_descanso IS NOT NULL THEN
    NEW.horas_descanso := EXTRACT(EPOCH FROM (NEW.hora_fin_descanso - NEW.hora_inicio_descanso)) / 3600.0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_horas_descanso
BEFORE INSERT OR UPDATE ON viajes
FOR EACH ROW
EXECUTE FUNCTION calcular_horas_descanso();
```

### 3. Validar Campo `toneladas_descargadas`

```sql
-- Asegurar que existe el campo toneladas_descargadas en viajes
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS toneladas_descargadas DECIMAL(10,2);
```

---

## 🔧 Cambios en el Backend (NestJS)

### 1. Actualizar Entity: Chofer (chofer.entity.ts)

```typescript
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';

export enum EstadoChofer {
  DISPONIBLE = 'disponible',
  CARGANDO = 'cargando',
  VIAJANDO = 'viajando',
  DESCANSANDO = 'descansando',
  DESCARGANDO = 'descargando',
  LICENCIA_ANUAL = 'licencia_anual',
  FRANCO = 'franco',
  EQUIPO_EN_REPARACION = 'equipo_en_reparacion',
  INACTIVO = 'inactivo',
}

@Entity('choferes')
export class Chofer {
  @PrimaryGeneratedColumn('uuid')
  id_chofer: string;

  @Column()
  nombre_completo: string;

  @Column({
    type: 'enum',
    enum: EstadoChofer,
    default: EstadoChofer.DISPONIBLE,
  })
  estado_chofer: EstadoChofer;

  @Column({ nullable: true })
  razon_estado: string;

  @Column({ type: 'timestamp', nullable: true })
  fecha_inicio_licencia: Date;

  @Column({ type: 'timestamp', nullable: true })
  fecha_fin_licencia: Date;

  @Column({ type: 'uuid', nullable: true })
  tractor_id: string;

  @Column({ type: 'uuid', nullable: true })
  batea_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  creado_en: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  ultimo_estado_en: Date;

  // Relaciones
  @ManyToOne(() => Tractor, { nullable: true })
  @JoinColumn({ name: 'tractor_id' })
  tractor?: Tractor;

  @ManyToOne(() => Batea, { nullable: true })
  @JoinColumn({ name: 'batea_id' })
  batea?: Batea;
}
```

### 2. Actualizar Entity: Viaje (viaje.entity.ts)

```typescript
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('viajes')
export class Viaje {
  @PrimaryGeneratedColumn('uuid')
  viaje_id: string;

  @Column({ type: 'uuid' })
  chofer_id: string;

  @Column({ type: 'uuid' })
  tractor_id: string;

  @Column({ type: 'uuid' })
  batea_id: string;

  @Column()
  origen: string;

  @Column()
  destino: string;

  @Column({ type: 'timestamp' })
  fecha_salida: Date;

  @Column({ type: 'timestamp', nullable: true })
  fecha_descarga: Date;

  @Column({ nullable: true })
  numero_remito: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  toneladas_cargadas: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  toneladas_descargadas: number;

  // Nuevos campos para tracking de descanso
  @Column({ type: 'timestamp', nullable: true })
  hora_inicio_descanso: Date;

  @Column({ type: 'timestamp', nullable: true })
  hora_fin_descanso: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  horas_descanso: number; // Calculado automáticamente

  @Column({
    type: 'enum',
    enum: EstadoViaje,
    default: EstadoViaje.EN_CURSO,
  })
  estado_viaje: EstadoViaje;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  creado_en: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  actualizado_en: Date;

  // Relaciones
  @ManyToOne(() => Chofer)
  @JoinColumn({ name: 'chofer_id' })
  chofer?: Chofer;

  @ManyToOne(() => Tractor)
  @JoinColumn({ name: 'tractor_id' })
  tractor?: Tractor;

  @ManyToOne(() => Batea)
  @JoinColumn({ name: 'batea_id' })
  batea?: Batea;
}
```

### 3. Actualizar DTO: UpdateEstadoChoferDto

```typescript
import { IsEnum, IsOptional, IsString, IsISO8601, IsNumber } from 'class-validator';
import { EstadoChofer } from '../entities/chofer.entity';

export class UpdateEstadoChoferDto {
  @IsEnum(EstadoChofer)
  estado_chofer: EstadoChofer;

  @IsOptional()
  @IsString()
  razon_estado?: string;

  // Para estados que requieren fechas (licencia_anual, franco, equipo_en_reparacion)
  @IsOptional()
  @IsISO8601()
  fecha_inicio_licencia?: string;

  @IsOptional()
  @IsISO8601()
  fecha_fin_licencia?: string;

  // Para el estado DESCARGANDO: capturar toneladas descargadas
  @IsOptional()
  @IsNumber()
  toneladas_descargadas?: number;
}
```

### 4. Actualizar Servicio: ChoferesSer vice (choferes.service.ts)

```typescript
async actualizarEstado(
  choferId: string,
  updateEstadoDto: UpdateEstadoChoferDto,
): Promise<Chofer> {
  const chofer = await this.choferesRepository.findOne({
    where: { id_chofer: choferId },
    relations: ['tractor', 'batea'],
  });

  if (!chofer) {
    throw new NotFoundException(`Chofer con ID ${choferId} no encontrado`);
  }

  const estadoPrevio = chofer.estado_chofer;
  const nuevoEstado = updateEstadoDto.estado_chofer;

  // Validar transiciones de estados
  this.validarTransicionEstado(estadoPrevio, nuevoEstado);

  // Actualizar estado del chofer
  chofer.estado_chofer = nuevoEstado;
  chofer.ultimo_estado_en = new Date();

  // Si el estado requiere fechas, validar y guardar
  const estadosConFechas = [
    EstadoChofer.LICENCIA_ANUAL,
    EstadoChofer.FRANCO,
    EstadoChofer.EQUIPO_EN_REPARACION,
  ];

  if (estadosConFechas.includes(nuevoEstado)) {
    if (!updateEstadoDto.fecha_inicio_licencia) {
      throw new BadRequestException(
        `El estado "${nuevoEstado}" requiere una fecha de inicio`
      );
    }
    chofer.fecha_inicio_licencia = new Date(updateEstadoDto.fecha_inicio_licencia);
    chofer.fecha_fin_licencia = updateEstadoDto.fecha_fin_licencia
      ? new Date(updateEstadoDto.fecha_fin_licencia)
      : null;
  } else {
    // Limpiar fechas si el estado no las requiere
    chofer.fecha_inicio_licencia = null;
    chofer.fecha_fin_licencia = null;
  }

  // Lógica especial para DESCANSANDO
  if (nuevoEstado === EstadoChofer.DESCANSANDO) {
    // Buscar el viaje activo del chofer
    const viajeActivo = await this.viajesRepository.findOne({
      where: {
        chofer_id: choferId,
        estado_viaje: EstadoViaje.EN_CURSO,
      },
    });

    if (viajeActivo) {
      // Registrar hora de inicio de descanso
      viajeActivo.hora_inicio_descanso = new Date();
      await this.viajesRepository.save(viajeActivo);
    }
  }

  // Lógica especial para VIAJANDO después de DESCANSANDO
  if (
    nuevoEstado === EstadoChofer.VIAJANDO &&
    estadoPrevio === EstadoChofer.DESCANSANDO
  ) {
    const viajeActivo = await this.viajesRepository.findOne({
      where: {
        chofer_id: choferId,
        estado_viaje: EstadoViaje.EN_CURSO,
      },
    });

    if (viajeActivo && viajeActivo.hora_inicio_descanso) {
      // Registrar hora de fin de descanso
      viajeActivo.hora_fin_descanso = new Date();

      // Calcular horas de descanso
      const milisegundos = viajeActivo.hora_fin_descanso.getTime() - viajeActivo.hora_inicio_descanso.getTime();
      viajeActivo.horas_descanso = Number((milisegundos / (1000 * 60 * 60)).toFixed(2));

      await this.viajesRepository.save(viajeActivo);
    }
  }

  // Lógica especial para DESCARGANDO
  if (nuevoEstado === EstadoChofer.DESCARGANDO) {
    if (updateEstadoDto.toneladas_descargadas !== undefined) {
      const viajeActivo = await this.viajesRepository.findOne({
        where: {
          chofer_id: choferId,
          estado_viaje: EstadoViaje.EN_CURSO,
        },
      });

      if (viajeActivo) {
        viajeActivo.toneladas_descargadas = updateEstadoDto.toneladas_descargadas;
        await this.viajesRepository.save(viajeActivo);
      } else {
        throw new BadRequestException(
          'No se encontró un viaje activo para registrar las toneladas descargadas'
        );
      }
    }
  }

  // Guardar el chofer con el nuevo estado
  const choferActualizado = await this.choferesRepository.save(chofer);

  return choferActualizado;
}

// Método helper para validar transiciones de estados
private validarTransicionEstado(
  estadoActual: EstadoChofer,
  nuevoEstado: EstadoChofer,
): void {
  // Transiciones válidas desde cada estado
  const transicionesValidas: Record<EstadoChofer, EstadoChofer[]> = {
    [EstadoChofer.DISPONIBLE]: [
      EstadoChofer.CARGANDO,
      EstadoChofer.FRANCO,
      EstadoChofer.LICENCIA_ANUAL,
      EstadoChofer.EQUIPO_EN_REPARACION,
      EstadoChofer.INACTIVO,
    ],
    [EstadoChofer.CARGANDO]: [
      EstadoChofer.VIAJANDO,
      EstadoChofer.DISPONIBLE, // Por si se cancela
    ],
    [EstadoChofer.VIAJANDO]: [
      EstadoChofer.DESCANSANDO,
      EstadoChofer.DESCARGANDO,
      EstadoChofer.DISPONIBLE,
    ],
    [EstadoChofer.DESCANSANDO]: [EstadoChofer.VIAJANDO],
    [EstadoChofer.DESCARGANDO]: [
      EstadoChofer.VIAJANDO, // Regreso
      EstadoChofer.DISPONIBLE,
    ],
    [EstadoChofer.LICENCIA_ANUAL]: [EstadoChofer.DISPONIBLE],
    [EstadoChofer.FRANCO]: [EstadoChofer.DISPONIBLE],
    [EstadoChofer.EQUIPO_EN_REPARACION]: [EstadoChofer.DISPONIBLE],
    [EstadoChofer.INACTIVO]: [EstadoChofer.DISPONIBLE],
  };

  const transicionesPermitidas = transicionesValidas[estadoActual] || [];

  if (!transicionesPermitidas.includes(nuevoEstado)) {
    throw new BadRequestException(
      `Transición inválida: No se puede cambiar de "${estadoActual}" a "${nuevoEstado}"`
    );
  }
}
```

---

## 🧪 Testing

### Caso 1: Flujo Completo de Viaje

```bash
CHOFER_ID="uuid-del-chofer"
TOKEN="tu-jwt-token"

# 1. Disponible → Cargando
curl -X PATCH http://localhost:3000/api/v1/choferes/${CHOFER_ID}/estado \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"estado_chofer": "cargando"}'

# 2. Cargando → Viajando
curl -X PATCH http://localhost:3000/api/v1/choferes/${CHOFER_ID}/estado \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"estado_chofer": "viajando"}'

# 3. Viajando → Descansando (captura hora_inicio_descanso)
curl -X PATCH http://localhost:3000/api/v1/choferes/${CHOFER_ID}/estado \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"estado_chofer": "descansando"}'

# Esperar un tiempo simulado...

# 4. Descansando → Viajando (captura hora_fin_descanso y calcula horas)
curl -X PATCH http://localhost:3000/api/v1/choferes/${CHOFER_ID}/estado \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"estado_chofer": "viajando"}'

# 5. Viajando → Descargando (con toneladas descargadas)
curl -X PATCH http://localhost:3000/api/v1/choferes/${CHOFER_ID}/estado \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "estado_chofer": "descargando",
    "toneladas_descargadas": 28.5
  }'

# 6. Descargando → Disponible
curl -X PATCH http://localhost:3000/api/v1/choferes/${CHOFER_ID}/estado \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"estado_chofer": "disponible"}'
```

### Caso 2: Transición Inválida (Debe fallar)

```bash
# Intentar ir de CARGANDO a DESCARGANDO directamente (no permitido)
curl -X PATCH http://localhost:3000/api/v1/choferes/${CHOFER_ID}/estado \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"estado_chofer": "descargando"}'

# Respuesta esperada: 400 Bad Request
# {
#   "statusCode": 400,
#   "message": "Transición inválida: No se puede cambiar de \"cargando\" a \"descargando\"",
#   "error": "Bad Request"
# }
```

### Caso 3: Franco con Fechas

```bash
curl -X PATCH http://localhost:3000/api/v1/choferes/${CHOFER_ID}/estado \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "estado_chofer": "franco",
    "fecha_inicio_licencia": "2026-01-15T00:00:00Z",
    "fecha_fin_licencia": "2026-01-16T23:59:59Z"
  }'
```

---

## ⚠️ Manejo de Errores

### Errores a Implementar:

1. **400 Bad Request - Transición inválida:**
   ```json
   {
     "statusCode": 400,
     "message": "Transición inválida: No se puede cambiar de \"cargando\" a \"disponible\"",
     "error": "Bad Request"
   }
   ```

2. **400 Bad Request - Falta fecha requerida:**
   ```json
   {
     "statusCode": 400,
     "message": "El estado \"franco\" requiere una fecha de inicio",
     "error": "Bad Request"
   }
   ```

3. **400 Bad Request - No hay viaje activo:**
   ```json
   {
     "statusCode": 400,
     "message": "No se encontró un viaje activo para registrar las toneladas descargadas",
     "error": "Bad Request"
   }
   ```

4. **404 Not Found - Chofer no existe:**
   ```json
   {
     "statusCode": 404,
     "message": "Chofer con ID abc-123 no encontrado",
     "error": "Not Found"
   }
   ```

---

## 📋 Checklist de Implementación

- [ ] Actualizar ENUM `EstadoChofer` en la base de datos
- [ ] Migrar registros existentes (`activo` → `disponible`, etc.)
- [ ] Agregar campos de tracking de descanso a tabla `viajes`
- [ ] Crear trigger para calcular `horas_descanso` automáticamente
- [ ] Actualizar entity `Chofer` con nuevo enum
- [ ] Actualizar entity `Viaje` con campos de descanso
- [ ] Actualizar DTO `UpdateEstadoChoferDto`
- [ ] Implementar método `validarTransicionEstado()` en servicio
- [ ] Implementar lógica especial para `DESCANSANDO`
- [ ] Implementar lógica especial para `VIAJANDO` después de `DESCANSANDO`
- [ ] Implementar lógica especial para `DESCARGANDO` con toneladas
- [ ] Probar todos los casos de flujo completo
- [ ] Probar transiciones inválidas (deben fallar con 400)
- [ ] Probar estados con fechas (franco, licencia, equipo en reparación)
- [ ] Verificar que horas de descanso se calculan correctamente
- [ ] Documentar en Swagger/OpenAPI los nuevos estados y transiciones

---

## 📊 Resumen de Cambios

| Componente | Cambios |
|------------|---------|
| **Base de Datos** | Nuevo ENUM con 9 estados, campos de tracking de descanso, trigger automático |
| **Entity Chofer** | Enum actualizado, campos de fechas de licencia |
| **Entity Viaje** | Campos: hora_inicio_descanso, hora_fin_descanso, horas_descanso, toneladas_descargadas |
| **DTOs** | UpdateEstadoChoferDto con validaciones |
| **Servicio** | Lógica de transiciones, tracking automático de descanso, validaciones |
| **Errores** | Mensajes claros para transiciones inválidas y datos faltantes |

Con estos cambios, el sistema reflejará con precisión el flujo de trabajo real de los choferes durante sus viajes, permitiendo un mejor control y análisis de las operaciones de transporte.