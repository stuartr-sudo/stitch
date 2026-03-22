-- Shorts Overhaul Migration
-- Adds last_error jsonb column to jobs table for granular error tracking.
-- The last_error stores the most recent error details (step, message, timestamp)
-- separately from the top-level error string, enabling retry logic to inspect
-- which step failed and why.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_error jsonb;

COMMENT ON COLUMN jobs.last_error IS 'Most recent error details: { step, message, timestamp }. Used by retry/resume logic.';
