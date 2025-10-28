-- Migration: Fix more schema issues
-- Description: Add competition_name to matches and make league nullable in teams
-- Date: 2025-10-27

-- Add competition_name column to matches table if it doesn't exist
ALTER TABLE matches 
  ADD COLUMN IF NOT EXISTS competition_name TEXT;

-- Add league column to teams table if it doesn't exist
ALTER TABLE teams 
  ADD COLUMN IF NOT EXISTS league TEXT;

-- Update existing matches with competition name from competition field
UPDATE matches 
SET competition_name = competition 
WHERE competition_name IS NULL AND competition IS NOT NULL;

-- Add index for competition_name for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_competition_name ON matches(competition_name);
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league);
