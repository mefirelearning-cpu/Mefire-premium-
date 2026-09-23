CREATE UNIQUE INDEX IF NOT EXISTS messages_provider_message_id_uq ON messages(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_customer_status ON conversations(customer_id,status);
