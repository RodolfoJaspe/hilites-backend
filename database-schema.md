# Hilites Database Schema

This document outlines the database schema for the Hilites app backend. The schema is designed to work with Supabase (PostgreSQL).

## Tables

### 1. teams

Master table for all soccer teams with comprehensive information.

| Column                    | Type      | Constraints                             | Description                      |
| ------------------------- | --------- | --------------------------------------- | -------------------------------- |
| id                        | UUID      | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier                |
| external_id               | TEXT      | UNIQUE, NOT NULL                        | External API identifier          |
| name                      | TEXT      | NOT NULL                                | Full team name                   |
| short_name                | TEXT      | NULL                                    | Short team name                  |
| code                      | TEXT      | NULL                                    | Team code/abbreviation           |
| country                   | TEXT      | NOT NULL                                | Country name                     |
| country_code              | TEXT      | NULL                                    | ISO country code                 |
| league                    | TEXT      | NOT NULL                                | League name                      |
| league_id                 | TEXT      | NULL                                    | External league identifier       |
| continental_confederation | TEXT      | NULL                                    | Continental confederation        |
| founded_year              | INTEGER   | NULL                                    | Year team was founded            |
| venue_name                | TEXT      | NULL                                    | Stadium name                     |
| venue_city                | TEXT      | NULL                                    | Stadium city                     |
| venue_capacity            | INTEGER   | NULL                                    | Stadium capacity                 |
| logo_url                  | TEXT      | NULL                                    | Team logo URL                    |
| website_url               | TEXT      | NULL                                    | Official website URL             |
| is_active                 | BOOLEAN   | DEFAULT true                            | Whether team is currently active |
| created_at                | TIMESTAMP | DEFAULT NOW()                           | When record was created          |
| updated_at                | TIMESTAMP | DEFAULT NOW()                           | When record was last updated     |

**Indexes:**

- `idx_teams_external_id` on `external_id`
- `idx_teams_country` on `country`
- `idx_teams_league` on `league`
- `idx_teams_continental_confederation` on `continental_confederation`
- `idx_teams_is_active` on `is_active`

### 2. user_favorite_teams

Stores user's favorite soccer teams (references the teams table).

| Column     | Type      | Constraints                             | Description                      |
| ---------- | --------- | --------------------------------------- | -------------------------------- |
| id         | UUID      | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier                |
| user_id    | UUID      | NOT NULL, REFERENCES auth.users(id)     | User who favorited the team      |
| team_id    | UUID      | NOT NULL, REFERENCES teams(id)          | Reference to team in teams table |
| created_at | TIMESTAMP | DEFAULT NOW()                           | When the team was favorited      |

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

-- Create teams table (master reference)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT,
    code TEXT,
    country TEXT NOT NULL,
    country_code TEXT,
    league TEXT NOT NULL,
    league_id TEXT,
    continental_confederation TEXT,
    founded_year INTEGER,
    venue_name TEXT,
    venue_city TEXT,
    venue_capacity INTEGER,
    logo_url TEXT,
    website_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_favorite_teams table (updated to reference teams table)
CREATE TABLE user_favorite_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
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
CREATE INDEX idx_teams_external_id ON teams(external_id);
CREATE INDEX idx_teams_country ON teams(country);
CREATE INDEX idx_teams_league ON teams(league);
CREATE INDEX idx_teams_continental_confederation ON teams(continental_confederation);
CREATE INDEX idx_teams_is_active ON teams(is_active);

CREATE INDEX idx_user_favorite_teams_user_id ON user_favorite_teams(user_id);
CREATE INDEX idx_user_favorite_teams_team_id ON user_favorite_teams(team_id);
CREATE UNIQUE INDEX unique_user_team ON user_favorite_teams(user_id, team_id);

CREATE INDEX idx_user_favorite_players_user_id ON user_favorite_players(user_id);
CREATE INDEX idx_user_favorite_players_player_id ON user_favorite_players(player_id);
CREATE UNIQUE INDEX unique_user_player ON user_favorite_players(user_id, player_id);

-- Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_players ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Teams table - public read access, admin-only write access
CREATE POLICY "Anyone can view teams" ON teams
    FOR SELECT USING (true);

CREATE POLICY "Only admins can insert teams" ON teams
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update teams" ON teams
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete teams" ON teams
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

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
