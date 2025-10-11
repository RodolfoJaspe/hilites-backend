-- Migration: Create match_highlights table
-- Description: Stores video highlights for matches discovered by AI
-- Date: 2024-01-01

-- Create match_highlights table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_highlights_match_id ON match_highlights(match_id);
CREATE INDEX IF NOT EXISTS idx_match_highlights_youtube_video_id ON match_highlights(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_match_highlights_relevance_score ON match_highlights(relevance_score);
CREATE INDEX IF NOT EXISTS idx_match_highlights_quality_score ON match_highlights(quality_score);
CREATE INDEX IF NOT EXISTS idx_match_highlights_is_verified ON match_highlights(is_verified);
CREATE INDEX IF NOT EXISTS idx_match_highlights_is_available ON match_highlights(is_available);
CREATE INDEX IF NOT EXISTS idx_match_highlights_channel_id ON match_highlights(channel_id);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_match_highlights_match_quality ON match_highlights(match_id, quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_match_highlights_verified_available ON match_highlights(is_verified, is_available);

-- Add unique constraint to prevent duplicate videos for same match
CREATE UNIQUE INDEX IF NOT EXISTS unique_match_youtube_video ON match_highlights(match_id, youtube_video_id);

-- Add comments for documentation
COMMENT ON TABLE match_highlights IS 'Stores video highlights for matches discovered by AI';
COMMENT ON COLUMN match_highlights.relevance_score IS 'AI-calculated relevance score (0.00-1.00)';
COMMENT ON COLUMN match_highlights.quality_score IS 'AI-calculated quality score (0.00-1.00)';
COMMENT ON COLUMN match_highlights.is_verified IS 'Whether the video has been manually verified';
COMMENT ON COLUMN match_highlights.is_available IS 'Whether the video is still available on YouTube';




