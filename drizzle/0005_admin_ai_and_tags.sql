CREATE TABLE IF NOT EXISTS tag_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  color varchar(30),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tag_definitions_business_name_uq
ON tag_definitions(business_id, lower(name));

CREATE TABLE IF NOT EXISTS customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tag_definitions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_tags_customer_tag_uq
ON customer_tags(customer_id, tag_id);
CREATE INDEX IF NOT EXISTS customer_tags_tag_idx
ON customer_tags(tag_id);

CREATE TABLE IF NOT EXISTS ai_admin_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  reformulation text,
  plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  status varchar(30) NOT NULL DEFAULT 'draft',
  requires_confirmation boolean NOT NULL DEFAULT true,
  confirmed_at timestamptz,
  executed_at timestamptz,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_admin_commands_business_created_idx
ON ai_admin_commands(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_admin_commands_status_idx
ON ai_admin_commands(business_id, status);
