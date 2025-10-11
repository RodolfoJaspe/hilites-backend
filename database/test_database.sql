-- Database Test Script
-- This script tests the database setup and verifies all components are working

-- Test 1: Verify all tables exist
\echo 'Testing table existence...'
SELECT 
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ All tables exist'
        ELSE '❌ Missing tables: ' || (4 - COUNT(*))::text
    END as table_test
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('matches', 'competitions', 'match_highlights', 'ai_processing_logs');

-- Test 2: Verify foreign key constraints
\echo 'Testing foreign key constraints...'
SELECT 
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ Foreign key constraints exist'
        ELSE '❌ Missing foreign key constraints: ' || (3 - COUNT(*))::text
    END as fk_test
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
AND table_name IN ('matches', 'match_highlights', 'ai_processing_logs');

-- Test 3: Verify indexes exist
\echo 'Testing indexes...'
SELECT 
    CASE 
        WHEN COUNT(*) >= 10 THEN '✅ Sufficient indexes exist'
        ELSE '❌ Missing indexes: ' || (10 - COUNT(*))::text
    END as index_test
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('matches', 'competitions', 'match_highlights', 'ai_processing_logs');

-- Test 4: Verify RLS is enabled
\echo 'Testing Row Level Security...'
SELECT 
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ RLS enabled on all tables'
        ELSE '❌ RLS not enabled on all tables: ' || (4 - COUNT(*))::text
    END as rls_test
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN ('matches', 'competitions', 'match_highlights', 'ai_processing_logs')
AND c.relrowsecurity = true;

-- Test 5: Verify functions exist
\echo 'Testing utility functions...'
SELECT 
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ Utility functions exist'
        ELSE '❌ Missing functions: ' || (4 - COUNT(*))::text
    END as function_test
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('update_updated_at_column', 'get_best_highlight_for_match', 'get_match_stats', 'cleanup_old_processing_logs');

-- Test 6: Verify views exist
\echo 'Testing public views...'
SELECT 
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ Public views exist'
        ELSE '❌ Missing views: ' || (2 - COUNT(*))::text
    END as view_test
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('public_matches', 'public_match_highlights');

-- Test 7: Test data insertion (if competitions are seeded)
\echo 'Testing data insertion...'
INSERT INTO competitions (id, name, type, country, is_active) 
VALUES ('TEST', 'Test Competition', 'league', 'Test Country', true)
ON CONFLICT (id) DO NOTHING;

SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM competitions WHERE id = 'TEST') THEN '✅ Data insertion works'
        ELSE '❌ Data insertion failed'
    END as insertion_test;

-- Clean up test data
DELETE FROM competitions WHERE id = 'TEST';

-- Test 8: Test trigger functionality
\echo 'Testing trigger functionality...'
-- This will be tested when we have actual data

-- Test 9: Verify column constraints
\echo 'Testing column constraints...'
SELECT 
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ Column constraints exist'
        ELSE '❌ Missing constraints: ' || (5 - COUNT(*))::text
    END as constraint_test
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public';

-- Test 10: Overall database health
\echo 'Testing overall database health...'
SELECT 
    'Database Health Check Complete' as status,
    NOW() as checked_at,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as total_functions,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes;

\echo 'Database test completed!'




