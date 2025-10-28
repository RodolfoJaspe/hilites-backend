-- Migration: Update database schema to match application requirements
-- Description: Adds missing columns and fixes schema issues
-- Date: 2025-10-27

-- Add missing columns to teams table
ALTER TABLE teams 
  ADD COLUMN IF NOT EXISTS crest_url TEXT,
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS tla TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS founded INTEGER,
  ADD COLUMN IF NOT EXISTS venue TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update matches table to match expected schema
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS external_competition_id TEXT,
  ADD COLUMN IF NOT EXISTS home_team_name TEXT,
  ADD COLUMN IF NOT EXISTS away_team_name TEXT,
  ADD COLUMN IF NOT EXISTS venue TEXT,
  ADD COLUMN IF NOT EXISTS referee TEXT,
  ADD COLUMN IF NOT EXISTS is_highlight_processed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();

-- Update competition column to be nullable if it exists
ALTER TABLE matches ALTER COLUMN competition DROP NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN teams.crest_url IS 'URL to the team''s crest/logo';
COMMENT ON COLUMN teams.short_name IS 'Short name or abbreviation of the team';
COMMENT ON COLUMN teams.tla IS 'Three-letter abbreviation of the team name';
COMMENT ON COLUMN matches.external_competition_id IS 'External API identifier for the competition';
COMMENT ON COLUMN matches.is_highlight_processed IS 'Flag indicating if highlights have been processed for this match';

-- Create or update indexes
CREATE INDEX IF NOT EXISTS idx_teams_crest_url ON teams(crest_url);
CREATE INDEX IF NOT EXISTS idx_matches_external_competition ON matches(external_competition_id);
CREATE INDEX IF NOT EXISTS idx_matches_is_highlight_processed ON matches(is_highlight_processed);
