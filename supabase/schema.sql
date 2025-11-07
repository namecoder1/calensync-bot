-- ================================================
-- CALENSYNC BOT - SUPABASE DATABASE SCHEMA
-- ================================================
-- Hybrid Architecture: Metadata in Supabase, Tokens in Redis
-- Auth: Telegram-only (no Supabase Auth)
-- ================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- USERS TABLE
-- ================================================
-- Primary user entity, telegram_id as primary key
CREATE TABLE users (
    telegram_id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    language_code TEXT DEFAULT 'en',
    
    -- Onboarding & Status
    onboarding_completed BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- OAuth Status (metadata only, tokens in Redis)
    google_connected BOOLEAN DEFAULT FALSE,
    google_connected_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_active_at ON users(last_active_at);
CREATE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;

-- ================================================
-- USER CALENDARS
-- ================================================
-- Stores user's selected Google Calendars (metadata only)
CREATE TABLE user_calendars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id TEXT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    
    -- Google Calendar Info
    calendar_id TEXT NOT NULL, -- Google Calendar ID
    calendar_name TEXT NOT NULL, -- Display name
    calendar_description TEXT,
    
    -- User Preferences
    is_enabled BOOLEAN DEFAULT TRUE,
    reminder_enabled BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique calendar per user
    UNIQUE(telegram_id, calendar_id)
);

-- Add indexes
CREATE INDEX idx_user_calendars_telegram_id ON user_calendars(telegram_id);
CREATE INDEX idx_user_calendars_enabled ON user_calendars(telegram_id, is_enabled) WHERE is_enabled = TRUE;

-- ================================================
-- TELEGRAM GROUPS
-- ================================================
-- Stores Telegram groups/chats where user added the bot
CREATE TABLE user_telegram_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id TEXT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    
    -- Telegram Group Info
    group_chat_id TEXT NOT NULL, -- Telegram Chat ID (can be negative for groups)
    group_title TEXT,
    group_type TEXT CHECK (group_type IN ('private', 'group', 'supergroup', 'channel')),
    
    -- Topic Info (for supergroups with topics)
    topic_id INTEGER, -- Message thread ID for topics
    topic_name TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    bot_added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    bot_removed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique group+topic per user
    UNIQUE(telegram_id, group_chat_id, topic_id)
);

-- Add indexes
CREATE INDEX idx_user_telegram_groups_telegram_id ON user_telegram_groups(telegram_id);
CREATE INDEX idx_user_telegram_groups_active ON user_telegram_groups(telegram_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_telegram_groups_chat_id ON user_telegram_groups(group_chat_id);

-- ================================================
-- CALENDAR-GROUP MAPPINGS
-- ================================================
-- Maps which calendars send reminders to which groups/topics
CREATE TABLE calendar_group_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id TEXT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    user_calendar_id UUID NOT NULL REFERENCES user_calendars(id) ON DELETE CASCADE,
    user_telegram_group_id UUID NOT NULL REFERENCES user_telegram_groups(id) ON DELETE CASCADE,
    
    -- Mapping Rules (optional filters)
    event_title_contains TEXT[], -- If event title contains any of these
    event_description_contains TEXT[], -- If event description contains any of these
    calendar_specific_only BOOLEAN DEFAULT FALSE, -- Only events from specific calendar
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique mapping
    UNIQUE(user_calendar_id, user_telegram_group_id)
);

-- Add indexes
CREATE INDEX idx_calendar_group_mappings_telegram_id ON calendar_group_mappings(telegram_id);
CREATE INDEX idx_calendar_group_mappings_calendar_id ON calendar_group_mappings(user_calendar_id);
CREATE INDEX idx_calendar_group_mappings_group_id ON calendar_group_mappings(user_telegram_group_id);
CREATE INDEX idx_calendar_group_mappings_active ON calendar_group_mappings(telegram_id, is_active) WHERE is_active = TRUE;

-- ================================================
-- REMINDER LOGS
-- ================================================
-- Tracks sent reminders for deduplication and analytics
CREATE TABLE reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id TEXT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    
    -- Event Info
    event_id TEXT NOT NULL, -- Google Calendar Event ID
    calendar_id TEXT NOT NULL,
    event_title TEXT,
    event_start_time TIMESTAMP WITH TIME ZONE,
    
    -- Reminder Info
    reminder_minutes INTEGER NOT NULL, -- Minutes before event
    reminder_due_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When reminder was due
    
    -- Delivery Info
    group_chat_id TEXT NOT NULL,
    topic_id INTEGER, -- NULL for regular groups
    message_id INTEGER, -- Telegram message ID if sent successfully
    
    -- Status
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')) DEFAULT 'sent',
    error_message TEXT, -- If status = 'failed'
    
    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Deduplication key
    UNIQUE(telegram_id, event_id, reminder_minutes, reminder_due_at)
);

-- Add indexes for performance and deduplication
CREATE INDEX idx_reminder_logs_telegram_id ON reminder_logs(telegram_id);
CREATE INDEX idx_reminder_logs_event_id ON reminder_logs(event_id);
CREATE INDEX idx_reminder_logs_due_at ON reminder_logs(reminder_due_at);
CREATE INDEX idx_reminder_logs_dedup ON reminder_logs(telegram_id, event_id, reminder_minutes);

-- ================================================
-- USER PREFERENCES
-- ================================================
-- Global user settings and preferences
CREATE TABLE user_preferences (
    telegram_id TEXT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
    
    -- Notification Settings
    default_reminder_minutes INTEGER[] DEFAULT ARRAY[15, 60], -- Default reminder times
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME, -- e.g., '22:00'
    quiet_hours_end TIME, -- e.g., '08:00'
    timezone TEXT DEFAULT 'UTC', -- User timezone
    
    -- Language & Format
    language TEXT DEFAULT 'it',
    date_format TEXT DEFAULT 'DD/MM/YYYY',
    time_format TEXT DEFAULT '24h',
    
    -- Feature Flags
    auto_dispatch_enabled BOOLEAN DEFAULT TRUE,
    manual_dispatch_enabled BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_calendars_updated_at 
    BEFORE UPDATE ON user_calendars 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_telegram_groups_updated_at 
    BEFORE UPDATE ON user_telegram_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_group_mappings_updated_at 
    BEFORE UPDATE ON calendar_group_mappings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================
-- Note: Since we're not using Supabase Auth, we'll implement 
-- security at the API level, but these are ready if needed

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_telegram_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_group_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies (will be enforced when we add RLS context)
-- For now, they're permissive since we handle auth in Next.js

CREATE POLICY "Users can access own data" ON users 
    FOR ALL USING (TRUE); -- Will be: auth.jwt() ->> 'telegram_id' = telegram_id

CREATE POLICY "Users can access own calendars" ON user_calendars 
    FOR ALL USING (TRUE); -- Will be: auth.jwt() ->> 'telegram_id' = telegram_id

CREATE POLICY "Users can access own groups" ON user_telegram_groups 
    FOR ALL USING (TRUE); -- Will be: auth.jwt() ->> 'telegram_id' = telegram_id

CREATE POLICY "Users can access own mappings" ON calendar_group_mappings 
    FOR ALL USING (TRUE); -- Will be: auth.jwt() ->> 'telegram_id' = telegram_id

CREATE POLICY "Users can access own reminder logs" ON reminder_logs 
    FOR ALL USING (TRUE); -- Will be: auth.jwt() ->> 'telegram_id' = telegram_id

CREATE POLICY "Users can access own preferences" ON user_preferences 
    FOR ALL USING (TRUE); -- Will be: auth.jwt() ->> 'telegram_id' = telegram_id

-- ================================================
-- SAMPLE DATA (Development)
-- ================================================
-- Insert your current users as initial data
INSERT INTO users (telegram_id, first_name, username, onboarding_completed, google_connected, google_connected_at) VALUES
    ('562953005', 'Dev', 'devuser', TRUE, TRUE, NOW()),
    ('2018538929', 'Admin', 'adminuser', TRUE, TRUE, NOW());

-- Insert default preferences for existing users
INSERT INTO user_preferences (telegram_id) VALUES 
    ('562953005'),
    ('2018538929');

-- Sample calendar data (adjust based on your current setup)
INSERT INTO user_calendars (telegram_id, calendar_id, calendar_name) VALUES
    ('562953005', 'bartolomei.private@gmail.com', 'Generale'),
    ('562953005', 'rdb-calendar@gmail.com', 'RdB'),
    ('562953005', 'rdc-calendar@gmail.com', 'RdC');

-- Sample group data (adjust with your current group ID)
INSERT INTO user_telegram_groups (telegram_id, group_chat_id, group_title, group_type, topic_id, topic_name) VALUES
    ('562953005', '-1003103698103', 'CalenSync Group', 'supergroup', NULL, NULL),
    ('562953005', '-1003103698103', 'RdB Topic', 'supergroup', 2, 'RdB'),
    ('562953005', '-1003103698103', 'RdC Topic', 'supergroup', 3, 'RdC');

-- ================================================
-- VIEWS FOR COMMON QUERIES
-- ================================================

-- View for active user calendar mappings
CREATE VIEW v_user_active_mappings AS
SELECT 
    m.telegram_id,
    m.id as mapping_id,
    c.calendar_id,
    c.calendar_name,
    g.group_chat_id,
    g.topic_id,
    g.topic_name,
    g.group_title
FROM calendar_group_mappings m
JOIN user_calendars c ON c.id = m.user_calendar_id
JOIN user_telegram_groups g ON g.id = m.user_telegram_group_id
WHERE m.is_active = TRUE 
  AND c.is_enabled = TRUE 
  AND g.is_active = TRUE;

-- View for user summary
CREATE VIEW v_user_summary AS
SELECT 
    u.telegram_id,
    u.first_name,
    u.last_name,
    u.username,
    u.onboarding_completed,
    u.google_connected,
    u.last_active_at,
    COUNT(DISTINCT c.id) as calendars_count,
    COUNT(DISTINCT g.id) as groups_count,
    COUNT(DISTINCT m.id) as mappings_count
FROM users u
LEFT JOIN user_calendars c ON c.telegram_id = u.telegram_id AND c.is_enabled = TRUE
LEFT JOIN user_telegram_groups g ON g.telegram_id = u.telegram_id AND g.is_active = TRUE
LEFT JOIN calendar_group_mappings m ON m.telegram_id = u.telegram_id AND m.is_active = TRUE
GROUP BY u.telegram_id, u.first_name, u.last_name, u.username, 
         u.onboarding_completed, u.google_connected, u.last_active_at;

-- ================================================
-- COMMENTS & DOCUMENTATION
-- ================================================

COMMENT ON TABLE users IS 'Primary user table with Telegram ID as PK. No passwords - auth via Telegram only.';
COMMENT ON TABLE user_calendars IS 'Google Calendar metadata per user. OAuth tokens stored separately in Redis.';
COMMENT ON TABLE user_telegram_groups IS 'Telegram groups/topics where user added the bot.';
COMMENT ON TABLE calendar_group_mappings IS 'Maps calendars to groups for reminder routing.';
COMMENT ON TABLE reminder_logs IS 'Tracks sent reminders for deduplication and analytics.';
COMMENT ON TABLE user_preferences IS 'User settings and preferences.';

COMMENT ON COLUMN users.telegram_id IS 'Telegram user ID - primary key and auth identifier';
COMMENT ON COLUMN user_calendars.calendar_id IS 'Google Calendar ID (email or internal ID)';
COMMENT ON COLUMN user_telegram_groups.group_chat_id IS 'Telegram chat ID (negative for groups)';
COMMENT ON COLUMN user_telegram_groups.topic_id IS 'Message thread ID for supergroup topics';
COMMENT ON COLUMN reminder_logs.reminder_minutes IS 'Minutes before event when reminder is due';