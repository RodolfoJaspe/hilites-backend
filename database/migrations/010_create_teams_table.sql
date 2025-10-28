-- Migration: Create teams table
-- Description: Stores team data from external APIs
-- Date: 2025-10-27

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT,
    tla TEXT,
    crest_url TEXT,
    website TEXT,
    founded INTEGER,
    club_colors TEXT,
    venue TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_external_id ON teams(external_id);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);

-- Add comments for documentation
COMMENT ON TABLE teams IS 'Stores team data from external football APIs';
COMMENT ON COLUMN teams.external_id IS 'External API identifier for the team';
COMMENT ON COLUMN teams.tla IS 'Three-letter abbreviation of the team name';
COMMENT ON COLUMN teams.crest_url IS 'URL to the team''s crest/logo';

-- Update matches table to reference teams table
ALTER TABLE matches 
    DROP COLUMN IF EXISTS home_team,
    DROP COLUMN IF EXISTS away_team,
    ADD COLUMN IF NOT EXISTS home_team_id UUID REFERENCES teams(id),
    ADD COLUMN IF NOT EXISTS away_team_id UUID REFERENCES teams(id),
    ADD COLUMN IF NOT EXISTS external_competition_id TEXT;

-- Add index for the foreign keys
CREATE INDEX IF NOT EXISTS idx_matches_home_team_id ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team_id ON matches(away_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_external_competition_id ON matches(external_competition_id);
