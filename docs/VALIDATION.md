# Validation record

Prepared on 30 September 2026 using Node.js v24.19.0. Source declares Node 22.13+; Node 22 is the supplied deployment image and NVM major version.

| Check | Result |
| --- | --- |
| Express TypeScript typecheck and compilation | Passed |
| Next.js TypeScript typecheck and production build | Passed |
| Six unit tests: password hashing, policy, token/digest behavior, empty-project validation, area integrity and required version | Passed |
| SQL migration and normalized models executed in a PostgreSQL WASM engine (PGlite), not SQLite | Passed |
| Model checks: numeric values, owner isolation, stale versions, area name/code swaps, retained photo IDs, file deletion outbox, archive/restore and audit | Passed |
| Actual Express HTTP test against the same PostgreSQL engine via a test-only SQL transport adapter | Passed |
| HTTP checks: JWT cookies, CSRF rejection, ownership, version conflicts, archive/restore, refresh rotation and reuse revocation, password reset/single-use and session revocation, email verification/single-use, login and logout | Passed |
| Production dependency audit (`npm audit --omit=dev`) | 0 known vulnerabilities at preparation time |

No application route, controller, JWT middleware or SQL result was replaced with a mock response in those checks. Temporary test records existed only in the isolated test engine. The shipped app and SQL have no seeded users or projects. PGlite and the test-only SQL adapter are not runtime dependencies or included in the source package.

The included integration suite can also execute against a real isolated PostgreSQL/Neon test database using `RUN_DATABASE_TESTS=true`. That external database run was not performed because no Neon credentials were supplied. Vercel/Azure storage, real SMTP email delivery, production reverse-proxy behavior, Docker images and recovery from external backups were not exercised with your accounts. Configure and verify those before client rollout.

The source export does not modify either existing hosted FCA site. It does not contain their stored projects or uploaded client files. Checklist definitions and the original welcome image are included; project data must be created/imported by the authorized user.

## Admin roles and home-style cover (2 October 2026)

Admin and assessor roles, database-backed authorization and approval SQL are included in migration 002. Verified checks include deferred assessor deletion, duplicate request deduplication, rejection of assessor approval attempts, immediate role changes under an existing JWT, admin approval, and rejection of repeat reviews. Checks ran against PostgreSQL in the isolated PGlite engine using actual Express routes, auth cookies and SQL; no production data was used. The cover uses the supplied welcome photo, larger logo slots and embedded licensed fonts.

See ADMIN.md for promoting your verified account in your own PostgreSQL deployment. The live preview uses Sites' authenticated ChatGPT identity and its own platform storage; the PERN code continues to use Neon PostgreSQL, JWT cookies and your selected blob service.

## Revalidated 3 October 2026

- Express and Next.js TypeScript checks passed; six unit tests passed.
- Express compilation and the Next.js production build passed using Next.js 16.3.8.
- Both shipped HTTP integration suites passed against an isolated PGlite PostgreSQL engine, using real SQL and Express routes through a test-only transport adapter. The adapter and test database are outside the deliverable.
- Verified login/JWT cookies, CSRF rejection, rotating refresh sessions, session revocation, verified-email/reset tokens, version conflicts, archive/restore, admin-only uploads, deletion-request deduplication/review, profession-restricted reads/writes and disabling access.
- Additional checks passed for cross-profession photo access/removal rejection, cross-profession finding-removal requests, retained photos before approval, transactional photo removal/outbox after approval, stale-save rejection after photo approval and blocked refresh for disabled assessors.
- The full SQL snapshot created an empty database successfully; its four migration checksums match the migration files. Users, projects, captures, attachments and assignments had no seeded rows.
- `npm audit --omit=dev` reported zero known production-dependency vulnerabilities at validation time.
- The current official app's CSS, cover photo positions, larger middle photo, top-left uploaded company logo, lower title and matching Workspace control sizes are included. Standalone auth screens retain their own styles.

No live Neon connection, real Vercel/Azure object transfer, SMTP delivery or Docker deployment was tested with your credentials. These remain deployment verification steps.
