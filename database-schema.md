# Hilites Database Schema

This document outlines the database schema for the Hilites app backend. The schema is designed to work with Supabase (PostgreSQL).

## Tables

### 1. user_favorite_teams

Stores user's favorite soccer teams.

| Column     | Type      | Constraints                             | Description                         |
| ---------- | --------- | --------------------------------------- | ----------------------------------- |
| id         | UUID      | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier                   |
| user_id    | UUID      | NOT NULL, REFERENCES auth.users(id)     | User who favorited the team         |
| team_id    | TEXT      | NOT NULL                                | External team identifier (from API) |
| team_name  | TEXT      | NOT NULL                                | Name of the team                    |
| team_logo  | TEXT      | NULL                                    | URL to team logo image              |
| created_at | TIMESTAMP | DEFAULT NOW()                           | When the team was favorited         |

**Indexes:**

- `idx_user_favorite_teams_user_id` on `user_id`
- `idx_user_favorite_teams_team_id` on `team_id`
- `unique_user_team` on `(user_id, team_id)` - prevents duplicate favorites

### 2. user_favorite_players

Stores user's favorite soccer players.

| Column       | Type      | Constraints                             | Description                           |
| ------------ | --------- | --------------------------------------- | ------------------------------------- |
| id           | UUID      | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier                     |
| user_id      | UUID      | NOT NULL, REFERENCES auth.users(id)     | User who favorited the player         |
| player_id    | TEXT      | NOT NULL                                | External player identifier (from API) |
| player_name  | TEXT      | NOT NULL                                | Name of the player                    |
| player_image | TEXT      | NULL                                    | URL to player image                   |
| team_name    | TEXT      | NULL                                    | Current team of the player            |
| created_at   | TIMESTAMP | DEFAULT NOW()                           | When the player was favorited         |

**Indexes:**

- `idx_user_favorite_players_user_id` on `user_id`
- `idx_user_favorite_players_player_id` on `player_id`
- `unique_user_player` on `(user_id, player_id)` - prevents duplicate favorites

## SQL Commands to Create Tables

Run these commands in your Supabase SQL editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_favorite_teams table
CREATE TABLE user_favorite_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL,
    team_name TEXT NOT NULL,
    team_logo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_favorite_players table
CREATE TABLE user_favorite_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    player_image TEXT,
    team_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_favorite_teams_user_id ON user_favorite_teams(user_id);
CREATE INDEX idx_user_favorite_teams_team_id ON user_favorite_teams(team_id);
CREATE UNIQUE INDEX unique_user_team ON user_favorite_teams(user_id, team_id);

CREATE INDEX idx_user_favorite_players_user_id ON user_favorite_players(user_id);
CREATE INDEX idx_user_favorite_players_player_id ON user_favorite_players(player_id);
CREATE UNIQUE INDEX unique_user_player ON user_favorite_players(user_id, player_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_favorite_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_players ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own favorite teams
CREATE POLICY "Users can view their own favorite teams" ON user_favorite_teams
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorite teams" ON user_favorite_teams
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorite teams" ON user_favorite_teams
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite teams" ON user_favorite_teams
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only access their own favorite players
CREATE POLICY "Users can view their own favorite players" ON user_favorite_players
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorite players" ON user_favorite_players
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorite players" ON user_favorite_players
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite players" ON user_favorite_players
    FOR DELETE USING (auth.uid() = user_id);
```

## Future Schema Additions

For the social features that will be added later, consider these additional tables:

### 3. user_follows (Future)

For user-to-user following functionality.

### 4. highlight_comments (Future)

For comments on highlight videos.

### 5. user_notifications (Future)

For managing user notifications.

### 6. highlight_videos (Future)

For storing highlight video metadata.

## Notes

- All tables use UUID primary keys for better security and scalability
- Row Level Security (RLS) is enabled to ensure users can only access their own data
- Foreign key constraints ensure data integrity
- Indexes are created for optimal query performance
- The schema is designed to be extensible for future social features
