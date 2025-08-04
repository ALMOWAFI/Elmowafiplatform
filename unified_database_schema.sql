-- Unified Database Schema for Elmowafiplatform
-- Links budget, photos, games, and family data with proper relationships
-- PostgreSQL schema for Railway deployment

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE USER AND FAMILY MANAGEMENT
-- ============================================================================

-- Users table (unified from both systems)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    display_name VARCHAR(255),
    avatar_url TEXT,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Family members table (linked to users)
CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_arabic VARCHAR(255),
    birth_date DATE,
    location TEXT,
    avatar TEXT,
    relationships JSONB, -- JSON object for family relationships
    role VARCHAR(100) DEFAULT 'member', -- owner, admin, member
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Family groups (for multi-family support)
CREATE TABLE family_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB, -- Family-specific settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Family group members (many-to-many)
CREATE TABLE family_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'member', -- owner, admin, member
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(family_group_id, family_member_id)
);

-- ============================================================================
-- BUDGET SYSTEM (Unified from Wasp budget system)
-- ============================================================================

-- Budget profiles (linked to family groups)
CREATE TABLE budget_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    currency VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget envelopes (categories)
CREATE TABLE budget_envelopes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_profile_id UUID REFERENCES budget_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) DEFAULT 0,
    spent DECIMAL(15,2) DEFAULT 0,
    category VARCHAR(100),
    color VARCHAR(7), -- Hex color code
    icon VARCHAR(100),
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget transactions
CREATE TABLE budget_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_profile_id UUID REFERENCES budget_profiles(id) ON DELETE CASCADE,
    envelope_id UUID REFERENCES budget_envelopes(id) ON DELETE SET NULL,
    family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
    date DATE NOT NULL,
    location TEXT,
    receipt_url TEXT,
    tags JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PHOTO AND MEMORY SYSTEM
-- ============================================================================

-- Memories table (photos and stories)
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    location TEXT,
    image_url TEXT,
    thumbnail_url TEXT,
    tags JSONB, -- Array of tags
    family_members JSONB, -- Array of family member IDs
    ai_analysis JSONB, -- AI analysis results
    memory_type VARCHAR(50) DEFAULT 'photo', -- photo, video, story, event
    privacy_level VARCHAR(20) DEFAULT 'family', -- private, family, public
    created_by UUID REFERENCES family_members(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Albums for photo organization
CREATE TABLE albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
    album_type VARCHAR(50) DEFAULT 'manual', -- manual, ai_generated, date_based, location_based
    clustering_algorithm VARCHAR(100),
    family_members JSONB, -- Array of family member IDs
    tags JSONB,
    created_by UUID REFERENCES family_members(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Album memories (many-to-many)
CREATE TABLE album_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(album_id, memory_id)
);

-- Face recognition training data
CREATE TABLE face_training_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    face_encoding JSONB, -- Face encoding data
    verified BOOLEAN DEFAULT false,
    training_quality_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- GAME SYSTEM
-- ============================================================================

-- Game sessions
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    game_type VARCHAR(100) NOT NULL, -- trivia, puzzle, story, cultural
    title VARCHAR(255),
    description TEXT,
    players JSONB NOT NULL, -- Array of family member IDs
    status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, abandoned
    game_state JSONB, -- Current game state
    settings JSONB, -- Game settings
    current_phase VARCHAR(100),
    ai_decisions JSONB, -- AI decision history
    score_data JSONB, -- Player scores and statistics
    created_by UUID REFERENCES family_members(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game achievements
CREATE TABLE game_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
    game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    achievement_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    points INTEGER DEFAULT 0,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRAVEL AND ACTIVITY SYSTEM
-- ============================================================================

-- Travel plans
CREATE TABLE travel_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget DECIMAL(15,2),
    budget_profile_id UUID REFERENCES budget_profiles(id) ON DELETE SET NULL,
    participants JSONB, -- Array of family member IDs
    activities JSONB, -- Planned activities
    status VARCHAR(50) DEFAULT 'planning', -- planning, active, completed, cancelled
    created_by UUID REFERENCES family_members(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Travel expenses (linked to budget)
CREATE TABLE travel_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    travel_plan_id UUID REFERENCES travel_plans(id) ON DELETE CASCADE,
    budget_transaction_id UUID REFERENCES budget_transactions(id) ON DELETE SET NULL,
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    category VARCHAR(100),
    date DATE NOT NULL,
    location TEXT,
    receipt_url TEXT,
    created_by UUID REFERENCES family_members(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CULTURAL HERITAGE SYSTEM
-- ============================================================================

-- Cultural heritage items
CREATE TABLE cultural_heritage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    title_arabic VARCHAR(255),
    description TEXT,
    description_arabic TEXT,
    category VARCHAR(100),
    family_members JSONB, -- Array of family member IDs
    cultural_significance TEXT,
    tags JSONB,
    preservation_date DATE,
    media_urls JSONB, -- Array of media URLs
    created_by UUID REFERENCES family_members(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- AI AND ANALYTICS SYSTEM
-- ============================================================================

-- AI analysis cache
CREATE TABLE ai_analysis_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_hash VARCHAR(255) UNIQUE NOT NULL,
    analysis_type VARCHAR(100) NOT NULL,
    analysis_result JSONB NOT NULL,
    family_context_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Memory suggestions
CREATE TABLE memory_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(50) NOT NULL, -- on_this_day, similar_content, family_connection
    suggested_to_user UUID REFERENCES family_members(id) ON DELETE CASCADE,
    suggestion_date DATE,
    relevance_score DECIMAL(3,2),
    user_interaction VARCHAR(20), -- viewed, dismissed, saved
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- REAL-TIME COLLABORATION SYSTEM
-- ============================================================================

-- User presence
CREATE TABLE user_presence (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL, -- online, offline, away
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    connection_type VARCHAR(50), -- family_member, game_player, travel_planner, memory_viewer
    current_room_type VARCHAR(50),
    current_room_id UUID,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collaboration sessions
CREATE TABLE collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_type VARCHAR(50) NOT NULL, -- travel_planning, memory_viewing, game_session
    resource_id UUID NOT NULL, -- travel_plan_id, memory_id, game_session_id
    participants JSONB NOT NULL, -- Array of user IDs
    session_data JSONB, -- Session-specific data
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- NOTIFICATIONS AND INVITATIONS
-- ============================================================================

-- Invitations
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, expired, declined
    expires_at TIMESTAMP NOT NULL,
    invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    accepted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Family member indexes
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_family_members_name ON family_members(name);

-- Budget indexes
CREATE INDEX idx_budget_profiles_family_group ON budget_profiles(family_group_id);
CREATE INDEX idx_budget_envelopes_profile ON budget_envelopes(budget_profile_id);
CREATE INDEX idx_budget_transactions_profile ON budget_transactions(budget_profile_id);
CREATE INDEX idx_budget_transactions_date ON budget_transactions(date);
CREATE INDEX idx_budget_transactions_envelope ON budget_transactions(envelope_id);

-- Memory indexes
CREATE INDEX idx_memories_family_group ON memories(family_group_id);
CREATE INDEX idx_memories_date ON memories(date);
CREATE INDEX idx_memories_created_by ON memories(created_by);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);

-- Album indexes
CREATE INDEX idx_albums_family_group ON albums(family_group_id);
CREATE INDEX idx_album_memories_album ON album_memories(album_id);
CREATE INDEX idx_album_memories_memory ON album_memories(memory_id);

-- Game indexes
CREATE INDEX idx_game_sessions_family_group ON game_sessions(family_group_id);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_game_achievements_member ON game_achievements(family_member_id);

-- Travel indexes
CREATE INDEX idx_travel_plans_family_group ON travel_plans(family_group_id);
CREATE INDEX idx_travel_plans_dates ON travel_plans(start_date, end_date);
CREATE INDEX idx_travel_expenses_plan ON travel_expenses(travel_plan_id);

-- Cultural heritage indexes
CREATE INDEX idx_cultural_heritage_family_group ON cultural_heritage(family_group_id);
CREATE INDEX idx_cultural_heritage_category ON cultural_heritage(category);

-- AI and analytics indexes
CREATE INDEX idx_ai_analysis_cache_hash ON ai_analysis_cache(content_hash);
CREATE INDEX idx_memory_suggestions_memory ON memory_suggestions(memory_id);
CREATE INDEX idx_memory_suggestions_user ON memory_suggestions(suggested_to_user);

-- Presence and collaboration indexes
CREATE INDEX idx_user_presence_status ON user_presence(status);
CREATE INDEX idx_collaboration_sessions_type ON collaboration_sessions(session_type);

-- Invitation indexes
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_token ON invitations(token);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON family_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_groups_updated_at BEFORE UPDATE ON family_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_profiles_updated_at BEFORE UPDATE ON budget_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_envelopes_updated_at BEFORE UPDATE ON budget_envelopes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_transactions_updated_at BEFORE UPDATE ON budget_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON albums FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_travel_plans_updated_at BEFORE UPDATE ON travel_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cultural_heritage_updated_at BEFORE UPDATE ON cultural_heritage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collaboration_sessions_updated_at BEFORE UPDATE ON collaboration_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Family dashboard view
CREATE VIEW family_dashboard AS
SELECT 
    fg.id as family_group_id,
    fg.name as family_group_name,
    COUNT(DISTINCT fm.id) as member_count,
    COUNT(DISTINCT m.id) as memory_count,
    COUNT(DISTINCT bp.id) as budget_profile_count,
    COUNT(DISTINCT gs.id) as active_game_count
FROM family_groups fg
LEFT JOIN family_group_members fgm ON fg.id = fgm.family_group_id
LEFT JOIN family_members fm ON fgm.family_member_id = fm.id
LEFT JOIN memories m ON fg.id = m.family_group_id
LEFT JOIN budget_profiles bp ON fg.id = bp.family_group_id
LEFT JOIN game_sessions gs ON fg.id = gs.family_group_id AND gs.status = 'active'
GROUP BY fg.id, fg.name;

-- Budget summary view
CREATE VIEW budget_summary AS
SELECT 
    bp.id as budget_profile_id,
    bp.name as budget_name,
    fg.name as family_group_name,
    SUM(be.amount) as total_budgeted,
    SUM(be.spent) as total_spent,
    SUM(be.amount - be.spent) as total_remaining,
    COUNT(DISTINCT bt.id) as transaction_count
FROM budget_profiles bp
JOIN family_groups fg ON bp.family_group_id = fg.id
LEFT JOIN budget_envelopes be ON bp.id = be.budget_profile_id AND be.is_archived = false
LEFT JOIN budget_transactions bt ON bp.id = bt.budget_profile_id
GROUP BY bp.id, bp.name, fg.name;

-- Memory analytics view
CREATE VIEW memory_analytics AS
SELECT 
    m.family_group_id,
    DATE_TRUNC('month', m.date) as month,
    COUNT(*) as memory_count,
    COUNT(CASE WHEN m.memory_type = 'photo' THEN 1 END) as photo_count,
    COUNT(CASE WHEN m.memory_type = 'video' THEN 1 END) as video_count,
    COUNT(CASE WHEN m.memory_type = 'story' THEN 1 END) as story_count
FROM memories m
GROUP BY m.family_group_id, DATE_TRUNC('month', m.date);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Unified user table for all platform features';
COMMENT ON TABLE family_members IS 'Family members linked to users and family groups';
COMMENT ON TABLE family_groups IS 'Family groups for organizing multiple families';
COMMENT ON TABLE budget_profiles IS 'Budget profiles linked to family groups';
COMMENT ON TABLE memories IS 'Photos, videos, and stories with AI analysis';
COMMENT ON TABLE game_sessions IS 'AI-powered family games and activities';
COMMENT ON TABLE travel_plans IS 'Family travel planning with budget integration';
COMMENT ON TABLE cultural_heritage IS 'Cultural heritage preservation and sharing';
COMMENT ON TABLE ai_analysis_cache IS 'Cached AI analysis results for performance';
COMMENT ON TABLE user_presence IS 'Real-time user presence and collaboration data'; 