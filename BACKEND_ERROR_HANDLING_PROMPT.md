# Backend Error Handling and Authorization Improvements

## Context
The frontend React Native app is receiving generic 403 Forbidden errors when making API requests. These errors need to be improved with better error messages, proper HTTP status codes, and consistent error formats.

## Current Issues

### 1. Generic Error Messages
Current backend response:
```json
{
  "error": "Forbidden",
  "message": "Forbidden resource",
  "statusCode": 403
}
```

This doesn't tell the frontend:
- WHY access was denied
- WHAT permission is missing
- WHAT action the user should take

### 2. Missing Authentication vs Authorization Distinction
The backend should differentiate between:
- **401 Unauthorized**: User is not authenticated (no token, invalid token, expired token)
- **403 Forbidden**: User is authenticated but lacks permissions for this resource/action

### 3. Inconsistent Error Responses
All error responses should follow a consistent format that the frontend can reliably parse.

## Required Backend Improvements

### 1. Implement Proper HTTP Status Codes

**401 Unauthorized** - Use when:
- No authentication token provided
- Token is invalid or expired
- Token signature verification fails

**403 Forbidden** - Use when:
- User is authenticated but doesn't have the required role (e.g., chofer trying to access admin endpoints)
- User is authenticated but doesn't have permission for this specific resource
- Resource exists but user cannot access it

**404 Not Found** - Use when:
- Resource doesn't exist (not when user lacks permission to view it)

### 2. Improve Error Response Format

Implement a consistent error response structure:

```typescript
interface ErrorResponse {
  error: string;           // Error type (e.g., "Unauthorized", "Forbidden", "ValidationError")
  message: string;         // User-friendly message in Spanish
  statusCode: number;      // HTTP status code
  details?: string;        // Optional: More specific technical details
  requiredRole?: string;   // Optional: For 403 errors, what role is needed
  action?: string;         // Optional: What action the user should take
}
```

### 3. Specific Error Messages by Endpoint

#### Authentication Endpoints (`/api/v1/auth/*`)

**401 Unauthorized examples:**
```json
{
  "error": "Unauthorized",
  "message": "No se proporcionó token de autenticación",
  "statusCode": 401,
  "action": "Inicia sesión para continuar"
}
```

```json
{
  "error": "Unauthorized",
  "message": "Token de autenticación inválido o expirado",
  "statusCode": 401,
  "action": "Vuelve a iniciar sesión"
}
```

#### Resource Endpoints (choferes, tractores, bateas, viajes)

**403 Forbidden examples:**
```json
{
  "error": "Forbidden",
  "message": "No tienes permisos para acceder a este recurso",
  "statusCode": 403,
  "requiredRole": "admin",
  "details": "Solo los administradores pueden gestionar choferes"
}
```

```json
{
  "error": "Forbidden",
  "message": "Los choferes solo pueden ver su propia información",
  "statusCode": 403,
  "details": "No puedes acceder a la información de otros choferes"
}
```

**404 Not Found example:**
```json
{
  "error": "NotFound",
  "message": "Chofer no encontrado",
  "statusCode": 404,
  "details": "No existe un chofer con el ID proporcionado"
}
```

### 4. Role-Based Access Control (RBAC) Implementation

Update your authorization guards/middleware to:

1. **Check authentication first** (401 if not authenticated)
2. **Check authorization second** (403 if authenticated but lacks permission)
3. **Return specific error messages** based on the role and endpoint

Example implementation pattern (pseudo-code):

```typescript
// Authentication Guard
if (!token) {
  throw new UnauthorizedException({
    message: 'No se proporcionó token de autenticación',
    action: 'Inicia sesión para continuar'
  });
}

if (!isValidToken(token)) {
  throw new UnauthorizedException({
    message: 'Token de autenticación inválido o expirado',
    action: 'Vuelve a iniciar sesión'
  });
}

// Authorization Guard
const user = getUserFromToken(token);

if (endpoint.requiresRole && user.rol !== endpoint.requiresRole) {
  throw new ForbiddenException({
    message: `No tienes permisos para acceder a este recurso`,
    requiredRole: endpoint.requiresRole,
    details: `Solo los ${endpoint.requiresRole}s pueden acceder a este recurso`
  });
}

// Resource-level authorization
if (endpoint === '/api/v1/choferes/:id' && user.rol === 'chofer') {
  if (user.chofer_id !== params.id) {
    throw new ForbiddenException({
      message: 'Solo puedes acceder a tu propia información',
      details: 'No puedes ver la información de otros choferes'
    });
  }
}
```

### 5. Endpoint-Specific Authorization Rules

| Endpoint | Admin Access | Chofer Access |
|----------|--------------|---------------|
| GET /api/v1/choferes | ✅ All choferes | ✅ Only their own data |
| GET /api/v1/choferes/:id | ✅ Any chofer | ✅ Only if :id matches their chofer_id |
| POST/PATCH/DELETE /api/v1/choferes | ✅ Full access | ❌ Forbidden |
| GET /api/v1/tractores | ✅ All tractores | ✅ Only their assigned tractor |
| POST/PATCH/DELETE /api/v1/tractores | ✅ Full access | ❌ Forbidden |
| GET /api/v1/bateas | ✅ All bateas | ✅ Only their assigned batea |
| POST/PATCH/DELETE /api/v1/bateas | ✅ Full access | ❌ Forbidden |
| GET /api/v1/viajes | ✅ All viajes | ✅ Only their own viajes |
| POST /api/v1/viajes | ✅ Full access | ❌ Forbidden |
| PATCH /api/v1/choferes/:id/estado | ✅ Any chofer | ✅ Only if :id matches their chofer_id |

### 6. Logging and Monitoring

Add server-side logging for:
- Failed authentication attempts
- Authorization failures (403 errors)
- Pattern of repeated 403s from same user (possible attack)
- Unusual access patterns

DO NOT log:
- Full error stack traces to the client
- Internal implementation details
- Sensitive data (passwords, full tokens, etc.)

### 7. Rate Limiting

Consider implementing rate limiting on:
- Authentication endpoints (prevent brute force)
- Resource listing endpoints (prevent data scraping)
- Failed authentication attempts per IP

### 8. Testing Checklist

Ensure backend tests cover:
- [ ] Unauthenticated requests return 401 with proper message
- [ ] Invalid/expired tokens return 401 with proper message
- [ ] Admin accessing admin endpoints returns 200
- [ ] Chofer accessing admin-only endpoints returns 403 with proper message
- [ ] Chofer accessing their own data returns 200
- [ ] Chofer accessing another chofer's data returns 403 with proper message
- [ ] Non-existent resources return 404 (not 403)
- [ ] Error response format is consistent across all endpoints

## Implementation Priority

1. **High Priority**
   - Distinguish between 401 and 403 errors
   - Add meaningful error messages in Spanish
   - Implement consistent error response format

2. **Medium Priority**
   - Add role-based access control for all endpoints
   - Implement chofer-specific data filtering
   - Add server-side logging

3. **Low Priority**
   - Rate limiting
   - Advanced monitoring
   - Performance optimization

## Expected Outcome

After implementing these changes:
1. Frontend will receive clear, actionable error messages
2. Users will understand why they can't access certain resources
3. Debugging will be easier for both frontend and backend developers
4. Security will be improved through proper authentication/authorization separation
5. Console errors in the frontend will be significantly reduced