CREATE TABLE project_assignments (
 project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 assigned_by uuid NOT NULL REFERENCES users(id),
 assigned_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (project_id, user_id)
);
CREATE INDEX project_assignments_user ON project_assignments(user_id);
-- admins list every project, so they need an index that isn't owner-scoped
CREATE INDEX projects_active_updated ON projects(updated_at DESC) WHERE deleted_at IS NULL;