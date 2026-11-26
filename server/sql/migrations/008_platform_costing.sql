-- One reusable library for the platform; findings retain their applied rate snapshot.
CREATE TABLE platform_rates (
 id text PRIMARY KEY,
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
 updated_by uuid NOT NULL REFERENCES users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE captures ADD COLUMN cost_template_id text;
ALTER TABLE captures ADD COLUMN cost_build_up jsonb CHECK (cost_build_up IS NULL OR jsonb_typeof(cost_build_up) = 'object');
-- No FK to platform_rates: built-in budget templates are code definitions, not seeded DB prices.
