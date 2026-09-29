CREATE TABLE IF NOT EXISTS cost_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
 category varchar(30) NOT NULL,
 provider varchar(80) NOT NULL,
 service varchar(180),
 operation varchar(80),
 input_units integer NOT NULL DEFAULT 0,
 output_units integer NOT NULL DEFAULT 0,
 total_units integer NOT NULL DEFAULT 0,
 unit_type varchar(40) NOT NULL DEFAULT 'tokens',
 cost_usd numeric(18,8) NOT NULL DEFAULT 0,
 request_id varchar(255),
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cost_events_business_created
ON cost_events(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_events_category_created
ON cost_events(category, created_at DESC);

CREATE TABLE IF NOT EXISTS cost_budgets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
 category varchar(30) NOT NULL DEFAULT 'ai',
 monthly_budget_usd numeric(12,2) NOT NULL DEFAULT 5,
 warning_percent integer NOT NULL DEFAULT 80,
 hard_limit boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT cost_budgets_business_category_uq UNIQUE (business_id, category)
);
