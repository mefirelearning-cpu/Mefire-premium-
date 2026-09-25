CREATE TABLE IF NOT EXISTS commercial_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  kind varchar(30) NOT NULL,
  title varchar(180),
  content text NOT NULL,
  language varchar(10) NOT NULL DEFAULT 'fr',
  source_type varchar(30) NOT NULL DEFAULT 'manual',
  source_ref varchar(255),
  active boolean NOT NULL DEFAULT true,
  weight integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commercial_memory_business_kind
  ON commercial_memory(business_id, kind, active);

CREATE INDEX IF NOT EXISTS idx_commercial_memory_customer
  ON commercial_memory(customer_id, active)
  WHERE customer_id IS NOT NULL;
