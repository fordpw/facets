-- =====================================================
-- DATABASE MIGRATION TEMPLATE
-- Use this template for all database schema changes
-- =====================================================

-- Migration: [MIGRATION_NAME]
-- Date: [DATE]
-- Author: [AUTHOR_NAME]
-- Description: [BRIEF_DESCRIPTION]

-- =====================================================
-- MIGRATION METADATA
-- =====================================================

-- Check if migration has already been applied
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM schema_migrations 
        WHERE migration_name = '[MIGRATION_NAME]'
        AND migration_status = 'COMPLETED'
    ) THEN
        RAISE EXCEPTION 'Migration [MIGRATION_NAME] has already been applied';
    END IF;
END $$;

-- Record migration start
INSERT INTO schema_migrations (
    migration_name, 
    migration_version,
    migration_description,
    migration_status,
    started_at
) VALUES (
    '[MIGRATION_NAME]',
    '[VERSION_NUMBER]', -- e.g., '001', '002', '003'
    '[BRIEF_DESCRIPTION]',
    'RUNNING',
    CURRENT_TIMESTAMP
);

-- =====================================================
-- BACKUP OPERATIONS (if modifying existing data)
-- =====================================================

-- Create backup table if modifying existing table structure
-- CREATE TABLE [table_name]_backup_[DATE] AS SELECT * FROM [table_name];

-- =====================================================
-- MIGRATION OPERATIONS
-- =====================================================

-- BEGIN TRANSACTION for rollback capability
BEGIN;

-- Example operations (replace with actual migration code):

-- 1. CREATE TABLE operations
-- CREATE TABLE new_table (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     name VARCHAR(100) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- 2. ALTER TABLE operations
-- ALTER TABLE existing_table 
--     ADD COLUMN new_column VARCHAR(50),
--     DROP COLUMN old_column,
--     ALTER COLUMN modified_column TYPE TEXT;

-- 3. CREATE INDEX operations
-- CREATE INDEX idx_new_table_name ON new_table(name);

-- 4. INSERT/UPDATE data operations
-- INSERT INTO reference_table (code, name) VALUES ('NEW', 'New Status');

-- 5. CREATE VIEW operations
-- CREATE VIEW v_new_report AS
-- SELECT ...;

-- =====================================================
-- DATA VALIDATION
-- =====================================================

-- Validate that migration completed successfully
-- Example validations:

-- Check row counts
-- DO $$
-- DECLARE
--     expected_count INTEGER := 1000;
--     actual_count INTEGER;
-- BEGIN
--     SELECT COUNT(*) INTO actual_count FROM [table_name];
--     IF actual_count < expected_count THEN
--         RAISE EXCEPTION 'Migration validation failed: Expected at least % rows, found %', 
--               expected_count, actual_count;
--     END IF;
-- END $$;

-- Check constraints
-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM information_schema.table_constraints 
--         WHERE constraint_name = '[constraint_name]'
--     ) THEN
--         RAISE EXCEPTION 'Migration validation failed: Constraint [constraint_name] not created';
--     END IF;
-- END $$;

-- Check indexes
-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM pg_indexes 
--         WHERE indexname = '[index_name]'
--     ) THEN
--         RAISE EXCEPTION 'Migration validation failed: Index [index_name] not created';
--     END IF;
-- END $$;

-- =====================================================
-- COMMIT MIGRATION
-- =====================================================

-- If we get here, migration was successful
COMMIT;

-- Update migration status
UPDATE schema_migrations 
SET 
    migration_status = 'COMPLETED',
    completed_at = CURRENT_TIMESTAMP,
    execution_time_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))
WHERE migration_name = '[MIGRATION_NAME]';

-- =====================================================
-- POST-MIGRATION OPERATIONS
-- =====================================================

-- Update table statistics for query optimizer
ANALYZE;

-- Optional: Refresh materialized views if affected
-- SELECT refresh_analytics_views();

-- =====================================================
-- ROLLBACK SCRIPT (for manual execution if needed)
-- =====================================================

/*
-- ROLLBACK SCRIPT FOR: [MIGRATION_NAME]
-- Execute this script to rollback the migration if issues are discovered

BEGIN;

-- Reverse the operations in opposite order:

-- Drop created tables
-- DROP TABLE IF EXISTS new_table;

-- Restore altered tables from backup
-- DROP TABLE IF EXISTS existing_table;
-- ALTER TABLE existing_table_backup_[DATE] RENAME TO existing_table;

-- Drop created indexes
-- DROP INDEX IF EXISTS idx_new_table_name;

-- Remove inserted data
-- DELETE FROM reference_table WHERE code = 'NEW';

-- Drop created views
-- DROP VIEW IF EXISTS v_new_report;

-- Update migration status
UPDATE schema_migrations 
SET 
    migration_status = 'ROLLED_BACK',
    rolled_back_at = CURRENT_TIMESTAMP
WHERE migration_name = '[MIGRATION_NAME]';

COMMIT;

RAISE NOTICE 'Migration [MIGRATION_NAME] has been rolled back';
*/

-- =====================================================
-- COMPLETION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration [MIGRATION_NAME] completed successfully at %', CURRENT_TIMESTAMP;
    RAISE NOTICE 'Next steps: Test the changes and monitor for issues';
END $$;