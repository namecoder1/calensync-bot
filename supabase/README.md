# Supabase Configuration for CalenSync Bot

This directory contains the Supabase database schema and configuration for the multi-user CalenSync Bot architecture.

## 🏗 Architecture Overview

### Hybrid Architecture
- **Metadata Storage**: Supabase PostgreSQL
- **Token Storage**: Redis (encrypted)
- **Authentication**: Telegram OAuth only
- **Sessions**: Redis with 24h TTL

### Security Model
- ✅ No sensitive OAuth tokens in database
- ✅ Telegram ID as primary authentication
- ✅ Row Level Security ready (disabled for API-level auth)
- ✅ Field validation and constraints

## 📊 Database Schema

### Core Tables

#### `users`
Primary user entity with Telegram authentication
- `telegram_id` (PK): Telegram user ID
- `first_name`, `last_name`, `username`: Telegram profile
- `onboarding_completed`: Setup status
- `google_connected`: OAuth status flag

#### `user_calendars`
User's selected Google Calendars (metadata only)
- Links to Google Calendar IDs
- Per-calendar preferences (enabled/disabled)
- Display names and descriptions

#### `user_telegram_groups`
Telegram groups where user added the bot
- Supports regular groups and supergroup topics
- Tracks bot addition/removal events
- Stores group metadata

#### `calendar_group_mappings`
Routes calendar events to specific groups/topics
- Many-to-many relationship
- Optional event filtering rules
- Per-mapping enable/disable

#### `reminder_logs`
Deduplication and analytics for sent reminders
- Prevents duplicate notifications
- Error tracking and analytics
- Unique constraint for deduplication

#### `user_preferences`
Global user settings
- Default reminder times
- Quiet hours configuration
- Timezone and locale settings

## 🚀 Setup Instructions

### 1. Install Supabase CLI
```bash
npm install -g @supabase/cli
```

### 2. Initialize Supabase Project
```bash
# In your project root
supabase init
```

### 3. Start Local Development
```bash
supabase start
```

### 4. Apply Schema
```bash
# Apply the initial migration
supabase db reset

# Or manually run the schema
supabase db reset --db-url "your-supabase-url"
```

### 5. Environment Variables
Add to your `.env.local`:
```env
# Supabase
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

## 🔧 Development Workflow

### Creating New Migrations
```bash
# Create a new migration file
supabase migration new add_new_feature

# Edit the generated file in supabase/migrations/
# Then apply it
supabase db reset
```

### Schema Changes
1. Edit `schema.sql` for major changes
2. Create incremental migrations for updates
3. Test locally with `supabase start`
4. Deploy with `supabase db push`

### Sample Queries

#### Get User Profile with Stats
```sql
SELECT * FROM v_user_summary WHERE telegram_id = '562953005';
```

#### Get Active Mappings for User
```sql
SELECT * FROM v_user_active_mappings WHERE telegram_id = '562953005';
```

#### Check Recent Reminders
```sql
SELECT * FROM reminder_logs 
WHERE telegram_id = '562953005' 
  AND sent_at > NOW() - INTERVAL '24 hours'
ORDER BY sent_at DESC;
```

## 🔐 Security Considerations

### Authentication Flow
1. User opens Telegram Mini App
2. Telegram provides `initData` with user info
3. Next.js verifies Telegram signature
4. User data stored/updated in Supabase
5. Session managed via Redis

### Data Protection
- **OAuth Tokens**: Encrypted in Redis, never in database
- **User Data**: Standard fields only, no sensitive info
- **API Access**: All queries server-side via Next.js API routes
- **RLS**: Ready for future client-side access if needed

### Environment Separation
- **Development**: Local Supabase instance
- **Staging**: Supabase staging project
- **Production**: Supabase production project with backups

## 📈 Scaling Considerations

### Indexes
- All foreign keys indexed
- Composite indexes for common queries
- Partial indexes for active records only

### Performance
- Views for complex queries
- Proper normalization
- Query optimization ready

### Monitoring
- Built-in analytics via `reminder_logs`
- User activity tracking via `last_active_at`
- Error logging in `reminder_logs.error_message`

## 🧪 Testing

### Sample Data
The schema includes sample data for development:
- Your existing Telegram users
- Sample calendar and group configurations
- Test mappings for verification

### Data Validation
```sql
-- Check user setup completeness
SELECT 
  telegram_id,
  onboarding_completed,
  google_connected,
  calendars_count,
  groups_count,
  mappings_count
FROM v_user_summary;
```

## 🔄 Migration from Current System

### Step 1: Export Current Data
```bash
# Export current Redis data
node scripts/export-current-data.js
```

### Step 2: Import to Supabase
```bash
# Import users and settings
node scripts/import-to-supabase.js
```

### Step 3: Update Code
- Replace hardcoded values with database queries
- Update authentication flow
- Migrate reminder dispatch logic

### Step 4: Gradual Rollout
- Deploy with feature flags
- Test with existing users
- Monitor for issues
- Full switchover

## 📝 Next Steps

After schema setup:
1. **Install Supabase client**: Add `@supabase/supabase-js`
2. **Create database lib**: `lib/supabase.ts`
3. **Update auth system**: Migrate from hardcoded to DB-driven
4. **Build onboarding flow**: Calendar selection + group setup
5. **Update reminder system**: Multi-user dispatch logic