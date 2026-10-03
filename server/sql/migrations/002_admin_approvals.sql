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
