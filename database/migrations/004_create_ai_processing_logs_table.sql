-- Migration: Create ai_processing_logs table
-- Description: Tracks AI processing activities and results
-- Date: 2024-01-01

-- Create ai_processing_logs table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_match_id ON ai_processing_logs(match_id);
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_processing_type ON ai_processing_logs(processing_type);
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_status ON ai_processing_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_created_at ON ai_processing_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_retry_count ON ai_processing_logs(retry_count);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_match_status ON ai_processing_logs(match_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_type_status ON ai_processing_logs(processing_type, status);

-- Add comments for documentation
COMMENT ON TABLE ai_processing_logs IS 'Tracks AI processing activities and results for debugging and monitoring';
COMMENT ON COLUMN ai_processing_logs.processing_type IS 'Type of AI processing performed';
COMMENT ON COLUMN ai_processing_logs.input_data IS 'Input data for the AI processing (JSON)';
COMMENT ON COLUMN ai_processing_logs.output_data IS 'Output data from the AI processing (JSON)';
COMMENT ON COLUMN ai_processing_logs.processing_time_ms IS 'Processing time in milliseconds';
