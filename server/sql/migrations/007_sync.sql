ALTER TABLE projects ADD COLUMN seq bigint NOT NULL DEFAULT 0;
ALTER TABLE captures ADD COLUMN seq bigint NOT NULL DEFAULT 0;
CREATE INDEX captures_project_seq ON captures(project_id, seq);
CREATE TABLE change_tombstones (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 seq bigint NOT NULL, capture_id uuid NOT NULL
);
CREATE INDEX change_tombstones_project_seq ON change_tombstones(project_id, seq);