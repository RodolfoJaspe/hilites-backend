-- Migration: Fix schema issues
-- Description: Add matchday column to matches and make country nullable in teams
-- Date: 2025-10-27

-- Add matchday column to matches table if it doesn't exist
ALTER TABLE matches 
  ADD COLUMN IF NOT EXISTS matchday INTEGER;

-- Make country column nullable in teams table
ALTER TABLE teams 
  ALTER COLUMN country DROP NOT NULL;

-- Add index for matchday for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_matchday ON matches(matchday);
