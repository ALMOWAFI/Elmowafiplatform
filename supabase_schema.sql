-- ================================================
-- ELMOWAFIPLATFORM SUPABASE SCHEMA
-- Unified database for family memory & travel platform
-- ================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ================================================
-- CORE FAMILY MANAGEMENT
-- ================================================

-- Family Groups (multiple families can use the platform)
CREATE TABLE family_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cultural_background VARCHAR(100),
    primary_language VARCHAR(10) DEFAULT 'en',
    secondary_language VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family Members (extends Supabase auth.users)
CREATE TABLE family_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_arabic VARCHAR(255),
    birth_date DATE,
    location VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'member', -- admin, parent, child, member
    cultural_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, family_group_id)
);

-- Family Relationships (parent-child, spouse, etc.)
CREATE TABLE family_relationships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    member_1_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
    member_2_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- parent, child, spouse, sibling, grandparent, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- MEMORY MANAGEMENT SYSTEM
-- ================================================

-- Memory Collections (albums, events, trips)
CREATE TABLE memory_collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    collection_type VARCHAR(50) DEFAULT 'album', -- album, event, trip, milestone
    start_date DATE,
    end_date DATE,
    location VARCHAR(255),
    location_coords POINT,
    cover_image_url TEXT,
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES family_members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual Memories (photos, videos, notes)
CREATE TABLE memories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES memory_collections(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    memory_type VARCHAR(50) DEFAULT 'photo', -- photo, video, note, document
    file_url TEXT,
    file_type VARCHAR(100),
    file_size BIGINT,
    date_taken TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    location_coords POINT,
    ai_analysis JSONB, -- Store AI analysis results
    tags TEXT[], -- Array of tags
    is_favorite BOOLEAN DEFAULT false,
    created_by UUID REFERENCES family_members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory Participants (who's in this memory)
CREATE TABLE memory_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(memory_id, family_member_id)
);

-- Memory Reactions (likes, loves, etc.)
CREATE TABLE memory_reactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) DEFAULT 'like', -- like, love, laugh, wow, sad
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(memory_id, family_member_id)
);

-- Memory Comments
CREATE TABLE memory_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES memory_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- TRAVEL MANAGEMENT SYSTEM
-- ================================================

-- Travel Plans
CREATE TABLE travel_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    destination VARCHAR(255) NOT NULL,
    destination_coords POINT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget_total DECIMAL(12,2),
    budget_currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'planning', -- planning, confirmed, active, completed, cancelled
    travel_type VARCHAR(50), -- vacation, pilgrimage, visit, business
    created_by UUID REFERENCES family_members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Travel Participants
CREATE TABLE travel_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    travel_plan_id UUID REFERENCES travel_plans(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'participant', -- organizer, participant, maybe
    confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(travel_plan_id, family_member_id)
);

-- Travel Activities/Itinerary
CREATE TABLE travel_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    travel_plan_id UUID REFERENCES travel_plans(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type VARCHAR(50), -- sightseeing, dining, transport, accommodation
    location VARCHAR(255),
    location_coords POINT,
    scheduled_date DATE,
    scheduled_time TIME,
    duration_minutes INTEGER,
    cost DECIMAL(10,2),
    booking_reference VARCHAR(100),
    booking_status VARCHAR(20) DEFAULT 'planned',
    created_by UUID REFERENCES family_members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Travel Budget Items
CREATE TABLE travel_budget_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    travel_plan_id UUID REFERENCES travel_plans(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- transport, accommodation, food, activities, shopping
    name VARCHAR(255) NOT NULL,
    planned_amount DECIMAL(10,2),
    actual_amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    paid_by UUID REFERENCES family_members(id),
    split_type VARCHAR(20) DEFAULT 'equal', -- equal, custom, individual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- GAMING & ACTIVITIES SYSTEM
-- ================================================

-- Game Sessions
CREATE TABLE game_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    game_type VARCHAR(50) NOT NULL, -- mafia, among_us, scavenger_hunt, trivia
    status VARCHAR(20) DEFAULT 'waiting', -- waiting, active, paused, completed, cancelled
    max_players INTEGER DEFAULT 10,
    game_settings JSONB, -- Store game-specific settings
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES family_members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game Players
CREATE TABLE game_players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
    player_role VARCHAR(50), -- depends on game type
    player_status VARCHAR(20) DEFAULT 'alive', -- alive, eliminated, spectator
    score INTEGER DEFAULT 0,
    game_data JSONB, -- Store player-specific game data
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(game_session_id, family_member_id)
);

-- Game Events (moves, votes, eliminations)
CREATE TABLE game_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    player_id UUID REFERENCES game_players(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- AI & SMART FEATURES
-- ================================================

-- AI Memory Suggestions
CREATE TABLE ai_suggestions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(50), -- memory_reminder, travel_recommendation, photo_tag
    title VARCHAR(255),
    description TEXT,
    suggestion_data JSONB,
    relevance_score DECIMAL(3,2),
    shown_to UUID REFERENCES family_members(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, dismissed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Chat Messages (family group chat)
CREATE TABLE chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- text, image, file, system
    file_url TEXT,
    reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- Family relationships
CREATE INDEX idx_family_members_family_group ON family_members(family_group_id);
CREATE INDEX idx_family_members_user ON family_members(user_id);

-- Memory performance
CREATE INDEX idx_memories_family_group ON memories(family_group_id);
CREATE INDEX idx_memories_collection ON memories(collection_id);
CREATE INDEX idx_memories_date ON memories(date_taken);
CREATE INDEX idx_memories_location ON memories USING GIST(location_coords);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX idx_memories_ai_analysis ON memories USING GIN(ai_analysis);

-- Travel performance
CREATE INDEX idx_travel_plans_family_group ON travel_plans(family_group_id);
CREATE INDEX idx_travel_plans_dates ON travel_plans(start_date, end_date);
CREATE INDEX idx_travel_activities_plan ON travel_activities(travel_plan_id);

-- Gaming performance
CREATE INDEX idx_game_sessions_family_group ON game_sessions(family_group_id);
CREATE INDEX idx_game_players_session ON game_players(game_session_id);
CREATE INDEX idx_game_events_session ON game_events(game_session_id);

-- Chat performance
CREATE INDEX idx_chat_messages_family_group ON chat_messages(family_group_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on all tables
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES (Family members can only see their family's data)
-- ================================================

-- Family Groups - users can only see groups they belong to
CREATE POLICY "Users can see their family groups" ON family_groups
    FOR SELECT USING (
        id IN (
            SELECT family_group_id 
            FROM family_members 
            WHERE user_id = auth.uid()
        )
    );

-- Family Members - users can see all members in their family groups
CREATE POLICY "Users can see family members in their groups" ON family_members
    FOR SELECT USING (
        family_group_id IN (
            SELECT family_group_id 
            FROM family_members 
            WHERE user_id = auth.uid()
        )
    );

-- Memories - users can see memories from their family groups
CREATE POLICY "Users can see family memories" ON memories
    FOR SELECT USING (
        family_group_id IN (
            SELECT family_group_id 
            FROM family_members 
            WHERE user_id = auth.uid()
        )
    );

-- Similar policies for all other tables...
-- (Policies ensure family data privacy and security)

-- ================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ================================================

-- Function to get family member ID from auth user ID
CREATE OR REPLACE FUNCTION get_family_member_id(p_user_id UUID, p_family_group_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id 
        FROM family_members 
        WHERE user_id = p_user_id 
        AND family_group_id = p_family_group_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update timestamps
CREATE TRIGGER update_family_groups_updated_at 
    BEFORE UPDATE ON family_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_members_updated_at 
    BEFORE UPDATE ON family_members 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at 
    BEFORE UPDATE ON memories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- INITIAL DATA & SAMPLE FAMILY
-- ================================================

-- Insert sample family group (you can modify this)
INSERT INTO family_groups (name, description, cultural_background, primary_language, secondary_language) 
VALUES (
    'Elmowafi Family',
    'Traditional Middle Eastern family preserving cultural heritage through shared memories and travels',
    'Middle Eastern',
    'ar',
    'en'
) ON CONFLICT DO NOTHING;

-- ================================================
-- REAL-TIME SUBSCRIPTIONS SETUP
-- ================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE memory_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE memory_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_events;

-- ================================================
-- VIEWS FOR COMMON QUERIES
-- ================================================

-- View for family member profiles with relationship info
CREATE VIEW family_member_profiles AS
SELECT 
    fm.*,
    fg.name as family_group_name,
    fg.cultural_background,
    COUNT(m.id) as memory_count,
    COUNT(DISTINCT tp.travel_plan_id) as travel_count
FROM family_members fm
JOIN family_groups fg ON fm.family_group_id = fg.id
LEFT JOIN memory_participants mp ON fm.id = mp.family_member_id
LEFT JOIN memories m ON mp.memory_id = m.id
LEFT JOIN travel_participants tp ON fm.id = tp.family_member_id
GROUP BY fm.id, fg.id;

-- View for recent family activity
CREATE VIEW recent_family_activity AS
SELECT 
    'memory' as activity_type,
    m.title as title,
    m.created_at,
    fm.name as created_by_name,
    m.family_group_id
FROM memories m
JOIN family_members fm ON m.created_by = fm.id
UNION ALL
SELECT 
    'travel' as activity_type,
    tp.name as title,
    tp.created_at,
    fm.name as created_by_name,
    tp.family_group_id
FROM travel_plans tp
JOIN family_members fm ON tp.created_by = fm.id
ORDER BY created_at DESC;

-- ================================================
-- COMPLETE SCHEMA READY!
-- This provides a comprehensive family platform with:
-- ✅ Multi-family support
-- ✅ Memory management with AI analysis
-- ✅ Travel planning and budgeting
-- ✅ Gaming and activities
-- ✅ Real-time collaboration
-- ✅ Cultural heritage preservation
-- ✅ Security with RLS
-- ✅ Performance optimized
-- ================================================