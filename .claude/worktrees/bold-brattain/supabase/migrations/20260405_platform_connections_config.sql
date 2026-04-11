-- Add config JSONB column to platform_connections for storing platform-specific metadata
-- (e.g., LinkedIn ad_account_id, org_id)
ALTER TABLE platform_connections ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}';

-- Add LinkedIn Ads IDs to ad_campaigns for caching LinkedIn entity references
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS linkedin_group_id text;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS linkedin_campaign_id text;
