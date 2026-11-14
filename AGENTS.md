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
Owner dashboard at `/admin`: set `ADMIN_EMAILS` (comma separated) to the emails allowed to open it; in
production the account must have a verified email (sign in with Google). Everyone else gets "Page not
found". It has a date range, headline numbers against the previous period, charts, a first-copy-to-account
funnel, per-block and per-member tables (CSV export) and the latest copies and failures. Copies are logged to
`copy_events` and failed copies (with the browser error) to `copy_failures`. Visitors and page views come from Vercel Analytics, which must be
enabled in the Vercel project (Analytics tab).
QC comments (local only): run `VITE_QC_ENABLED=true npm run dev`, press "Review" (bottom left) and click
anywhere on a card or in the editor to pin a comment; Option-click opens a card's editor. Comments are kept in
`.qc/comments.json` (git-ignored) with the block, the part under the pin and the page; a fix can be written back
as `reply`. The `/api/qc` endpoint is a 404 outside `npm run dev`, so none of this exists in production.
Mimic (screenshot to editable block, `/mimic`) is behind a flag: only `VITE_MIMIC_ENABLED=true` turns it on (the
server functions answer "Not found" otherwise, so production shows "Coming soon"). It needs `ANTHROPIC_API_KEY`,
is for signed-in visitors and limited by `MIMIC_PER_DAY` (default 3, rolling 24 hours, in `mimic_runs`). `MIMIC_MODEL`
overrides the model (default `claude-sonnet-5-5`). Locally `MIMIC_MOCK=true` returns a stand-in block without calling
the model. The model's HTML is rebuilt from an allow-list in `src/lib/mimic-html.ts` before it is drawn.
Protect server functions with `authMiddleware` (`src/lib/auth/middleware.ts`).

## Notes
- Deployed to Vercel: no runtime filesystem writes, no hard-coded hosts or secrets.
- Do not commit a `.env` file.
