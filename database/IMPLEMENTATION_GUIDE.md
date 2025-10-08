# Hilites Database Implementation Guide

This document provides the complete implementation guide for the Hilites database setup, including actual tested commands and troubleshooting.

## ✅ **Implementation Status**

**COMPLETED**: All database migrations have been successfully implemented and tested.

### **Final Test Results**

- ✅ **4 new tables** created successfully
- ✅ **30 competitions** seeded
- ✅ **44 indexes** for performance optimization
- ✅ **3 utility functions** created
- ✅ **RLS policies** enabled and configured
- ✅ **Security** properly implemented

---

## 🚀 **Step-by-Step Implementation**

### **Phase 1: Backup Existing Data**

Before making any changes, backup your existing tables:

```sql
-- Check existing tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('teams', 'user_favorite_teams', 'user_favorite_players')
ORDER BY table_name;

-- Create backups (run for each existing table)
CREATE TABLE teams_backup AS SELECT * FROM teams;
CREATE TABLE user_favorite_teams_backup AS SELECT * FROM user_favorite_teams;
CREATE TABLE user_favorite_players_backup AS SELECT * FROM user_favorite_players;
```

### **Phase 2: Create Core Tables**

#### **Step 1: Matches Table**

```sql
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
```

#### **Step 2: Competitions Table**

```sql
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
```

#### **Step 3: Match Highlights Table**

```sql
CREATE TABLE IF NOT EXISTS match_highlights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    youtube_video_id TEXT NOT NULL,
    youtube_url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER CHECK (duration_seconds > 0),
    view_count BIGINT CHECK (view_count >= 0),
    like_count BIGINT CHECK (like_count >= 0),
    dislike_count BIGINT CHECK (dislike_count >= 0),
    channel_name TEXT,
    channel_id TEXT,
    channel_subscribers BIGINT CHECK (channel_subscribers >= 0),
    channel_verified BOOLEAN DEFAULT false,
    relevance_score DECIMAL(3,2) CHECK (relevance_score >= 0.00 AND relevance_score <= 1.00),
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0.00 AND quality_score <= 1.00),
    is_verified BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    last_checked TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Step 4: AI Processing Logs Table**

```sql
CREATE TABLE IF NOT EXISTS ai_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    processing_type TEXT NOT NULL CHECK (processing_type IN ('video_search', 'quality_check', 'relevance_scoring', 'validation')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retry')),
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    error_code TEXT,
    processing_time_ms INTEGER CHECK (processing_time_ms >= 0),
    retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
    max_retries INTEGER DEFAULT 3 CHECK (max_retries >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);
```

### **Phase 3: Performance Optimization**

#### **Create Indexes for Matches Table**

```sql
CREATE INDEX IF NOT EXISTS idx_matches_external_id ON matches(external_id);
CREATE INDEX IF NOT EXISTS idx_matches_home_team_id ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team_id ON matches(away_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_competition_id ON matches(competition_id);
CREATE INDEX IF NOT EXISTS idx_matches_match_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season);
CREATE INDEX IF NOT EXISTS idx_matches_competition_date ON matches(competition_id, match_date);
CREATE INDEX IF NOT EXISTS idx_matches_teams_date ON matches(home_team_id, away_team_id, match_date);
```

#### **Create Indexes for Competitions Table**

```sql
CREATE INDEX IF NOT EXISTS idx_competitions_type ON competitions(type);
CREATE INDEX IF NOT EXISTS idx_competitions_country ON competitions(country);
CREATE INDEX IF NOT EXISTS idx_competitions_is_active ON competitions(is_active);
CREATE INDEX IF NOT EXISTS idx_competitions_current_season ON competitions(current_season);
```

#### **Create Indexes for Match Highlights Table**

```sql
CREATE INDEX IF NOT EXISTS idx_match_highlights_match_id ON match_highlights(match_id);
CREATE INDEX IF NOT EXISTS idx_match_highlights_youtube_video_id ON match_highlights(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_match_highlights_relevance_score ON match_highlights(relevance_score);
CREATE INDEX IF NOT EXISTS idx_match_highlights_quality_score ON match_highlights(quality_score);
CREATE INDEX IF NOT EXISTS idx_match_highlights_is_verified ON match_highlights(is_verified);
CREATE INDEX IF NOT EXISTS idx_match_highlights_is_available ON match_highlights(is_available);
CREATE INDEX IF NOT EXISTS idx_match_highlights_channel_id ON match_highlights(channel_id);
CREATE INDEX IF NOT EXISTS idx_match_highlights_match_quality ON match_highlights(match_id, quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_match_highlights_verified_available ON match_highlights(is_verified, is_available);
CREATE UNIQUE INDEX IF NOT EXISTS unique_match_youtube_video ON match_highlights(match_id, youtube_video_id);
```

#### **Create Indexes for AI Processing Logs Table**

```sql
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_match_id ON ai_processing_logs(match_id);
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_processing_type ON ai_processing_logs(processing_type);
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_status ON ai_processing_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_created_at ON ai_processing_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_retry_count ON ai_processing_logs(retry_count);
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_match_status ON ai_processing_logs(match_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_type_status ON ai_processing_logs(processing_type, status);
```

### **Phase 4: Utility Functions and Triggers**

#### **Create Update Trigger Function**

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

#### **Create Triggers**

```sql
CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitions_updated_at
    BEFORE UPDATE ON competitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_highlights_updated_at
    BEFORE UPDATE ON match_highlights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_processing_logs_updated_at
    BEFORE UPDATE ON ai_processing_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### **Create Utility Functions**

```sql
-- Function to get best highlight for a match
CREATE OR REPLACE FUNCTION get_best_highlight_for_match(match_uuid UUID)
RETURNS TABLE (
    highlight_id UUID,
    youtube_url TEXT,
    title TEXT,
    quality_score DECIMAL(3,2),
    relevance_score DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mh.id,
        mh.youtube_url,
        mh.title,
        mh.quality_score,
        mh.relevance_score
    FROM match_highlights mh
    WHERE mh.match_id = match_uuid
        AND mh.is_available = true
        AND mh.is_verified = true
    ORDER BY (mh.quality_score + mh.relevance_score) / 2 DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get match statistics
CREATE OR REPLACE FUNCTION get_match_stats(match_uuid UUID)
RETURNS TABLE (
    total_highlights BIGINT,
    verified_highlights BIGINT,
    avg_quality_score DECIMAL(3,2),
    avg_relevance_score DECIMAL(3,2),
    best_highlight_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(mh.id) as total_highlights,
        COUNT(CASE WHEN mh.is_verified THEN 1 END) as verified_highlights,
        AVG(mh.quality_score) as avg_quality_score,
        AVG(mh.relevance_score) as avg_relevance_score,
        (SELECT mh2.youtube_url FROM match_highlights mh2
         WHERE mh2.match_id = match_uuid AND mh2.is_available = true
         ORDER BY (mh2.quality_score + mh2.relevance_score) / 2 DESC LIMIT 1) as best_highlight_url
    FROM match_highlights mh
    WHERE mh.match_id = match_uuid;
END;
$$ LANGUAGE plpgsql;
```

### **Phase 5: Security Configuration**

#### **Enable Row Level Security**

```sql
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processing_logs ENABLE ROW LEVEL SECURITY;
```

#### **Create Security Policies**

```sql
-- Matches table policies
CREATE POLICY "Anyone can view matches" ON matches
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert matches" ON matches
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update matches" ON matches
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can delete matches" ON matches
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Competitions table policies
CREATE POLICY "Anyone can view competitions" ON competitions
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert competitions" ON competitions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update competitions" ON competitions
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can delete competitions" ON competitions
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Match highlights table policies
CREATE POLICY "Anyone can view match highlights" ON match_highlights
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert match highlights" ON match_highlights
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update match highlights" ON match_highlights
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can delete match highlights" ON match_highlights
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- AI processing logs table policies
CREATE POLICY "Authenticated users can view processing logs" ON ai_processing_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert processing logs" ON ai_processing_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update processing logs" ON ai_processing_logs
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can delete processing logs" ON ai_processing_logs
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');
```

### **Phase 6: Seed Initial Data**

#### **Seed Competitions Data**

```sql
INSERT INTO competitions (id, name, type, country, country_code, logo_url, is_active, current_season) VALUES
('PL', 'Premier League', 'league', 'England', 'GB', 'https://logos-world.net/wp-content/uploads/2020/06/Premier-League-Logo.png', true, '2023-24'),
('LL', 'La Liga', 'league', 'Spain', 'ES', 'https://logos-world.net/wp-content/uploads/2020/06/La-Liga-Logo.png', true, '2023-24'),
('SA', 'Serie A', 'league', 'Italy', 'IT', 'https://logos-world.net/wp-content/uploads/2020/06/Serie-A-Logo.png', true, '2023-24'),
('BL', 'Bundesliga', 'league', 'Germany', 'DE', 'https://logos-world.net/wp-content/uploads/2020/06/Bundesliga-Logo.png', true, '2023-24'),
('L1', 'Ligue 1', 'league', 'France', 'FR', 'https://logos-world.net/wp-content/uploads/2020/06/Ligue-1-Logo.png', true, '2023-24'),
('UCL', 'UEFA Champions League', 'cup', 'Europe', 'EU', 'https://logos-world.net/wp-content/uploads/2020/06/UEFA-Champions-League-Logo.png', true, '2023-24'),
('UEL', 'UEFA Europa League', 'cup', 'Europe', 'EU', 'https://logos-world.net/wp-content/uploads/2020/06/UEFA-Europa-League-Logo.png', true, '2023-24'),
('UECL', 'UEFA Europa Conference League', 'cup', 'Europe', 'EU', 'https://logos-world.net/wp-content/uploads/2020/06/UEFA-Europa-Conference-League-Logo.png', true, '2023-24'),
('FAC', 'FA Cup', 'cup', 'England', 'GB', 'https://logos-world.net/wp-content/uploads/2020/06/FA-Cup-Logo.png', true, '2023-24'),
('CDR', 'Copa del Rey', 'cup', 'Spain', 'ES', 'https://logos-world.net/wp-content/uploads/2020/06/Copa-del-Rey-Logo.png', true, '2023-24'),
('CI', 'Coppa Italia', 'cup', 'Italy', 'IT', 'https://logos-world.net/wp-content/uploads/2020/06/Coppa-Italia-Logo.png', true, '2023-24'),
('DFB', 'DFB-Pokal', 'cup', 'Germany', 'DE', 'https://logos-world.net/wp-content/uploads/2020/06/DFB-Pokal-Logo.png', true, '2023-24'),
('CDF', 'Coupe de France', 'cup', 'France', 'FR', 'https://logos-world.net/wp-content/uploads/2020/06/Coupe-de-France-Logo.png', true, '2023-24'),
('WC', 'FIFA World Cup', 'international', 'World', 'WW', 'https://logos-world.net/wp-content/uploads/2020/06/FIFA-World-Cup-Logo.png', true, '2022'),
('EC', 'UEFA European Championship', 'international', 'Europe', 'EU', 'https://logos-world.net/wp-content/uploads/2020/06/UEFA-European-Championship-Logo.png', true, '2024'),
('CA', 'Copa America', 'international', 'South America', 'SA', 'https://logos-world.net/wp-content/uploads/2020/06/Copa-America-Logo.png', true, '2024'),
('UNL', 'UEFA Nations League', 'international', 'Europe', 'EU', 'https://logos-world.net/wp-content/uploads/2020/06/UEFA-Nations-League-Logo.png', true, '2024-25'),
('MLS', 'Major League Soccer', 'league', 'United States', 'US', 'https://logos-world.net/wp-content/uploads/2020/06/MLS-Logo.png', true, '2024'),
('BR', 'Brasileirao', 'league', 'Brazil', 'BR', 'https://logos-world.net/wp-content/uploads/2020/06/Brasileirao-Logo.png', true, '2024'),
('LMX', 'Liga MX', 'league', 'Mexico', 'MX', 'https://logos-world.net/wp-content/uploads/2020/06/Liga-MX-Logo.png', true, '2024'),
('ED', 'Eredivisie', 'league', 'Netherlands', 'NL', 'https://logos-world.net/wp-content/uploads/2020/06/Eredivisie-Logo.png', true, '2023-24'),
('PLP', 'Primeira Liga', 'league', 'Portugal', 'PT', 'https://logos-world.net/wp-content/uploads/2020/06/Primeira-Liga-Logo.png', true, '2023-24'),
('BPL', 'Belgian Pro League', 'league', 'Belgium', 'BE', 'https://logos-world.net/wp-content/uploads/2020/06/Belgian-Pro-League-Logo.png', true, '2023-24'),
('AB', 'Austrian Bundesliga', 'league', 'Austria', 'AT', 'https://logos-world.net/wp-content/uploads/2020/06/Austrian-Bundesliga-Logo.png', true, '2023-24'),
('SSL', 'Swiss Super League', 'league', 'Switzerland', 'CH', 'https://logos-world.net/wp-content/uploads/2020/06/Swiss-Super-League-Logo.png', true, '2023-24'),
('CH', 'Championship', 'league', 'England', 'GB', 'https://logos-world.net/wp-content/uploads/2020/06/Championship-Logo.png', true, '2023-24'),
('SD', 'Segunda Division', 'league', 'Spain', 'ES', 'https://logos-world.net/wp-content/uploads/2020/06/Segunda-Division-Logo.png', true, '2023-24'),
('SB', 'Serie B', 'league', 'Italy', 'IT', 'https://logos-world.net/wp-content/uploads/2020/06/Serie-B-Logo.png', true, '2023-24'),
('2BL', '2. Bundesliga', 'league', 'Germany', 'DE', 'https://logos-world.net/wp-content/uploads/2020/06/2-Bundesliga-Logo.png', true, '2023-24'),
('L2', 'Ligue 2', 'league', 'France', 'FR', 'https://logos-world.net/wp-content/uploads/2020/06/Ligue-2-Logo.png', true, '2023-24')

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    country = EXCLUDED.country,
    country_code = EXCLUDED.country_code,
    logo_url = EXCLUDED.logo_url,
    is_active = EXCLUDED.is_active,
    current_season = EXCLUDED.current_season,
    updated_at = NOW();
```

### **Phase 7: Verification and Testing**

#### **Database Health Check**

```sql
SELECT
    'Database Health Check Complete' as status,
    NOW() as checked_at,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as total_functions,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes;
```

#### **Table Existence Test**

```sql
SELECT
    CASE
        WHEN COUNT(*) = 4 THEN '✅ All tables exist'
        ELSE '❌ Missing tables: ' || (4 - COUNT(*))::text
    END as table_test
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('matches', 'competitions', 'match_highlights', 'ai_processing_logs');
```

#### **Competitions Data Test**

```sql
SELECT COUNT(*) as competitions_count FROM competitions;
```

#### **Functions Test**

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('update_updated_at_column', 'get_best_highlight_for_match', 'get_match_stats');
```

---

## 🚨 **Troubleshooting**

### **Common Issues and Solutions**

#### **Issue: "Unable to find snippet with ID" Error**

- **Cause**: Supabase SQL editor UI bug
- **Solution**: Ignore the error message - the SQL still executes successfully
- **Note**: This is a known issue with Supabase's web interface

#### **Issue: "Policy already exists" Error**

- **Cause**: Running policies creation multiple times
- **Solution**: Skip duplicate policy creation or use `CREATE POLICY IF NOT EXISTS`

#### **Issue: RLS Disabled Warning**

- **Cause**: Row Level Security not enabled
- **Solution**: Run `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`

#### **Issue: Foreign Key Constraint Errors**

- **Cause**: Referenced tables don't exist or have different structure
- **Solution**: Ensure all tables are created in the correct order

### **Performance Monitoring**

#### **Check Index Usage**

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_tup_read DESC;
```

#### **Monitor Table Sizes**

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 📊 **Final Database Statistics**

After successful implementation, your database should have:

- **Total Tables**: 10 (4 new + 6 existing)
- **Total Indexes**: 44+ (optimized for performance)
- **Total Functions**: 3 (utility functions)
- **Competitions**: 30 major football competitions
- **Security**: RLS enabled on all new tables
- **Performance**: Optimized indexes and constraints

---

## 🔮 **Next Steps**

With the database setup complete, the next phases are:

1. **Match Data Integration** - Connect to Football-Data.org API
2. **AI Video Discovery** - Set up LangChain and YouTube search
3. **Backend API Updates** - Create new endpoints
4. **Frontend Updates** - Update React components

The database is now ready to support the new AI-powered video discovery system!


