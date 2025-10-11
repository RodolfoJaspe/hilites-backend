-- Migration: Create matches table
-- Description: Stores match data from external APIs
-- Date: 2024-01-01

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL,
    home_team_id UUID REFERENCES teams(id),
    away_team_id UUID REFERENCES teams(id),
    competition_id TEXT,
    competition_name TEXT NOT NULL,
    match_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
    home_score INTEGER CHECK (home_score >= 0),
    away_score INTEGER CHECK (away_score >= 0),
    venue TEXT,
    referee TEXT,
    weather_conditions TEXT,
    attendance INTEGER CHECK (attendance >= 0),
    match_week INTEGER CHECK (match_week > 0),
    season TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_external_id ON matches(external_id);
CREATE INDEX IF NOT EXISTS idx_matches_home_team_id ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team_id ON matches(away_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_competition_id ON matches(competition_id);
CREATE INDEX IF NOT EXISTS idx_matches_match_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_matches_competition_date ON matches(competition_id, match_date);
CREATE INDEX IF NOT EXISTS idx_matches_teams_date ON matches(home_team_id, away_team_id, match_date);

-- Add comments for documentation
COMMENT ON TABLE matches IS 'Stores match data from external football APIs';
COMMENT ON COLUMN matches.external_id IS 'External API identifier for the match';
COMMENT ON COLUMN matches.status IS 'Current status of the match';
COMMENT ON COLUMN matches.match_week IS 'Week number in the competition';
COMMENT ON COLUMN matches.season IS 'Season identifier (e.g., 2023-24)';




