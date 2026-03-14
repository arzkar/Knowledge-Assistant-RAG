# Authentication & Security Specification

## 1. Authentication Engine
The project uses [Better-Auth](http://better-auth.com/) for unified authentication and session management. This ensures production-ready security for JWT issuance, token rotation, and account lifecycle.

## 2. JWT Configuration
- **Mechanism**: Stateless JWT (Bearer tokens).
- **Header**: `Authorization: Bearer <token>`.
- **Payload**:
    - `sub`: `userId` (UUID)
    - `email`: `user@test.com`
    - `role`: `USER` | `ADMIN`
- **Rules**: JWT secrets and expiration times MUST be fetched via `ConfigService` from `.env`.

## 3. Multi-Tenancy & User Isolation
- **Strict Ownership**: Every resource (`document`, `chunk`) belongs to a `userId`.
- **Backend Enforcement**:
    - Use `@UseGuards(JwtAuthGuard)` on all protected routes.
    - Use the `@CurrentUser()` decorator to extract `userId` within controllers.
    - Services MUST check ownership before any mutation (`Update`, `Delete`).
    - Querying MUST include a `userId` filter.

## 4. SSE (Server-Sent Events) Authentication
- **Problem**: Native `EventSource` in browsers does not support custom headers for tokens.
- **Solution**:
    1.  **Proxying**: Use a Next.js API route as a proxy. The proxy adds the `Authorization` header and forwards the stream from the backend.
    2.  **Frontend**: Calls `/api/proxy/stream` on the Next.js server.

## 5. Password Security
- **Algorithm**: Bcrypt with 10 salt rounds.
- **Rules**:
    - Minimum password length: 8 characters.
    - Never log passwords or return `passwordHash` in API responses.

## 6. Forbidden Security Practices
- No Clerk, Auth0, or external Firebase Auth (must be local).
- No sessions (must be stateless JWT).
- No hardcoded secrets.
- No direct DB access bypassing ownership checks.
