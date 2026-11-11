# Block Supply

Free SVG UI blocks you copy and paste into Figma as auto layout.

## Stack
TanStack Start + Router, React 19, Tailwind v4, Better Auth, Postgres (PGLite locally).

## Commands
- `npm run dev` — dev server on `0.0.0.0:8080`
- `npm run build` — production build (runs DB migrations)
- `npm run typecheck`, `npm test`, `npm run lint`

## Auth
Better Auth at `/api/auth/*`: email/password, plus optional Google/GitHub.
See the header of `src/lib/auth/server.ts` for the environment variables.
Email verification: set `RESEND_API_KEY` (and `EMAIL_FROM`) to send verification emails and require
a verified email to log in. Without the key, the link is logged to the server console and
verification is not enforced (local dev).
`VITE_AUTH_ENABLED=false` disables auth and uses a shared dev user.
Protect server functions with `authMiddleware` (`src/lib/auth/middleware.ts`).

## Notes
- Deployed to Vercel: no runtime filesystem writes, no hard-coded hosts or secrets.
- Do not commit a `.env` file.
