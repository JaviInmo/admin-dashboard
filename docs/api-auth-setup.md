# Centralized API and Auth Setup

This project now includes a reusable Axios client, endpoint constants, and an auth service.

## 1) Install dependency

Use your preferred package manager (pick one consistently):

- npm: `npm i axios`
- pnpm: `pnpm add axios`
- yarn: `yarn add axios`

## 2) Configure base URL (frontend-only constants)

Open `src/lib/constants.ts` and set:

- `API_BASE_URL` – your backend base URL (e.g., `http://localhost:3000/api`)
- `WITH_CREDENTIALS` – set to `true` if using cookie-based auth and properly configured CORS

## 3) What’s included

- `src/lib/constants.ts` – centralized base URL and client flags.
- `src/lib/config.ts` – re-exports constants for convenience.
- `src/lib/auth-storage.ts` – localStorage helpers for access/refresh tokens.
- `src/lib/http.ts` – a preconfigured Axios instance with auth interceptors.
- `src/lib/endpoints.ts` – centralized endpoint paths.
- `src/lib/services/auth.ts` – high-level auth calls (login/logout/me) that manage tokens.

## 4) Usage examples

Unauthenticated request:

```ts
import { api } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'

const { data } = await api.get(endpoints.users)
```

Login (stores tokens automatically):

```ts
import * as AuthService from '@/lib/services/auth'

const res = await AuthService.login({ email, password })
console.log(res.user)
```

Get current user:

```ts
import { getCurrentUser } from '@/lib/services/auth'

const me = await getCurrentUser()
```

Logout:

```ts
import { logout } from '@/lib/services/auth'

await logout()
```

## 5) Notes

- Interceptors attach `Authorization: Bearer <token>` when available and clear tokens on `401`.
- If your backend uses cookies instead of bearer tokens, set `WITH_CREDENTIALS = true` in `src/lib/constants.ts` and configure CORS accordingly.
- For refresh tokens/auto-refresh, we can extend the response interceptor to call a refresh endpoint and retry.
