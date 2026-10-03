-- Complete bootstrap snapshot for an EMPTY PostgreSQL database.
-- Prefer npm run db:migrate; do not run both initial setup methods twice.
BEGIN;
CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE users (
 id uuid PRIMARY KEY, name varchar(160) NOT NULL,
 email varchar(254) NOT NULL, password_hash text NOT NULL,
 email_verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT users_email_lower CHECK (email=lower(email))
);
CREATE UNIQUE INDEX users_email_unique ON users(lower(email));
CREATE TABLE auth_sessions (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 refresh_hash char(64) NOT NULL, previous_refresh_hash char(64), rotated_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, revoked_at timestamptz,
 user_agent varchar(500) NOT NULL DEFAULT '', ip_hash char(64) NOT NULL
);
CREATE INDEX auth_sessions_user ON auth_sessions(user_id);
CREATE TABLE auth_tokens (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose varchar(20) NOT NULL CHECK(purpose IN ('verify','reset')),
 token_hash char(64) UNIQUE NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_tokens_user ON auth_tokens(user_id,purpose);
CREATE TABLE projects (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 name varchar(160) NOT NULL, asset_number varchar(100) NOT NULL DEFAULT '', client varchar(160) NOT NULL DEFAULT '',
 discipline varchar(160) NOT NULL, assessor_name varchar(160) NOT NULL DEFAULT '',
 assessor_role varchar(160) NOT NULL DEFAULT '', assessor_registration varchar(160) NOT NULL DEFAULT '',
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE INDEX projects_owner_active ON projects(owner_id,updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX projects_owner_asset ON projects(owner_id,asset_number);
CREATE TABLE functional_areas (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 code varchar(100) NOT NULL, unit varchar(160) NOT NULL DEFAULT '', area_type varchar(160) NOT NULL DEFAULT '',
 name varchar(240) NOT NULL, sqm numeric(20,4) CHECK(sqm>=0 AND sqm<=1e12), position integer NOT NULL CHECK(position>=0),
 UNIQUE(project_id,name) DEFERRABLE INITIALLY IMMEDIATE, UNIQUE(project_id,code) DEFERRABLE INITIALLY IMMEDIATE, UNIQUE(id,project_id)
);
CREATE TABLE elements (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 area_id uuid NOT NULL, name varchar(160) NOT NULL,
 FOREIGN KEY(area_id,project_id) REFERENCES functional_areas(id,project_id) ON DELETE CASCADE,
 UNIQUE(area_id,name), UNIQUE(id,project_id)
);
CREATE TABLE captures (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 element_id uuid NOT NULL, section varchar(160) NOT NULL DEFAULT '', component varchar(300) NOT NULL,
 component_type varchar(160) NOT NULL DEFAULT '', present varchar(16) NOT NULL DEFAULT '' CHECK(present IN ('','Yes','No','Required')),
 extent numeric(20,4) CHECK(extent>=0 AND extent<=1e12),extent_unit varchar(8) NOT NULL DEFAULT '' CHECK(extent_unit IN ('','m','No.','LM','m²')),
 remedial_quantity numeric(20,4) CHECK(remedial_quantity>=0 AND remedial_quantity<=1e12),
 unit_rate numeric(20,2) CHECK(unit_rate>=0 AND unit_rate<=1e12),remedial_cost numeric(20,2) CHECK(remedial_cost>=0 AND remedial_cost<=1e12),
 priority varchar(2) NOT NULL DEFAULT '' CHECK(priority IN ('','P1','P2','P3','P4')),
 measured_scope text NOT NULL DEFAULT '',work_type varchar(30) NOT NULL DEFAULT '',maintenance_work varchar(40) NOT NULL DEFAULT '',
 ratings double precision[] NOT NULL DEFAULT '{0,0,0,0,0}' CHECK(cardinality(ratings)=5 AND array_ndims(ratings)=1 AND array_position(ratings,NULL) IS NULL AND 0<=ALL(ratings) AND 100>=ALL(ratings)),
 comment text NOT NULL DEFAULT '',discipline varchar(160) NOT NULL DEFAULT '', position integer NOT NULL CHECK(position>=0),
 FOREIGN KEY(element_id,project_id) REFERENCES elements(id,project_id) ON DELETE CASCADE,UNIQUE(id,project_id)
);
CREATE INDEX captures_project_order ON captures(project_id,position);
CREATE TABLE project_pricing (
 project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
 pg double precision NOT NULL DEFAULT 0 CHECK(pg BETWEEN 0 AND 100),
 fees double precision NOT NULL DEFAULT 0 CHECK(fees BETWEEN 0 AND 100),
 contingency double precision NOT NULL DEFAULT 0 CHECK(contingency BETWEEN 0 AND 100),
 vat double precision NOT NULL DEFAULT 0 CHECK(vat BETWEEN 0 AND 100)
);
CREATE TABLE attachments (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 capture_id uuid, kind varchar(24) NOT NULL CHECK(kind IN ('site-plan','facility-logo','company-logo','assessor-signature','photo')),
 blob_key text UNIQUE NOT NULL, original_name varchar(255) NOT NULL, content_type varchar(100) NOT NULL,
 size_bytes integer NOT NULL CHECK(size_bytes>0),sha256 char(64) NOT NULL,
 created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(capture_id,project_id) REFERENCES captures(id,project_id) ON DELETE CASCADE,
 CHECK((kind='photo' AND capture_id IS NOT NULL) OR (kind<>'photo' AND capture_id IS NULL))
);
CREATE UNIQUE INDEX attachments_single_asset ON attachments(project_id,kind) WHERE kind<>'photo';
CREATE INDEX attachments_capture ON attachments(capture_id);
CREATE TABLE audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid NOT NULL REFERENCES users(id),
 project_id uuid REFERENCES projects(id), action varchar(64) NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_project ON audit_events(project_id,occurred_at DESC);
CREATE TABLE blob_deletions (blob_key text PRIMARY KEY,attempts integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE rate_limits (key char(64) PRIMARY KEY,window_start timestamptz NOT NULL,hits integer NOT NULL CHECK(hits>=0));
-- No project, user, component finding, rating, price or credential is seeded.

INSERT INTO schema_migrations(id,checksum) VALUES('001_initial.sql','e7621f9151081d984759743a254df63716833004f471a9ac04d750b1a80f69ea');
ALTER TABLE users ADD COLUMN role varchar(16) NOT NULL DEFAULT 'assessor' CHECK(role IN ('admin','assessor'));
CREATE TABLE deletion_requests (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects(id),
 requested_by uuid NOT NULL REFERENCES users(id), target_kind varchar(20) NOT NULL CHECK(target_kind IN ('project','attachment','capture','area','element')),
 target_id uuid NOT NULL, target_name text NOT NULL, reason varchar(1000) NOT NULL DEFAULT '',
 status varchar(16) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 requested_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, reviewed_by uuid REFERENCES users(id), review_note varchar(1000) NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX deletion_requests_pending_target ON deletion_requests(project_id,target_kind,target_id) WHERE status='pending';
CREATE INDEX deletion_requests_queue ON deletion_requests(status,requested_at);

INSERT INTO schema_migrations(id,checksum) VALUES('002_admin_approvals.sql','772d21c94e5bca7c403270f5107347b955020eb9ac9b98fa232de5805e800640');
ALTER TABLE projects ADD COLUMN company_name varchar(160) NOT NULL DEFAULT '', ADD COLUMN company_address varchar(500) NOT NULL DEFAULT '', ADD COLUMN client_address varchar(500) NOT NULL DEFAULT '';
INSERT INTO schema_migrations(id,checksum) VALUES('003_report_addresses.sql','42d248ef924b3ae8b15a659e3d625bb50cf1c94857c4e2ac4dd3b308707226ff');
CREATE TABLE assessor_assignments(email varchar(254) PRIMARY KEY CHECK(email=lower(email)),name varchar(160) NOT NULL,profession varchar(60) NOT NULL CHECK(profession IN ('Architect','Plumber','Electrician','Structural Engineer','Fire Engineer','Mechanical Engineer','Civil Engineer')),active boolean NOT NULL DEFAULT true,updated_by uuid NOT NULL REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO schema_migrations(id,checksum) VALUES('004_assessor_assignments.sql','4efe69ed628861846532b732dc7e8147131b2068bd6210b0a1d17f4103a8ef5b');
COMMIT;
