-- Add last_updated column to matches table
-- This tracks when a match was last updated in our system

ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Create an index on last_updated for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_last_updated ON matches(last_updated);

-- Add a comment to document the column
COMMENT ON COLUMN matches.last_updated IS 'Timestamp when the match record was last updated in our system';
