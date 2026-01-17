# Backend: Corregir DTO de Login y Register

## 🐛 Problema Detectado

El frontend está enviando las siguientes propiedades en el login/register:
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

Pero el backend las está rechazando con error 400:
```json
{
  "error": "Bad Request",
  "message": [
    "property email should not exist",
    "property password should not exist"
  ],
  "statusCode": 400
}
```

Esto indica que el **DTO del backend está configurado con `@IsNotEmpty()` en campos que no deberían tenerlo**, o está usando nombres de campos diferentes.

---

## ✅ Solución: Actualizar DTOs en el Backend

### 1. DTO de Login (`login.dto.ts`)

**Asegúrate de que el DTO tenga EXACTAMENTE estos nombres de campos:**

```typescript
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'El email no es válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString({ message: 'La contraseña debe ser un texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}
```

**⚠️ IMPORTANTE:**
- Los campos DEBEN llamarse `email` y `password` (no `correo`, `usuario`, `contraseña`, etc.)
- NO uses `@IsOptional()` en estos campos
- NO uses validadores adicionales que puedan rechazar valores válidos

---

### 2. DTO de Registro (`register.dto.ts`)

**El DTO de registro debe tener estos campos:**

```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsString({ message: 'El nombre completo debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  @Transform(({ value }) => value?.trim())
  nombre_completo: string;

  @IsEmail({}, { message: 'El email no es válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString({ message: 'La contraseña debe ser un texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}
```

**⚠️ IMPORTANTE:**
- El frontend envía `nombre_completo`, `email` y `password`
- NO agregues campos adicionales obligatorios
- NO uses `@IsOptional()` en campos requeridos

---

### 3. DTO de Forgot Password (`forgot-password.dto.ts`)

```typescript
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'El email no es válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}
```

---

## 🔍 Diagnóstico del Error Actual

El error `"property email should not exist"` generalmente ocurre cuando:

### Causa 1: Whitelist activado con campos no definidos
Si tienes `whitelist: true` en la validación global, asegúrate de NO tener decoradores que excluyan campos válidos.

**Verificar en `main.ts`:**
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // ✅ OK - elimina campos no definidos en el DTO
    forbidNonWhitelisted: false, // ⚠️ CAMBIAR a false para evitar rechazar campos válidos
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

**SOLUCIÓN:** Cambia `forbidNonWhitelisted` a `false`.

### Causa 2: Decorador @Exclude o @Expose mal usado
Si estás usando `class-transformer` con `@Exclude()` o `@Expose()`, verifica que NO estés excluyendo los campos `email` o `password`.

**INCORRECTO:**
```typescript
@Exclude() // ❌ NO HACER ESTO
email: string;
```

**CORRECTO:**
```typescript
// Sin decorador @Exclude
email: string;
```

### Causa 3: DTO con nombres de campos diferentes
El DTO del backend podría estar usando nombres diferentes a los que envía el frontend.

**INCORRECTO:**
```typescript
export class LoginDto {
  @IsEmail()
  correo: string;  // ❌ El frontend envía "email", no "correo"

  @IsString()
  contraseña: string;  // ❌ El frontend envía "password", no "contraseña"
}
```

**CORRECTO:**
```typescript
export class LoginDto {
  @IsEmail()
  email: string;  // ✅ Coincide con el frontend

  @IsString()
  password: string;  // ✅ Coincide con el frontend
}
```

---

## 🧪 Testing

### Probar Login con CURL

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@transporte.com",
    "password": "admin123"
  }'
```

**Respuesta esperada (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "usuario_id": "...",
    "email": "admin@transporte.com",
    "nombre": "Administrador",
    "rol": "admin"
  }
}
```

### Probar Register con CURL

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_completo": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "password": "123456"
  }'
```

**Respuesta esperada (201 Created):**
```json
{
  "message": "Usuario registrado exitosamente",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "usuario_id": "...",
    "email": "juan@ejemplo.com",
    "nombre": "Juan Pérez",
    "rol": "chofer",
    "chofer_id": "..."
  }
}
```

---

## 📝 Checklist de Verificación

Verifica estos puntos en tu backend:

- [ ] El archivo `login.dto.ts` tiene los campos `email` y `password` (no otros nombres)
- [ ] El archivo `register.dto.ts` tiene los campos `nombre_completo`, `email` y `password`
- [ ] En `main.ts`, `forbidNonWhitelisted` está en `false`
- [ ] NO hay decoradores `@Exclude()` en los campos del DTO
- [ ] NO hay validadores adicionales que rechacen valores válidos
- [ ] Los DTOs NO tienen propiedades adicionales marcadas como `@IsNotEmpty()`
- [ ] El endpoint `POST /api/v1/auth/login` existe y está configurado correctamente
- [ ] El endpoint `POST /api/v1/auth/register` existe y está configurado correctamente

---

## 🔧 Configuración Recomendada en `main.ts`

```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS para desarrollo
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // Elimina propiedades no definidas en el DTO
      forbidNonWhitelisted: false,  // ⚠️ IMPORTANTE: No rechazar propiedades extras
      transform: true,              // Transforma payloads a instancias de DTO
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(3000);
  console.log(`📡 Servidor corriendo en: http://localhost:3000`);
}
bootstrap();
```

---

## 🎯 Resumen

**El problema:** El backend está rechazando los campos `email` y `password` que envía el frontend.

**La solución:**
1. Asegúrate de que los DTOs usen exactamente los nombres `email` y `password`
2. Cambia `forbidNonWhitelisted` a `false` en `main.ts`
3. Elimina cualquier decorador `@Exclude()` de los campos del DTO
4. Verifica que NO haya validadores adicionales que rechacen valores válidos

Una vez implementados estos cambios, el login y register deberían funcionar correctamente.