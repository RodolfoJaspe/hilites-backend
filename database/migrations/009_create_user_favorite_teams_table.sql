-- Migration: Create user_favorite_teams table
-- Description: Stores user's favorite soccer teams for personalized match feeds
-- Date: 2024-01-10

-- Create user_favorite_teams table
CREATE TABLE IF NOT EXISTS user_favorite_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_favorite_teams_user_id ON user_favorite_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_teams_team_id ON user_favorite_teams(team_id);

-- Create unique constraint to prevent duplicate favorites
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_team ON user_favorite_teams(user_id, team_id);

-- Enable RLS on user_favorite_teams
ALTER TABLE user_favorite_teams ENABLE ROW LEVEL SECURITY;

-- Create policies for user_favorite_teams
-- Users can read their own favorite teams
CREATE POLICY "Users can read own favorite teams"
    ON user_favorite_teams
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own favorite teams
CREATE POLICY "Users can insert own favorite teams"
    ON user_favorite_teams
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorite teams
CREATE POLICY "Users can delete own favorite teams"
    ON user_favorite_teams
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE user_favorite_teams IS 'Stores user favorite teams for personalized match feeds';
COMMENT ON COLUMN user_favorite_teams.user_id IS 'Reference to the user who favorited the team';
COMMENT ON COLUMN user_favorite_teams.team_id IS 'Reference to the favorited team';


