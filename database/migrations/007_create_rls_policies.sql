-- Migration: Create Row Level Security policies
-- Description: Add RLS policies for data security
-- Date: 2024-01-01

-- Enable RLS on new tables
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processing_logs ENABLE ROW LEVEL SECURITY;

-- Matches table policies
-- Anyone can view matches (public data)
CREATE POLICY "Anyone can view matches" ON matches
    FOR SELECT USING (true);

-- Only authenticated users can insert matches (for API operations)
CREATE POLICY "Authenticated users can insert matches" ON matches
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can update matches
CREATE POLICY "Authenticated users can update matches" ON matches
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Only admins can delete matches
CREATE POLICY "Only admins can delete matches" ON matches
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Competitions table policies
-- Anyone can view competitions (public data)
CREATE POLICY "Anyone can view competitions" ON competitions
    FOR SELECT USING (true);

-- Only authenticated users can insert competitions
CREATE POLICY "Authenticated users can insert competitions" ON competitions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can update competitions
CREATE POLICY "Authenticated users can update competitions" ON competitions
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Only admins can delete competitions
CREATE POLICY "Only admins can delete competitions" ON competitions
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Match highlights table policies
-- Anyone can view match highlights (public data)
CREATE POLICY "Anyone can view match highlights" ON match_highlights
    FOR SELECT USING (true);

-- Only authenticated users can insert match highlights
CREATE POLICY "Authenticated users can insert match highlights" ON match_highlights
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can update match highlights
CREATE POLICY "Authenticated users can update match highlights" ON match_highlights
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Only admins can delete match highlights
CREATE POLICY "Only admins can delete match highlights" ON match_highlights
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- AI processing logs table policies
-- Only authenticated users can view processing logs
CREATE POLICY "Authenticated users can view processing logs" ON ai_processing_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only authenticated users can insert processing logs
CREATE POLICY "Authenticated users can insert processing logs" ON ai_processing_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can update processing logs
CREATE POLICY "Authenticated users can update processing logs" ON ai_processing_logs
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Only admins can delete processing logs
CREATE POLICY "Only admins can delete processing logs" ON ai_processing_logs
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Create a view for public match data (without sensitive information)
CREATE OR REPLACE VIEW public_matches AS
SELECT 
    m.id,
    m.external_id,
    m.competition_id,
    m.competition_name,
    m.match_date,
    m.status,
    m.home_score,
    m.away_score,
    m.venue,
    m.match_week,
    m.season,
    ht.name as home_team_name,
    ht.logo_url as home_team_logo,
    at.name as away_team_name,
    at.logo_url as away_team_logo,
    c.name as competition_display_name,
    c.logo_url as competition_logo,
    c.type as competition_type
FROM matches m
LEFT JOIN teams ht ON m.home_team_id = ht.id
LEFT JOIN teams at ON m.away_team_id = at.id
LEFT JOIN competitions c ON m.competition_id = c.id;

-- Create a view for public highlights data
CREATE OR REPLACE VIEW public_match_highlights AS
SELECT 
    mh.id,
    mh.match_id,
    mh.youtube_video_id,
    mh.youtube_url,
    mh.title,
    mh.description,
    mh.thumbnail_url,
    mh.duration_seconds,
    mh.view_count,
    mh.like_count,
    mh.channel_name,
    mh.relevance_score,
    mh.quality_score,
    mh.is_verified,
    mh.is_available,
    mh.created_at
FROM match_highlights mh
WHERE mh.is_available = true;

-- Grant access to views
GRANT SELECT ON public_matches TO anon, authenticated;
GRANT SELECT ON public_match_highlights TO anon, authenticated;


