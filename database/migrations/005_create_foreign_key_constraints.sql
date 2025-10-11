-- Migration: Add foreign key constraints
-- Description: Add foreign key relationships between tables
-- Date: 2024-01-01

-- Add foreign key constraint for matches.competition_id -> competitions.id
-- Note: This is a text reference, so we'll add it as a check constraint instead
ALTER TABLE matches 
ADD CONSTRAINT fk_matches_competition_id 
CHECK (competition_id IS NULL OR competition_id IN (SELECT id FROM competitions));

-- Add foreign key constraint for matches.home_team_id -> teams.id (if not already exists)
-- This should already exist from the table creation, but let's ensure it's there
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'matches_home_team_id_fkey'
    ) THEN
        ALTER TABLE matches 
        ADD CONSTRAINT matches_home_team_id_fkey 
        FOREIGN KEY (home_team_id) REFERENCES teams(id);
    END IF;
END $$;

-- Add foreign key constraint for matches.away_team_id -> teams.id (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'matches_away_team_id_fkey'
    ) THEN
        ALTER TABLE matches 
        ADD CONSTRAINT matches_away_team_id_fkey 
        FOREIGN KEY (away_team_id) REFERENCES teams(id);
    END IF;
END $$;

-- Add foreign key constraint for match_highlights.match_id -> matches.id (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'match_highlights_match_id_fkey'
    ) THEN
        ALTER TABLE match_highlights 
        ADD CONSTRAINT match_highlights_match_id_fkey 
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for ai_processing_logs.match_id -> matches.id (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_processing_logs_match_id_fkey'
    ) THEN
        ALTER TABLE ai_processing_logs 
        ADD CONSTRAINT ai_processing_logs_match_id_fkey 
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
    END IF;
END $$;




