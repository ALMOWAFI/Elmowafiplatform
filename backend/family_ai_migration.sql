-- Family AI Database Migration
-- Adds tables for personality learning, running jokes, and family dynamics
-- Compatible with existing PostgreSQL schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Family Personalities Table
CREATE TABLE IF NOT EXISTS family_personalities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    
    -- Core personality traits
    humor_style VARCHAR(50),
    communication_style VARCHAR(50),
    interests TEXT[],
    personality_traits JSONB DEFAULT '{}',
    
    -- Behavioral patterns
    typical_responses JSONB DEFAULT '[]',
    preferred_activities TEXT[],
    dislikes TEXT[],
    
    -- Cultural context
    cultural_preferences JSONB DEFAULT '{}',
    family_role VARCHAR(100),
    
    -- AI learning metadata
    confidence_score REAL DEFAULT 0.0,
    last_updated_from_interaction TIMESTAMP WITH TIME ZONE,
    interaction_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for family_personalities
CREATE INDEX IF NOT EXISTS idx_family_personality_member ON family_personalities(family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_personality_updated ON family_personalities(updated_at);

-- Running Jokes Table
CREATE TABLE IF NOT EXISTS running_jokes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL, -- References family group
    
    -- Joke content and context
    joke_title VARCHAR(255) NOT NULL,
    joke_context TEXT NOT NULL,
    trigger_words TEXT[],
    participants TEXT[],
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    effectiveness_score REAL DEFAULT 0.0,
    
    -- Context and metadata
    origin_memory_id UUID,
    related_locations TEXT[],
    seasonal_relevance VARCHAR(50),
    
    -- AI usage guidelines
    appropriate_contexts TEXT[],
    avoid_contexts TEXT[],
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for running_jokes
CREATE INDEX IF NOT EXISTS idx_running_joke_family ON running_jokes(family_id);
CREATE INDEX IF NOT EXISTS idx_running_joke_triggers ON running_jokes USING GIN(trigger_words);
CREATE INDEX IF NOT EXISTS idx_running_joke_usage ON running_jokes(usage_count);

-- Family Dynamics Table
CREATE TABLE IF NOT EXISTS family_dynamics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL,
    member1_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    member2_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    
    -- Relationship type and dynamics
    relationship_type VARCHAR(100) NOT NULL,
    interaction_style JSONB DEFAULT '{}',
    
    -- Communication patterns
    typical_interactions JSONB DEFAULT '[]',
    shared_interests TEXT[],
    conflict_areas TEXT[],
    
    -- AI insights
    relationship_strength REAL DEFAULT 0.5,
    communication_frequency VARCHAR(50),
    influence_level REAL DEFAULT 0.5,
    
    -- Context for AI responses
    appropriate_tone VARCHAR(50),
    shared_memories_count INTEGER DEFAULT 0,
    last_interaction TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure no self-relationships
    CONSTRAINT check_different_members CHECK (member1_id != member2_id)
);

-- Indexes for family_dynamics
CREATE INDEX IF NOT EXISTS idx_family_dynamics_members ON family_dynamics(member1_id, member2_id);
CREATE INDEX IF NOT EXISTS idx_family_dynamics_family ON family_dynamics(family_id);
CREATE INDEX IF NOT EXISTS idx_family_dynamics_relationship ON family_dynamics(relationship_type);

-- AI Memory Contexts Table
CREATE TABLE IF NOT EXISTS ai_memory_contexts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL,
    context_type VARCHAR(50) NOT NULL,
    
    -- Context data
    context_data JSONB NOT NULL,
    participants TEXT[],
    
    -- Memory classification
    memory_layer VARCHAR(20) NOT NULL CHECK (memory_layer IN ('short_term', 'medium_term', 'long_term')),
    importance_score REAL DEFAULT 0.5,
    
    -- Usage tracking
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE,
    
    -- Expiration and cleanup
    expires_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_memory_contexts
CREATE INDEX IF NOT EXISTS idx_ai_memory_family ON ai_memory_contexts(family_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_type ON ai_memory_contexts(context_type);
CREATE INDEX IF NOT EXISTS idx_ai_memory_layer ON ai_memory_contexts(memory_layer);
CREATE INDEX IF NOT EXISTS idx_ai_memory_expires ON ai_memory_contexts(expires_at);

-- Family Privacy Settings Table
CREATE TABLE IF NOT EXISTS family_privacy_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL,
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    
    -- Privacy modes
    default_privacy_mode VARCHAR(20) DEFAULT 'family' CHECK (default_privacy_mode IN ('private', 'family', 'public')),
    allow_ai_learning BOOLEAN DEFAULT TRUE,
    allow_personality_analysis BOOLEAN DEFAULT TRUE,
    allow_joke_creation BOOLEAN DEFAULT TRUE,
    
    -- Content sharing preferences
    share_memories_with TEXT[],
    share_location_with TEXT[],
    share_activities_with TEXT[],
    
    -- AI interaction preferences
    ai_response_style VARCHAR(50) DEFAULT 'balanced',
    preferred_language VARCHAR(10) DEFAULT 'en',
    cultural_sensitivity_level VARCHAR(20) DEFAULT 'high',
    
    -- Data retention preferences
    keep_conversation_history BOOLEAN DEFAULT TRUE,
    history_retention_days INTEGER DEFAULT 365,
    allow_data_export BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for family-member combination
    UNIQUE(family_id, member_id)
);

-- Indexes for family_privacy_settings
CREATE INDEX IF NOT EXISTS idx_privacy_family_member ON family_privacy_settings(family_id, member_id);
CREATE INDEX IF NOT EXISTS idx_privacy_mode ON family_privacy_settings(default_privacy_mode);

-- AI Interaction Logs Table
CREATE TABLE IF NOT EXISTS ai_interaction_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL,
    member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
    
    -- Interaction details
    interaction_type VARCHAR(50) NOT NULL,
    user_input TEXT,
    ai_response TEXT,
    
    -- Context and analysis
    context_used JSONB DEFAULT '[]',
    personality_applied JSONB DEFAULT '{}',
    jokes_referenced TEXT[],
    
    -- Feedback and learning
    user_satisfaction REAL,
    response_effectiveness REAL,
    learning_extracted JSONB DEFAULT '{}',
    
    -- Privacy and compliance
    privacy_mode VARCHAR(20) NOT NULL,
    data_retention_until TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_interaction_logs
CREATE INDEX IF NOT EXISTS idx_ai_log_family ON ai_interaction_logs(family_id);
CREATE INDEX IF NOT EXISTS idx_ai_log_member ON ai_interaction_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_ai_log_type ON ai_interaction_logs(interaction_type);
CREATE INDEX IF NOT EXISTS idx_ai_log_created ON ai_interaction_logs(created_at);

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers for tables with updated_at columns
CREATE TRIGGER update_family_personalities_updated_at BEFORE UPDATE ON family_personalities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_running_jokes_updated_at BEFORE UPDATE ON running_jokes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_dynamics_updated_at BEFORE UPDATE ON family_dynamics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_memory_contexts_updated_at BEFORE UPDATE ON ai_memory_contexts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_privacy_settings_updated_at BEFORE UPDATE ON family_privacy_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default privacy settings for existing family members
INSERT INTO family_privacy_settings (family_id, member_id, default_privacy_mode, allow_ai_learning)
SELECT 
    COALESCE(fg.id, uuid_generate_v4()) as family_id,
    fm.id as member_id,
    'family' as default_privacy_mode,
    TRUE as allow_ai_learning
FROM family_members fm
LEFT JOIN family_groups fg ON TRUE  -- This assumes a single family group; adjust based on your schema
WHERE NOT EXISTS (
    SELECT 1 FROM family_privacy_settings fps 
    WHERE fps.member_id = fm.id
)
ON CONFLICT (family_id, member_id) DO NOTHING;

-- Create view for family AI summary
CREATE OR REPLACE VIEW family_ai_summary AS
SELECT 
    fm.id as member_id,
    fm.name as member_name,
    fp.humor_style,
    fp.communication_style,
    fp.confidence_score,
    fp.interaction_count,
    fps.default_privacy_mode,
    fps.allow_ai_learning,
    COUNT(DISTINCT rj.id) as running_jokes_count,
    COUNT(DISTINCT fd.id) as relationship_dynamics_count
FROM family_members fm
LEFT JOIN family_personalities fp ON fm.id = fp.family_member_id
LEFT JOIN family_privacy_settings fps ON fm.id = fps.member_id
LEFT JOIN running_jokes rj ON rj.participants @> ARRAY[fm.id::text]
LEFT JOIN family_dynamics fd ON fd.member1_id = fm.id OR fd.member2_id = fm.id
GROUP BY 
    fm.id, fm.name, fp.humor_style, fp.communication_style, 
    fp.confidence_score, fp.interaction_count, fps.default_privacy_mode, fps.allow_ai_learning;

-- Grant permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMENT ON TABLE family_personalities IS 'AI-learned personality traits for each family member';
COMMENT ON TABLE running_jokes IS 'Family running jokes and humor tracking';
COMMENT ON TABLE family_dynamics IS 'Relationship dynamics between family members';
COMMENT ON TABLE ai_memory_contexts IS 'AI memory context and conversation history';
COMMENT ON TABLE family_privacy_settings IS 'Privacy settings and modes for family interactions';
COMMENT ON TABLE ai_interaction_logs IS 'Log of AI interactions for learning and improvement';
