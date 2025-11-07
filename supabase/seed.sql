-- Development seed data for CalenSync Bot
-- This file populates the database with sample data for development and testing

-- Clear existing data (in case of re-seeding)
TRUNCATE TABLE calendar_group_mappings CASCADE;
TRUNCATE TABLE reminder_logs CASCADE;
TRUNCATE TABLE user_telegram_groups CASCADE;
TRUNCATE TABLE user_calendars CASCADE;
TRUNCATE TABLE user_preferences CASCADE;
TRUNCATE TABLE users CASCADE;

-- Insert development users (your current authorized users)
INSERT INTO users (telegram_id, first_name, last_name, username, onboarding_completed, google_connected, google_connected_at, created_at) VALUES
    ('562953005', 'Dev', 'User', 'devuser', TRUE, TRUE, NOW() - INTERVAL '7 days', NOW() - INTERVAL '30 days'),
    ('2018538929', 'Admin', 'User', 'adminuser', TRUE, TRUE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '25 days'),
    ('123456789', 'Test', 'User', 'testuser', FALSE, FALSE, NULL, NOW() - INTERVAL '1 day');

-- Insert user preferences
INSERT INTO user_preferences (telegram_id, default_reminder_minutes, timezone, language, auto_dispatch_enabled) VALUES 
    ('562953005', ARRAY[15, 60], 'Europe/Rome', 'it', TRUE),
    ('2018538929', ARRAY[10, 30, 60], 'Europe/Rome', 'it', TRUE),
    ('123456789', ARRAY[15], 'UTC', 'en', TRUE);

-- Insert user calendars (based on your current setup)
INSERT INTO user_calendars (telegram_id, calendar_id, calendar_name, calendar_description, is_enabled, reminder_enabled) VALUES
    -- Dev user calendars
    ('562953005', 'bartolomei.private@gmail.com', 'Calendario Generale', 'Calendario principale per eventi generali', TRUE, TRUE),
    ('562953005', 'rdb.calendar@gmail.com', 'RdB Calendar', 'Calendario per eventi RdB', TRUE, TRUE),
    ('562953005', 'rdc.calendar@gmail.com', 'RdC Calendar', 'Calendario per eventi RdC', TRUE, TRUE),
    
    -- Admin user calendars
    ('2018538929', 'admin.personal@gmail.com', 'Personal', 'Calendario personale amministratore', TRUE, TRUE),
    ('2018538929', 'admin.work@gmail.com', 'Work Calendar', 'Calendario lavorativo', TRUE, TRUE),
    
    -- Test user (incomplete setup)
    ('123456789', 'test.calendar@gmail.com', 'Test Calendar', 'Calendario di test', FALSE, FALSE);

-- Insert Telegram groups (based on your current group structure)
INSERT INTO user_telegram_groups (telegram_id, group_chat_id, group_title, group_type, topic_id, topic_name, is_active, bot_added_at) VALUES
    -- Dev user groups (your current setup)
    ('562953005', '-1003103698103', 'CalenSync Main Group', 'supergroup', NULL, NULL, TRUE, NOW() - INTERVAL '20 days'),
    ('562953005', '-1003103698103', 'RdB Topic', 'supergroup', 2, 'RdB', TRUE, NOW() - INTERVAL '20 days'),
    ('562953005', '-1003103698103', 'RdC Topic', 'supergroup', 3, 'RdC', TRUE, NOW() - INTERVAL '20 days'),
    
    -- Admin user groups
    ('2018538929', '-1003103698103', 'CalenSync Main Group', 'supergroup', NULL, NULL, TRUE, NOW() - INTERVAL '18 days'),
    ('2018538929', '-1001234567890', 'Admin Private Group', 'group', NULL, NULL, TRUE, NOW() - INTERVAL '15 days'),
    
    -- Test user (no groups yet)
    ('123456789', '-1009876543210', 'Test Group', 'group', NULL, NULL, FALSE, NULL);

-- Insert calendar-group mappings (your current logic)
INSERT INTO calendar_group_mappings (telegram_id, user_calendar_id, user_telegram_group_id, is_active) VALUES
    -- Dev user mappings
    (
        '562953005', 
        (SELECT id FROM user_calendars WHERE telegram_id = '562953005' AND calendar_name = 'Calendario Generale'),
        (SELECT id FROM user_telegram_groups WHERE telegram_id = '562953005' AND group_chat_id = '-1003103698103' AND topic_id IS NULL),
        TRUE
    ),
    (
        '562953005', 
        (SELECT id FROM user_calendars WHERE telegram_id = '562953005' AND calendar_name = 'RdB Calendar'),
        (SELECT id FROM user_telegram_groups WHERE telegram_id = '562953005' AND topic_id = 2),
        TRUE
    ),
    (
        '562953005', 
        (SELECT id FROM user_calendars WHERE telegram_id = '562953005' AND calendar_name = 'RdC Calendar'),
        (SELECT id FROM user_telegram_groups WHERE telegram_id = '562953005' AND topic_id = 3),
        TRUE
    ),
    
    -- Admin user mappings
    (
        '2018538929', 
        (SELECT id FROM user_calendars WHERE telegram_id = '2018538929' AND calendar_name = 'Personal'),
        (SELECT id FROM user_telegram_groups WHERE telegram_id = '2018538929' AND group_chat_id = '-1001234567890'),
        TRUE
    );

-- Insert sample reminder logs (for testing deduplication and analytics)
INSERT INTO reminder_logs (telegram_id, event_id, calendar_id, event_title, event_start_time, reminder_minutes, reminder_due_at, group_chat_id, topic_id, message_id, status, sent_at) VALUES
    ('562953005', 'event_123_test', 'bartolomei.private@gmail.com', 'Test Meeting', NOW() + INTERVAL '1 hour', 15, NOW() + INTERVAL '45 minutes', '-1003103698103', NULL, 12345, 'sent', NOW() - INTERVAL '15 minutes'),
    ('562953005', 'event_456_rdb', 'rdb.calendar@gmail.com', '[RdB] Team Standup', NOW() + INTERVAL '2 hours', 30, NOW() + INTERVAL '1.5 hours', '-1003103698103', 2, 12346, 'sent', NOW() - INTERVAL '30 minutes'),
    ('562953005', 'event_789_rdc', 'rdc.calendar@gmail.com', '[RdC] Project Review', NOW() + INTERVAL '3 hours', 60, NOW() + INTERVAL '2 hours', '-1003103698103', 3, 12347, 'sent', NOW() - INTERVAL '1 hour'),
    
    -- Failed reminder example
    ('562953005', 'event_999_failed', 'bartolomei.private@gmail.com', 'Failed Event', NOW() + INTERVAL '30 minutes', 15, NOW() + INTERVAL '15 minutes', '-1003103698103', NULL, NULL, 'failed', NOW() - INTERVAL '5 minutes');

-- Update last_active_at for active users
UPDATE users SET last_active_at = NOW() WHERE telegram_id IN ('562953005', '2018538929');

-- Create some analytics queries for development
-- These can be used to test the dashboard and analytics features

-- Most active user
-- SELECT telegram_id, COUNT(*) as reminder_count 
-- FROM reminder_logs 
-- WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '30 days'
-- GROUP BY telegram_id 
-- ORDER BY reminder_count DESC;

-- Calendar usage stats
-- SELECT c.calendar_name, COUNT(rl.*) as reminders_sent
-- FROM user_calendars c
-- LEFT JOIN reminder_logs rl ON rl.calendar_id = c.calendar_id AND rl.status = 'sent'
-- GROUP BY c.calendar_name
-- ORDER BY reminders_sent DESC;

-- Group activity
-- SELECT g.group_title, COUNT(rl.*) as messages_sent
-- FROM user_telegram_groups g
-- LEFT JOIN reminder_logs rl ON rl.group_chat_id = g.group_chat_id AND rl.topic_id IS NOT DISTINCT FROM g.topic_id
-- GROUP BY g.group_title
-- ORDER BY messages_sent DESC;