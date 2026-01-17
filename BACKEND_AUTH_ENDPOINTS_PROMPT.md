# Backend: Endpoints de Autenticación - Registro y Recuperación de Contraseña

## Context
Se necesitan dos nuevos endpoints en el backend para completar el sistema de autenticación:
1. **Registro de nuevos usuarios** (choferes)
2. **Recuperación de contraseña** por email

## 1. Endpoint de Registro de Usuario

### Endpoint
```
POST /api/v1/auth/register
```

### Request Body
```json
{
  "nombre_completo": "Juan Pérez González",
  "email": "juan.perez@ejemplo.com",
  "password": "contraseña123"
}
```

### Validaciones Requeridas

1. **nombre_completo**:
   - Campo obligatorio
   - Mínimo 3 caracteres
   - Máximo 100 caracteres
   - Solo letras y espacios

2. **email**:
   - Campo obligatorio
   - Formato de email válido
   - Único en la base de datos (verificar que no exista)
   - Convertir a minúsculas antes de guardar

3. **password**:
   - Campo obligatorio
   - Mínimo 6 caracteres
   - Hash antes de guardar (usar bcrypt o similar)

### Proceso de Registro

1. Validar todos los campos del request
2. Verificar que el email no esté registrado
3. Hashear la contraseña
4. Crear el usuario con rol `'chofer'` por defecto
5. Crear el registro de chofer asociado en la tabla `choferes`
6. Generar token JWT
7. Retornar respuesta con token

### Estructura de Base de Datos

**Tabla `usuarios`:**
```sql
{
  usuario_id: UUID (PK),
  email: string (unique),
  password: string (hashed),
  nombre: string,
  rol: 'admin' | 'chofer',
  chofer_id: UUID (FK, nullable),
  creado_en: timestamp,
  actualizado_en: timestamp
}
```

**Tabla `choferes`:**
```sql
{
  id_chofer: UUID (PK),
  nombre_completo: string,
  tractor_id: UUID (FK, nullable),
  batea_id: UUID (FK, nullable),
  estado_chofer: enum ('activo', 'inactivo', 'cargando', 'descargando', 'viajando', 'descansando', 'licencia_anual', 'licencia_medica', 'licencia_art'),
  razon_estado: string (nullable),
  creado_en: timestamp,
  ultimo_estado_en: timestamp
}
```

### Response - Éxito (201 Created)
```json
{
  "message": "Usuario registrado exitosamente",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "usuario_id": "uuid-here",
    "email": "juan.perez@ejemplo.com",
    "nombre": "Juan Pérez González",
    "rol": "chofer",
    "chofer_id": "chofer-uuid-here"
  }
}
```

### Responses - Error

**400 Bad Request** - Validación fallida:
```json
{
  "error": "ValidationError",
  "message": "Datos inválidos",
  "statusCode": 400,
  "details": "El email no es válido"
}
```

**409 Conflict** - Email ya registrado:
```json
{
  "error": "ConflictError",
  "message": "El email ya está registrado",
  "statusCode": 409,
  "details": "Ya existe un usuario con este email"
}
```

### Lógica de Negocio

1. Al registrarse, el chofer se crea con:
   - `estado_chofer`: `'inactivo'`
   - `tractor_id`: `null`
   - `batea_id`: `null`
   - `razon_estado`: `'Pendiente de asignación'`

2. El administrador deberá posteriormente:
   - Asignar un tractor
   - Asignar una batea
   - Cambiar el estado a `'activo'`

---

## 2. Endpoint de Recuperación de Contraseña

### Endpoint
```
POST /api/v1/auth/forgot-password
```

### Request Body
```json
{
  "email": "juan.perez@ejemplo.com"
}
```

### Validaciones Requeridas

1. **email**:
   - Campo obligatorio
   - Formato de email válido
   - Verificar que exista en la base de datos

### Proceso de Recuperación

1. Validar formato del email
2. Buscar usuario por email
3. Si no existe, retornar error (o éxito genérico por seguridad)
4. Obtener la contraseña guardada (la original, no el hash)
5. Enviar email con la contraseña
6. Retornar respuesta de éxito

### Configuración de Email

**Servicio de Email Recomendado:**
- Usar Nodemailer con Gmail SMTP
- O servicio como SendGrid, Mailgun, AWS SES

**Template del Email:**
```
Asunto: Recuperación de Contraseña - Sistema de Transporte

Hola [nombre_completo],

Has solicitado recuperar tu contraseña para el Sistema de Transporte.

Tu contraseña es: [password]

Por favor, mantén esta información segura.

Si no solicitaste este correo, ignóralo.

---
Sistema de Transporte
```

### Variables de Entorno Necesarias
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
EMAIL_FROM=Sistema de Transporte <noreply@transporte.com>
```

### Response - Éxito (200 OK)
```json
{
  "message": "Se ha enviado un correo con tu contraseña",
  "statusCode": 200
}
```

### Responses - Error

**400 Bad Request** - Email no válido:
```json
{
  "error": "ValidationError",
  "message": "Email no válido",
  "statusCode": 400
}
```

**404 Not Found** - Usuario no encontrado:
```json
{
  "error": "NotFound",
  "message": "No existe un usuario con este email",
  "statusCode": 404
}
```

**500 Internal Server Error** - Error enviando email:
```json
{
  "error": "InternalServerError",
  "message": "Error al enviar el correo electrónico",
  "statusCode": 500,
  "details": "Por favor, intenta nuevamente más tarde"
}
```

---

## 3. Consideraciones de Seguridad

### Para el Registro

1. **Rate Limiting**: Limitar registros por IP (ej: 5 registros por hora)
2. **Validación de Email**: Considerar verificación por email (enviar código)
3. **Captcha**: Opcional para prevenir bots
4. **Blacklist de Emails**: Lista de dominios de email no permitidos

### Para la Recuperación de Contraseña

1. **Rate Limiting**: Limitar intentos por IP y por email (ej: 3 por hora)
2. **Delay de Respuesta**: Añadir pequeño delay para prevenir enumeración de usuarios
3. **Logging**: Registrar todos los intentos de recuperación
4. **Alerta**: Opcional - notificar al admin sobre múltiples intentos

### Importante sobre Passwords

**NOTA CRÍTICA**: El código actual asume que se guardan las contraseñas en texto plano para poder enviarlas por email. **Esto NO es una práctica segura**.

**Recomendación Futura**:
Implementar un sistema de reset de contraseña con token temporal:

1. Usuario solicita reset
2. Generar token temporal (válido por 1 hora)
3. Enviar email con link: `https://app.com/reset-password?token=...`
4. Usuario ingresa nueva contraseña
5. Validar token y actualizar contraseña

Por ahora, si se debe usar el sistema actual:
- Guardar password original en campo separado `password_plain` (temporal)
- Guardar hash en `password`
- Marcar en documentación que esto debe mejorarse

---

## 4. Testing

### Casos de Prueba - Registro

1. ✅ Registro exitoso con datos válidos
2. ✅ Error cuando el email ya existe
3. ✅ Error cuando faltan campos obligatorios
4. ✅ Error cuando el email no es válido
5. ✅ Error cuando la contraseña es muy corta
6. ✅ Verificar que el chofer se crea con estado 'inactivo'
7. ✅ Verificar que el token generado es válido
8. ✅ Verificar que la contraseña se hashea correctamente

### Casos de Prueba - Recuperación

1. ✅ Recuperación exitosa con email válido
2. ✅ Error cuando el email no existe
3. ✅ Error cuando el email es inválido
4. ✅ Verificar que el email se envía correctamente
5. ✅ Verificar rate limiting funciona
6. ✅ Verificar que el email contiene la contraseña correcta

---

## 5. Ejemplo de Implementación (NestJS)

### auth.controller.ts
```typescript
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }
}
```

### register.dto.ts
```typescript
export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nombre_completo: string;

  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

### auth.service.ts (pseudo-código)
```typescript
async register(registerDto: RegisterDto) {
  // 1. Verificar email único
  const existingUser = await this.userRepository.findByEmail(registerDto.email);
  if (existingUser) {
    throw new ConflictException('El email ya está registrado');
  }

  // 2. Hashear password
  const hashedPassword = await bcrypt.hash(registerDto.password, 10);

  // 3. Crear chofer
  const chofer = await this.choferRepository.create({
    nombre_completo: registerDto.nombre_completo,
    estado_chofer: EstadoChofer.INACTIVO,
    razon_estado: 'Pendiente de asignación',
  });

  // 4. Crear usuario
  const user = await this.userRepository.create({
    email: registerDto.email,
    password: hashedPassword,
    nombre: registerDto.nombre_completo,
    rol: 'chofer',
    chofer_id: chofer.id_chofer,
  });

  // 5. Generar token
  const token = this.jwtService.sign({
    sub: user.usuario_id,
    email: user.email,
    rol: user.rol,
  });

  return {
    message: 'Usuario registrado exitosamente',
    access_token: token,
    user: {
      usuario_id: user.usuario_id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      chofer_id: user.chofer_id,
    },
  };
}

async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
  // 1. Buscar usuario
  const user = await this.userRepository.findByEmail(forgotPasswordDto.email);
  if (!user) {
    throw new NotFoundException('No existe un usuario con este email');
  }

  // 2. Enviar email (asumiendo servicio de email configurado)
  await this.emailService.sendPasswordRecovery({
    to: user.email,
    nombre: user.nombre,
    password: user.password_plain, // TEMPORAL - ver nota de seguridad
  });

  return {
    message: 'Se ha enviado un correo con tu contraseña',
    statusCode: 200,
  };
}
```

---

## 6. Frontend Integration

Los endpoints ya están integrados en el frontend:

- `RegisterScreen.tsx`: Llama a `POST /api/v1/auth/register`
- `LoginScreen.tsx`: Llama a `POST /api/v1/auth/forgot-password`

Ambos esperan las respuestas en el formato especificado arriba.

---

## 7. Próximos Pasos

1. Implementar los endpoints en el backend
2. Configurar servicio de email
3. Probar flujos completos
4. Considerar implementación de reset de password con token temporal
5. Añadir verificación de email opcional