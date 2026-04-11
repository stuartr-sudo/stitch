-- Add API key columns for Anthropic (Claude) and Google AI (Gemini) LLM providers
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS anthropic_key text;
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS google_ai_key text;
