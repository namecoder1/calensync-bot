-- Migration for adding analytics tables and functions
-- Created: 2025-11-04
-- Description: Adds analytics and reporting capabilities

-- ================================================
-- ANALYTICS TABLES
-- ================================================

-- User activity analytics
CREATE TABLE user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id TEXT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    
    -- Activity metrics
    date DATE NOT NULL,
    reminders_sent INTEGER DEFAULT 0,
    reminders_failed INTEGER DEFAULT 0,
    calendars_synced INTEGER DEFAULT 0,
    groups_active INTEGER DEFAULT 0,
    
    -- Engagement metrics
    manual_dispatches INTEGER DEFAULT 0,
    app_opens INTEGER DEFAULT 0,
    settings_changed INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(telegram_id, date)
);

CREATE INDEX idx_user_analytics_telegram_id_date ON user_analytics(telegram_id, date);
CREATE INDEX idx_user_analytics_date ON user_analytics(date);

-- System-wide analytics
CREATE TABLE system_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- System metrics
    date DATE NOT NULL UNIQUE,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    
    -- Feature usage
    total_reminders_sent INTEGER DEFAULT 0,
    total_calendars_connected INTEGER DEFAULT 0,
    total_groups_connected INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_response_time_ms NUMERIC(10,2),
    error_rate_percent NUMERIC(5,2),
    uptime_percent NUMERIC(5,2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_system_analytics_date ON system_analytics(date);

-- ================================================
-- ANALYTICS FUNCTIONS
-- ================================================

-- Function to update user daily analytics
CREATE OR REPLACE FUNCTION update_user_analytics(user_telegram_id TEXT, analytics_date DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_analytics (telegram_id, date, reminders_sent, reminders_failed, groups_active)
    SELECT 
        user_telegram_id,
        analytics_date,
        COUNT(*) FILTER (WHERE status = 'sent') as reminders_sent,
        COUNT(*) FILTER (WHERE status = 'failed') as reminders_failed,
        COUNT(DISTINCT group_chat_id) as groups_active
    FROM reminder_logs 
    WHERE telegram_id = user_telegram_id 
      AND sent_at::date = analytics_date
    ON CONFLICT (telegram_id, date) 
    DO UPDATE SET
        reminders_sent = EXCLUDED.reminders_sent,
        reminders_failed = EXCLUDED.reminders_failed,
        groups_active = EXCLUDED.groups_active,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update system daily analytics
CREATE OR REPLACE FUNCTION update_system_analytics(analytics_date DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO system_analytics (
        date, 
        total_users, 
        active_users, 
        new_users, 
        total_reminders_sent,
        total_calendars_connected,
        total_groups_connected
    )
    SELECT 
        analytics_date,
        (SELECT COUNT(*) FROM users WHERE created_at::date <= analytics_date),
        (SELECT COUNT(*) FROM users WHERE last_active_at::date = analytics_date),
        (SELECT COUNT(*) FROM users WHERE created_at::date = analytics_date),
        (SELECT COUNT(*) FROM reminder_logs WHERE sent_at::date = analytics_date AND status = 'sent'),
        (SELECT COUNT(*) FROM user_calendars WHERE created_at::date <= analytics_date AND is_enabled = TRUE),
        (SELECT COUNT(*) FROM user_telegram_groups WHERE created_at::date <= analytics_date AND is_active = TRUE)
    ON CONFLICT (date)
    DO UPDATE SET
        total_users = EXCLUDED.total_users,
        active_users = EXCLUDED.active_users,
        new_users = EXCLUDED.new_users,
        total_reminders_sent = EXCLUDED.total_reminders_sent,
        total_calendars_connected = EXCLUDED.total_calendars_connected,
        total_groups_connected = EXCLUDED.total_groups_connected,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- ANALYTICS VIEWS
-- ================================================

-- Weekly user activity view
CREATE VIEW v_weekly_user_activity AS
SELECT 
    telegram_id,
    DATE_TRUNC('week', date) as week_start,
    SUM(reminders_sent) as weekly_reminders_sent,
    SUM(reminders_failed) as weekly_reminders_failed,
    SUM(manual_dispatches) as weekly_manual_dispatches,
    SUM(app_opens) as weekly_app_opens,
    AVG(groups_active) as avg_groups_active
FROM user_analytics
WHERE date >= CURRENT_DATE - INTERVAL '8 weeks'
GROUP BY telegram_id, DATE_TRUNC('week', date)
ORDER BY telegram_id, week_start DESC;

-- Monthly system trends
CREATE VIEW v_monthly_system_trends AS
SELECT 
    DATE_TRUNC('month', date) as month_start,
    MAX(total_users) as end_of_month_users,
    SUM(new_users) as monthly_new_users,
    SUM(total_reminders_sent) as monthly_reminders_sent,
    AVG(active_users) as avg_daily_active_users,
    AVG(uptime_percent) as avg_uptime_percent
FROM system_analytics
WHERE date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', date)
ORDER BY month_start DESC;

-- Most active users view
CREATE VIEW v_top_users_30d AS
SELECT 
    u.telegram_id,
    u.first_name,
    u.username,
    SUM(ua.reminders_sent) as total_reminders_30d,
    SUM(ua.manual_dispatches) as total_manual_dispatches_30d,
    COUNT(DISTINCT ua.date) as active_days_30d,
    u.last_active_at
FROM users u
LEFT JOIN user_analytics ua ON ua.telegram_id = u.telegram_id 
    AND ua.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.telegram_id, u.first_name, u.username, u.last_active_at
ORDER BY total_reminders_30d DESC NULLS LAST;

-- ================================================
-- TRIGGERS FOR AUTOMATIC ANALYTICS
-- ================================================

-- Trigger to update analytics when reminders are logged
CREATE OR REPLACE FUNCTION trigger_update_user_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics for the day when a reminder is sent
    PERFORM update_user_analytics(NEW.telegram_id, NEW.sent_at::date);
    PERFORM update_system_analytics(NEW.sent_at::date);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reminder_logs_analytics_trigger
    AFTER INSERT ON reminder_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_user_analytics();

-- Trigger to update analytics when users are active
CREATE OR REPLACE FUNCTION trigger_update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user activity when last_active_at is updated
    IF OLD.last_active_at IS DISTINCT FROM NEW.last_active_at THEN
        PERFORM update_system_analytics(NEW.last_active_at::date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_activity_analytics_trigger
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_user_activity();

-- ================================================
-- ANALYTICS CLEANUP
-- ================================================

-- Function to clean old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_analytics WHERE date < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM system_analytics WHERE date < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to analytics tables
CREATE TRIGGER update_user_analytics_updated_at 
    BEFORE UPDATE ON user_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_analytics_updated_at 
    BEFORE UPDATE ON system_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();