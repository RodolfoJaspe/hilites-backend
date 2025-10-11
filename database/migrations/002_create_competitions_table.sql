-- Migration: Create competitions table
-- Description: Stores competition/league information
-- Date: 2024-01-01

-- Create competitions table
CREATE TABLE IF NOT EXISTS competitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('league', 'cup', 'international', 'friendly')),
    country TEXT,
    country_code TEXT,
    logo_url TEXT,
    website_url TEXT,
    is_active BOOLEAN DEFAULT true,
    current_season TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitions_type ON competitions(type);
CREATE INDEX IF NOT EXISTS idx_competitions_country ON competitions(country);
CREATE INDEX IF NOT EXISTS idx_competitions_is_active ON competitions(is_active);
CREATE INDEX IF NOT EXISTS idx_competitions_current_season ON competitions(current_season);

-- Add comments for documentation
COMMENT ON TABLE competitions IS 'Stores football competition and league information';
COMMENT ON COLUMN competitions.type IS 'Type of competition: league, cup, international, friendly';
COMMENT ON COLUMN competitions.current_season IS 'Current active season identifier';




