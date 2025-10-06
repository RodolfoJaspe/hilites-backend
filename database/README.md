# Hilites Database Setup Guide

This directory contains all database-related files for the Hilites app, including migrations, seed data, and utility scripts.

## 📁 Directory Structure

```
database/
├── migrations/           # SQL migration files
│   ├── 001_create_matches_table.sql
│   ├── 002_create_competitions_table.sql
│   ├── 003_create_match_highlights_table.sql
│   ├── 004_create_ai_processing_logs_table.sql
│   ├── 005_create_foreign_key_constraints.sql
│   ├── 006_create_triggers_and_functions.sql
│   └── 007_create_rls_policies.sql
├── seeds/               # Seed data files
│   ├── seed_competitions.sql
│   └── seed_sample_matches.sql
├── scripts/             # Utility scripts
│   ├── backup_database.sql
│   ├── restore_database.sql
│   └── cleanup_old_data.sql
├── run_migrations.sql   # Migration runner
└── README.md           # This file
```

## 🚀 Quick Start

### 1. Backup Your Current Database

Before running any migrations, create a backup of your current database:

```sql
-- Run this in Supabase SQL editor
SELECT * FROM teams LIMIT 10; -- Verify current data
```

### 2. Run Migrations

Execute the migrations in order:

```sql
-- Option 1: Run all migrations at once
\i run_migrations.sql

-- Option 2: Run migrations individually
\i migrations/001_create_matches_table.sql
\i migrations/002_create_competitions_table.sql
-- ... continue with other migrations
```

### 3. Seed Initial Data

Populate the database with initial data:

```sql
\i seeds/seed_competitions.sql
```

## 📊 Database Schema Overview

### Core Tables

#### `matches`

Stores match data from external APIs

- **Primary Key**: `id` (UUID)
- **External Reference**: `external_id` (TEXT)
- **Relationships**: Links to `teams` and `competitions`
- **Key Fields**: `match_date`, `status`, `home_score`, `away_score`

#### `competitions`

Stores competition/league information

- **Primary Key**: `id` (TEXT) - e.g., 'PL', 'UCL'
- **Key Fields**: `name`, `type`, `country`, `is_active`

#### `match_highlights`

Stores AI-discovered video highlights

- **Primary Key**: `id` (UUID)
- **Relationships**: Links to `matches`
- **Key Fields**: `youtube_url`, `quality_score`, `relevance_score`

#### `ai_processing_logs`

Tracks AI processing activities

- **Primary Key**: `id` (UUID)
- **Relationships**: Links to `matches`
- **Key Fields**: `processing_type`, `status`, `processing_time_ms`

### Views

#### `public_matches`

Public view of match data with team and competition information

- Combines `matches`, `teams`, and `competitions` tables
- Safe for public access

#### `public_match_highlights`

Public view of available highlights

- Filters out unavailable videos
- Safe for public access

## 🔧 Utility Functions

### `get_best_highlight_for_match(match_uuid)`

Returns the best highlight video for a given match based on quality and relevance scores.

### `get_match_stats(match_uuid)`

Returns comprehensive statistics for a match including highlight counts and scores.

### `cleanup_old_processing_logs(days_to_keep)`

Cleans up old AI processing logs to keep the database optimized.

## 🛡️ Security Features

### Row Level Security (RLS)

- **Public Data**: Matches, competitions, and highlights are publicly readable
- **Authenticated Users**: Can insert/update data
- **Admins Only**: Can delete data

### Data Validation

- Check constraints on scores, dates, and status fields
- Foreign key constraints ensure data integrity
- Unique constraints prevent duplicate data

## 📈 Performance Optimizations

### Indexes

- Primary key indexes on all tables
- Foreign key indexes for joins
- Composite indexes for common queries
- Score-based indexes for sorting

### Triggers

- Automatic `updated_at` timestamp updates
- Data validation triggers
- Audit trail triggers

## 🔄 Migration Strategy

### Safe Migration Process

1. **Backup**: Always backup before migrations
2. **Test**: Run migrations on a test database first
3. **Rollback**: Keep rollback scripts ready
4. **Monitor**: Watch for errors during migration

### Rollback Scripts

If you need to rollback:

```sql
-- Rollback script (run in reverse order)
DROP TABLE IF EXISTS ai_processing_logs CASCADE;
DROP TABLE IF EXISTS match_highlights CASCADE;
DROP TABLE IF EXISTS competitions CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
```

## 🧪 Testing the Database

### Verify Tables Exist

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('matches', 'competitions', 'match_highlights', 'ai_processing_logs');
```

### Test Relationships

```sql
-- Test foreign key relationships
SELECT m.id, m.competition_name, c.name as competition_display_name
FROM matches m
LEFT JOIN competitions c ON m.competition_id = c.id
LIMIT 5;
```

### Test Functions

```sql
-- Test utility functions
SELECT * FROM get_match_stats('your-match-uuid-here');
```

## 📝 Maintenance

### Regular Cleanup

```sql
-- Clean up old processing logs (keep last 30 days)
SELECT cleanup_old_processing_logs(30);
```

### Monitor Performance

```sql
-- Check table sizes
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename;
```

## 🚨 Troubleshooting

### Common Issues

#### Migration Fails

- Check if tables already exist
- Verify foreign key constraints
- Check for data type mismatches

#### RLS Policy Issues

- Verify user authentication
- Check policy conditions
- Test with different user roles

#### Performance Issues

- Check index usage
- Analyze query plans
- Monitor table sizes

### Getting Help

- Check Supabase logs for detailed error messages
- Verify all dependencies are met
- Test migrations on a fresh database

## 🔮 Future Enhancements

### Planned Additions

- Player statistics table
- User interaction tracking
- Advanced analytics views
- Real-time data synchronization

### Performance Improvements

- Partitioning for large tables
- Materialized views for complex queries
- Advanced caching strategies
