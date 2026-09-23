CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS businesses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(160) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS customers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, first_name varchar(100), last_name varchar(100), phone varchar(40) NOT NULL, whatsapp_id varchar(100), email varchar(255), status varchar(30) NOT NULL DEFAULT 'lead', preferred_language varchar(10) NOT NULL DEFAULT 'fr', total_spent numeric(14,2) NOT NULL DEFAULT 0, last_contact_at timestamptz, next_action_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS customers_business_phone_uq ON customers(business_id,phone);
CREATE INDEX IF NOT EXISTS customers_status_idx ON customers(business_id,status);

CREATE TABLE IF NOT EXISTS services (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, name varchar(160) NOT NULL, description text, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS service_plans (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE, name varchar(120) NOT NULL, price numeric(14,2) NOT NULL, currency varchar(10) NOT NULL DEFAULT 'XAF', duration_days integer, lifetime boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK ((lifetime=true AND duration_days IS NULL) OR lifetime=false));

CREATE TABLE IF NOT EXISTS orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES businesses(id), customer_id uuid NOT NULL REFERENCES customers(id), status varchar(30) NOT NULL DEFAULT 'new', total numeric(14,2) NOT NULL DEFAULT 0, currency varchar(10) NOT NULL DEFAULT 'XAF', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(business_id,status);

CREATE TABLE IF NOT EXISTS subscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES customers(id), service_plan_id uuid NOT NULL REFERENCES service_plans(id), order_id uuid REFERENCES orders(id), status varchar(30) NOT NULL DEFAULT 'pending', started_at timestamptz, expires_at timestamptz, lifetime boolean NOT NULL DEFAULT false, auto_renew boolean NOT NULL DEFAULT false, renewal_count integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS subscriptions_expiry_idx ON subscriptions(status,expires_at) WHERE lifetime=false;
CREATE INDEX IF NOT EXISTS subscriptions_customer_idx ON subscriptions(customer_id,status);

CREATE TABLE IF NOT EXISTS payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES customers(id), order_id uuid REFERENCES orders(id), amount numeric(14,2) NOT NULL, currency varchar(10) NOT NULL DEFAULT 'XAF', method varchar(50), status varchar(30) NOT NULL DEFAULT 'pending', reference varchar(160), paid_at timestamptz, verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status,created_at DESC);

CREATE TABLE IF NOT EXISTS conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES customers(id), channel varchar(30) NOT NULL DEFAULT 'whatsapp', status varchar(30) NOT NULL DEFAULT 'open', ai_enabled boolean NOT NULL DEFAULT true, human_takeover boolean NOT NULL DEFAULT false, last_message_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, direction varchar(10) NOT NULL, sender_type varchar(20) NOT NULL, content text NOT NULL, provider_message_id varchar(255), delivery_status varchar(30), ai_generated boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS messages_provider_uq ON messages(provider_message_id) WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS automation_rules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES businesses(id), name varchar(160) NOT NULL, enabled boolean NOT NULL DEFAULT true, trigger_type varchar(80) NOT NULL, trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb, conditions jsonb NOT NULL DEFAULT '{}'::jsonb, actions jsonb NOT NULL DEFAULT '[]'::jsonb, priority integer NOT NULL DEFAULT 100, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES businesses(id), actor_type varchar(30) NOT NULL, action varchar(100) NOT NULL, entity_type varchar(60), entity_id uuid, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());

INSERT INTO businesses(name) SELECT 'Mefire Premium' WHERE NOT EXISTS (SELECT 1 FROM businesses);
