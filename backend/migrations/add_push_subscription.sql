-- Add push_subscription column to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS push_subscription TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_push_enabled ON subscriptions(notifications_enabled) WHERE notifications_enabled = true;
