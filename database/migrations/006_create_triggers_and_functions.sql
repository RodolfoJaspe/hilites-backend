-- Migration: Create triggers and functions
-- Description: Add automatic timestamp updates and utility functions
-- Date: 2024-01-01

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
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

-- Create function to calculate match duration
CREATE OR REPLACE FUNCTION calculate_match_duration(start_time TIMESTAMP WITH TIME ZONE, end_time TIMESTAMP WITH TIME ZONE)
RETURNS INTERVAL AS $$
BEGIN
    IF start_time IS NULL OR end_time IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN end_time - start_time;
END;
$$ LANGUAGE plpgsql;

-- Create function to get best highlight for a match
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

-- Create function to get match statistics
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

-- Create function to clean up old processing logs
CREATE OR REPLACE FUNCTION cleanup_old_processing_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_processing_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
        AND status IN ('completed', 'failed');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at timestamp when a record is modified';
COMMENT ON FUNCTION calculate_match_duration(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Calculates the duration between two timestamps';
COMMENT ON FUNCTION get_best_highlight_for_match(UUID) IS 'Returns the best highlight video for a given match';
COMMENT ON FUNCTION get_match_stats(UUID) IS 'Returns statistics for a given match';
COMMENT ON FUNCTION cleanup_old_processing_logs(INTEGER) IS 'Cleans up old processing logs older than specified days';


