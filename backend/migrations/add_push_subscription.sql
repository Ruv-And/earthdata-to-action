ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS push_subscription TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_push_enabled ON subscriptions(notifications_enabled) WHERE notifications_enabled = true;
