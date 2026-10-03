# Facility Condition Assessment — Next.js + Express + PostgreSQL

This is the **original blue Facility Condition Assessment application**, exported as an independent TypeScript source project. The 1Crew branded site is not included or changed.

The client is Next.js App Router with React, Tailwind and Shadcn components. The server is Node.js/Express 5. Neon-compatible PostgreSQL stores records, sessions, ratings, quantities and prices. Private Vercel Blob or Azure Blob Storage stores uploaded files. Axios is the only client API transport.

There are **no seeded users, projects, assessment findings, measurements, ratings or prices**, no mock API routes and no SQLite/Cloudflare database dependencies. `client/src/lib/catalog.ts` contains reusable blank checklist definitions, not client assessment records. A standard template creates blank rows only when an authenticated assessor creates a project. No Baobab facility names or assessed data are bundled.

## Project layout

| Path | Purpose |
| --- | --- |
| `client/src/app/` | Welcome/workspace route, login, registration, password recovery/reset, email verification, account |
| `client/src/components/assessment/` | Functional areas, element/component capture, QS pricing, reports, signature pad |
| `client/src/components/ui/` | Shadcn button, dialog and alert dialog |
| `client/src/context/auth-context.tsx` | Shared user state, login/logout, session loading and proactive renewal |
| `client/src/api/` | Axios instance, CSRF and refresh handling, typed auth/project/upload/report clients |
| `client/src/lib/` | Checklist configuration, workbook import, BOQ CSV, PDF and costing |
| `client/src/types/` | TypeScript DTOs |
| `server/src/` | Express app/startup, services, validation, utilities, migration scripts |
| `server/controllers/` | Authentication, projects, uploads, reports |
| `server/routes/` | Real Express endpoints |
| `server/models/` | Parameterized PostgreSQL queries and transactional domain writes |
| `server/configs/` | Validated environment, PostgreSQL, private blob providers, logging |
| `server/middleware/` | JWT/session auth, crypto-based CSRF, validation, persistent rate limits, uploads, errors |
| `server/types/` | Domain and authenticated Express request types |
| `server/sql/migrations/001_initial.sql` | All application tables, constraints and indexes |
| `server/sql/schema.sql` | Complete SQL-editor bootstrap including migration bookkeeping |
| `server/tests/` | Unit tests and an opt-in integration suite using a real PostgreSQL test database |
| `.env.example` | Reference containing all client/server environment keys |

## Local setup (including VS Code on Windows)

1. Install Node **22.13 or newer** and open this folder in VS Code. Use `nvm install 22` and `nvm use 22` if your NVM distribution supports major-version selection. `.nvmrc` specifies Node 22.
2. In the terminal at the project root, run:

```sh
npm ci
```

3. Copy the environment files. On PowerShell:

```powershell
Copy-Item client/.env.example client/.env.local
Copy-Item server/.env.example server/.env
```

On macOS/Linux:

```sh
cp client/.env.example client/.env.local
cp server/.env.example server/.env
```

4. Fill `server/.env` with real Neon, blob and SMTP credentials. Keep `NODE_ENV=development`, `COOKIE_SECURE=false`, `CLIENT_ORIGIN=http://localhost:3000` for localhost. Generate **three separate** authentication secrets using this command three times:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

5. Create the PostgreSQL schema:

```sh
npm run db:migrate
npm run db:check
```

6. Start the two applications:

```sh
npm run dev
```

Open **http://localhost:3000**. Express listens on port **4000**. Register with your own email, open the verification email, then log in and create your first project. No default accounts or passwords exist.

The root environment example is a reference; the processes load **`server/.env`** and **`client/.env.local`**. Server startup validates configuration and checks the database migration table and blob store. A blank secret or missing service credential produces an explicit startup error rather than silently falling back to local/mock storage.

## Neon and SQL

Create a database and role in Neon. Put its **pooled connection URL** in `DATABASE_URL` and its **direct/non-pooler URL** in `DATABASE_DIRECT_URL`. Passwords containing URL-reserved characters must be URL encoded. The Node PostgreSQL pool verifies TLS certificates; do not disable verification for Neon.

The migration command uses the direct URL, a PostgreSQL advisory lock, checksum checks and one transaction per migration. It creates `schema_migrations` and applies the migration once. Do not modify an already-applied migration; add a new numbered migration instead.

If you prefer the Neon SQL editor, apply **`server/sql/schema.sql` once to an empty database** instead of running the initial migration. It includes the same schema and records the migration checksum, so later migrations still work. Do not reapply the full snapshot to a populated database. `server/sql/00_create_database.sql` documents the optional role/database commands for self-hosted PostgreSQL; Neon provisions those through its console.

The schema includes:

- Users, email verification/reset tokens and revocable rotating authentication sessions.
- Owner-scoped projects with optimistic versions and archive timestamps.
- Functional areas, elements and components with foreign-key constraints.
- Five condition percentages, quantities, monetary rates/costs, priorities and remedial scope.
- Project pricing allowances, attachment metadata, audit events, distributed rate limits and durable blob deletion tasks.

Application queries are in `server/models/` and `server/controllers/`. User values are SQL parameters. The payload API preserves the existing UI contract while the records are stored in relational tables, **not a SQLite file or a single project JSON database column**. Quantity and money columns use PostgreSQL numeric types. Saves bulk-upsert rows in a transaction and require `version` to reject stale updates.

## Private blob storage

`BLOB_PROVIDER=vercel` is the default. Create a **private** Vercel Blob store and fill `BLOB_READ_WRITE_TOKEN`. You can host Express outside Vercel; the server-side SDK uses this token. Every write requires private access. URLs and provider credentials are never returned to the client: Express checks project ownership before streaming file content.

For Azure, set `BLOB_PROVIDER=azure`, fill `AZURE_STORAGE_CONNECTION_STRING`, and provision the named **private** `AZURE_STORAGE_CONTAINER`. Leave the Vercel token blank. Azure startup rejects public containers.

Use one provider for a deployment. Do not switch providers with existing uploads without first migrating the objects referenced by `attachments.blob_key`.

Photos, facility and assessment-company logos, signatures: PNG/JPEG/WebP, up to **5 MB** each. A component can have **10 photos**. Site plans: PDF, PNG/JPEG/WebP, DWG or ASCII DXF, up to **20 MB**. Report email attachments: PDF up to **20 MB**. File contents are inspected; a filename/MIME claim alone is insufficient. DXF/DWG files download as attachments rather than rendering as executable content. The web UI does not render a CAD viewer.

Replaced/deleted files are queued in PostgreSQL and deleted by the server maintenance worker. Archived projects retain their files so they can be restored by asset number. Archive is a soft deletion, not permanent erasure. If an archived project has no asset number, it cannot be found through the asset-number restore screen; assign an asset number before archiving if restoration is needed.

## Authentication and authorization

Passwords require at least 12 characters, including lower-case letters, capital letters, numbers and special characters. Node `crypto.scrypt` derives salted password hashes. No plaintext password is stored.

Access and refresh JWTs use separate secrets, pinned HS256 verification, issuer/audience, expiration, session ID and a `sub` user ID. They are delivered in **HttpOnly cookies**, not localStorage or response JSON. The shared auth context exposes the public user object and renews sessions before the server-issued access expiry. Axios also retries protected API requests once after refresh.

`requireAuth` verifies the JWT **and the live PostgreSQL session**, then sets `req.auth.userId` and `req.auth.sessionId`. Controllers derive the owner from this middleware; caller-supplied user IDs cannot change ownership. Logout, password changes/reset and session revocation take effect immediately through the session table. Refresh tokens are rotated and stored as SHA-256 digests. A five-second overlap handles concurrent tabs; reuse outside that window revokes the session. Refresh expiration is absolute, not extended on every request.

Every mutation (including login, registration and reset) requires the exact configured `Origin` and an HMAC-signed random double-submit CSRF token. Axios obtains and supplies it automatically. PostgreSQL-backed rate limits work across server instances. This API intentionally uses browser-cookie authentication rather than accepting arbitrary bearer tokens.

Email verification and password recovery are active, backed by real SMTP. Verification/reset tokens are random, hashed in PostgreSQL, single-use and expiring. Reset revokes all existing sessions. `/account` lets users edit their name, change their password and sign out sessions/devices.

**This installation is one FCA team workspace.** Administrators manage all projects. An assessor with an active email/profession assignment can open active projects and sees only that profession's findings, elements and photos. Other professions' captures remain intact during a save. There is no separate organization or per-project membership model; use a separate deployment for independent organizations. Each assessor uses their own verified account and password. Admin-only platform uploads, deletion approvals and assignment management are enforced by Express, not just by hidden buttons.

## Environment reference

| Key | Value to supply |
| --- | --- |
| `NODE_ENV` | `development`, `test` or `production` |
| `PORT` | Express port, default `4000` |
| `CLIENT_ORIGIN` | Exact browser origin: `http://localhost:3000` locally, your HTTPS origin in production |
| `DATABASE_URL` | Neon pooled PostgreSQL URL |
| `DATABASE_DIRECT_URL` | Direct PostgreSQL URL; required for migrations |
| `DATABASE_SSL` | `true` for Neon and production |
| `DB_POOL_MAX` | Pool connection limit, default `10` |
| `JWT_ACCESS_SECRET` | Independently generated random secret, at least 48 characters |
| `JWT_REFRESH_SECRET` | Different independently generated random secret |
| `CSRF_SECRET` | Third independently generated random secret |
| `JWT_ISSUER` / `JWT_AUDIENCE` | Matching server identifiers; defaults in example |
| `ACCESS_TOKEN_MINUTES` | Access-token lifetime, default `15` |
| `REFRESH_TOKEN_DAYS` | Absolute session lifetime, default `30` |
| `COOKIE_SECURE` | `false` for local HTTP; **`true` for production HTTPS** |
| `COOKIE_SAME_SITE` | `lax` by default; the provided client uses a same-origin proxy |
| `TRUST_PROXY_HOPS` | `0` locally; exact trusted reverse-proxy hop count for your deployment |
| `BLOB_PROVIDER` | `vercel` or `azure` |
| `BLOB_READ_WRITE_TOKEN` | Token for a private Vercel Blob store; required only for `vercel` |
| `AZURE_STORAGE_CONNECTION_STRING` | Storage account connection string; required only for `azure` |
| `AZURE_STORAGE_CONTAINER` | Private Azure container name; used only for `azure` |
| `SMTP_HOST` / `SMTP_PORT` | Real SMTP server and port, typically STARTTLS on `587` |
| `SMTP_SECURE` | `true` for implicit TLS, typically port `465`; otherwise STARTTLS is required |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials/app password |
| `SMTP_FROM` | Sender authorized by your SMTP provider |
| `LOG_LEVEL` | `info` by default |
| `NEXT_PUBLIC_API_BASE_URL` | Keep **`/api`**; no server secret is public |
| `API_PROXY_TARGET` | Express origin reachable from the Next.js server; set before `next build` |

For local use both applications must use the same configured browser origin. The Next.js rewrite forwards `/api/*` to Express, including cookies and private image requests. Do not replace it with a public cross-site URL without redesigning the cookie and asset delivery configuration.

## API routes

All paths start with `/api`. All mutations require Origin + CSRF headers. “JWT” means the authenticated cookie and non-revoked server session are required.

| Method | Route | Auth / behavior |
| --- | --- | --- |
| GET | `/health` | Process liveness |
| GET | `/ready` | Database availability |
| GET | `/auth/csrf` | Issue/read signed CSRF token |
| POST | `/auth/register` | Create account, send verification email |
| POST | `/auth/login` | Verify password and email, set cookies |
| POST | `/auth/refresh` | Rotate refresh cookie and renew access cookie |
| POST | `/auth/verify-email` | Consume verification token |
| POST | `/auth/resend-verification` | Send a new verification link |
| POST | `/auth/forgot-password` | Send reset link where eligible |
| POST | `/auth/reset-password` | Change password using token, revoke sessions |
| GET / PATCH | `/auth/me` | JWT: current user / change name |
| PATCH | `/auth/password` | JWT + current password: change password |
| POST | `/auth/logout` | JWT: revoke current session |
| POST | `/auth/logout-all` | JWT: revoke all sessions |
| GET | `/auth/sessions` | JWT: list own active sessions |
| DELETE | `/auth/sessions/:sessionId` | JWT: revoke own session |
| GET / POST | `/projects` | JWT: list own projects / create |
| GET / PATCH / DELETE | `/projects/:id` | JWT + ownership: open / save version / archive |
| POST | `/projects/restore` | JWT: restore own archived project by asset number, and optional project name |
| GET | `/projects/:id/audit` | JWT + ownership: recent project audit |
| GET | `/projects/:id/boq.csv` | JWT + ownership: server-generated QS BOQ |
| POST | `/projects/:id/report/email` | JWT + ownership: multipart `email`, PDF `file`, real SMTP delivery |
| GET / POST / DELETE | `/projects/:id/site-plan` | JWT + ownership: stream / upload multipart `file` / remove |
| GET / POST / DELETE | `/projects/:id/facility-logo` | JWT + ownership: stream / upload / remove |
| GET / POST / DELETE | `/projects/:id/company-logo` | JWT + ownership: stream / upload / remove |
| GET / POST / DELETE | `/projects/:id/assessor-signature` | JWT + ownership: stream / upload / remove |
| POST | `/projects/:id/photos` | JWT + ownership: multipart `file`, `captureIndex`, `payload`, `version`; saves snapshot and photo atomically |
| GET / DELETE | `/projects/:id/photos/:photoId` | JWT + ownership: stream / remove photo |

The API rejects unknown routes rather than returning dummy success objects. Mutations are validated server-side. Attachment metadata fields are read-only and are rebuilt from database records. C1–C5 ratings can be saved as an incomplete draft; the UI/report distinguishes incomplete ratings from assessments totaling 100%.

## Production deployment

Configure real service credentials and your HTTPS origin. Set `NODE_ENV=production`, `COOKIE_SECURE=true`, `DATABASE_SSL=true`, and the exact `TRUST_PROXY_HOPS`. The server rejects an insecure production configuration. Keep Express behind the Next.js/reverse-proxy network; do not trust client-provided forwarding headers on an exposed API port.

Set `API_PROXY_TARGET` to the Express URL **before building the client** because Next.js compiles rewrites. For example, a private Docker network uses `http://server:4000` while the user's browser uses your HTTPS domain. All browser requests remain `/api`.

```sh
npm ci
npm run typecheck
npm test
npm run db:migrate
npm run build
```

Start two processes in separate terminals or through your process manager:

```sh
npm run start -w server
npm run start -w client
```

The supplied Dockerfiles build from the repository root. `compose.yaml` starts the two applications, using external Neon and blob storage. Configure HTTPS in your reverse proxy/platform and set `server/.env` accordingly before:

```sh
docker compose up --build -d
```

Run migrations before starting the production API. With the built server image, use `node server/dist/src/scripts/migrate.js` as your deployment migration command with the same environment. SQL assets are included in `server/dist/sql` by the build. Do not run migrations simultaneously through pooled runtime connections.

Database and blob backups are separate: back up PostgreSQL (including attachment metadata) and the private objects together. Keep service credentials and backups outside this repository. The application uses private streaming; no user-facing file is published publicly.

## Checks and limits of verification

```sh
npm run typecheck
npm test
npm run build
```

The included integration test performs actual HTTP calls against Express and a **real isolated PostgreSQL/Neon test database**. Configure a test `server/.env`, run its migration, and opt in:

PowerShell:

```powershell
$env:RUN_DATABASE_TESTS="true"
npm run test:integration -w server
```

macOS/Linux:

```sh
RUN_DATABASE_TESTS=true npm run test:integration -w server
```

It creates temporary test-owned users/projects and removes them afterward. **Never point integration tests at production.** Its records are test-only, not application seed data. It tests cookie login, CSRF rejection, ownership, stale versions, archive/restore, refresh rotation/reuse rejection, verification-token consumption, password reset/revocation and logout. Live email/file upload verification requires your real SMTP/blob service; no service is simulated by a mock route.

Build, unit-test, SQL/model-test and dependency-audit results from preparation are in `docs/VALIDATION.md`. A successful build does not prove your external service credentials, mail deliverability, proxy configuration or backup process; verify those after configuration before client use.

## Service documentation

- Neon PostgreSQL: https://neon.com/docs/get-started-with-neon/connect-neon
- Private Vercel Blob: https://vercel.com/docs/vercel-blob/private-storage
- Vercel Blob SDK: https://vercel.com/docs/vercel-blob/using-blob-sdk
- Azure Blob SDK: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-upload-javascript
- Node crypto: https://nodejs.org/api/crypto.html

### Administrator setup

After applying migrations, register and verify your account. Promote it from the trusted server terminal using `npm run admin:promote -w server -- your-admin-email@example.com`. Open `/admin/login` to log in as Admin. New registrations remain assessors. See [docs/ADMIN.md](docs/ADMIN.md) for upload permissions and deletion approvals.

### Assessor assignments

Administrators use **Assign professionals** to create or upload Name, Email, Profession CSV records. An active email assignment is required before an assessor can log in or use an existing authenticated session. Assessor reads and writes are limited to their profession's existing elements and findings; saves merge these changes without overwriting other professions. Administrators keep full access. Disable blocks new logins and revokes active sessions.

Run database migration `004_assessor_assignments.sql` through the migration command before upgrading an existing installation. Password setup is pending the client's confirmation: assignments do not create shared or default passwords. The PERN authentication system continues to require each registered user's verified email and password. Hosted ChatGPT access uses ChatGPT identity, with the same active email assignment gate; it does not store assessor passwords. Site audience permissions still control which external users can reach a private deployment.

## Official FCA update — 3 October 2026

This package matches the official blue/teal FCA interface, including matching Workspace/login controls, Back buttons for functional area setup, admin deletion approvals, profession assignments and the latest report cover. The cover has the uploaded company logo at the top left, the title below it, three photos aligned along the diagonal band with a larger centre photo, and project/client details at the bottom right. The layout is included in the PDF. No stored projects or user-uploaded files from the hosted app are exported.

An assessor assignment authorizes an email/profession; it does not set or reveal a password. The assessor registers and verifies their own password through the implemented authentication flow. Admins can enable or disable the assignment.

### SQL files

For a new Neon database, run `npm run db:migrate` or execute `server/sql/schema.sql` once. Both create the complete schema, including administrator roles, deletion requests, report addresses and assessor assignments. Do not run both bootstrap methods on the same new database. All application SELECT/INSERT/UPDATE/DELETE queries are in `server/models/` and `server/controllers/`; variable values use PostgreSQL parameters.
