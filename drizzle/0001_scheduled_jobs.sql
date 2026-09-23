CREATE TABLE IF NOT EXISTS scheduled_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
 subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
 job_type varchar(60) NOT NULL,
 run_at timestamptz NOT NULL,
 status varchar(30) NOT NULL DEFAULT 'pending',
 idempotency_key varchar(255) NOT NULL UNIQUE,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 attempts integer NOT NULL DEFAULT 0,
 last_error text,
 processed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_due ON scheduled_jobs(status,run_at);
