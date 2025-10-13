-- =====================================================
-- CREATE SCHEMA MIGRATIONS TRACKING TABLE
-- This must be the first migration - tracks all database changes
-- =====================================================

-- Migration: Create Schema Migrations Table
-- Date: 2024-10-12
-- Author: System
-- Description: Create table to track all database schema migrations

-- =====================================================
-- CREATE MIGRATIONS TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_name VARCHAR(200) NOT NULL UNIQUE,
    migration_version VARCHAR(20) NOT NULL,
    migration_description TEXT,
    migration_file_path VARCHAR(500),
    
    -- Execution tracking
    migration_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED, ROLLED_BACK
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    rolled_back_at TIMESTAMP,
    execution_time_seconds DECIMAL(10,3),
    
    -- Error handling
    error_message TEXT,
    error_details TEXT,
    
    -- Metadata
    applied_by VARCHAR(100) DEFAULT CURRENT_USER,
    environment VARCHAR(20), -- DEV, TEST, STAGING, PROD
    database_version VARCHAR(50),
    application_version VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_schema_migrations_status ON schema_migrations(migration_status);
CREATE INDEX idx_schema_migrations_version ON schema_migrations(migration_version);
CREATE INDEX idx_schema_migrations_completed ON schema_migrations(completed_at);

-- Record this migration
INSERT INTO schema_migrations (
    migration_name,
    migration_version, 
    migration_description,
    migration_status,
    started_at,
    completed_at,
    execution_time_seconds
) VALUES (
    'Create Schema Migrations Table',
    '000',
    'Initial migration to create schema_migrations tracking table',
    'COMPLETED',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0.001
);

-- =====================================================
-- UTILITY FUNCTIONS FOR MIGRATION MANAGEMENT
-- =====================================================

-- Function to get pending migrations
CREATE OR REPLACE FUNCTION get_pending_migrations()
RETURNS TABLE(
    migration_name VARCHAR(200),
    migration_version VARCHAR(20),
    migration_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT sm.migration_name, sm.migration_version, sm.migration_description
    FROM schema_migrations sm
    WHERE sm.migration_status = 'PENDING'
    ORDER BY sm.migration_version;
END;
$$ LANGUAGE plpgsql;

-- Function to get migration status summary
CREATE OR REPLACE FUNCTION get_migration_status_summary()
RETURNS TABLE(
    status VARCHAR(20),
    count BIGINT,
    avg_execution_time DECIMAL(10,3)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.migration_status,
        COUNT(*) as count,
        AVG(sm.execution_time_seconds) as avg_execution_time
    FROM schema_migrations sm
    GROUP BY sm.migration_status
    ORDER BY 
        CASE sm.migration_status
            WHEN 'PENDING' THEN 1
            WHEN 'RUNNING' THEN 2
            WHEN 'COMPLETED' THEN 3
            WHEN 'FAILED' THEN 4
            WHEN 'ROLLED_BACK' THEN 5
        END;
END;
$$ LANGUAGE plpgsql;

-- Function to mark migration as failed
CREATE OR REPLACE FUNCTION mark_migration_failed(
    p_migration_name VARCHAR(200),
    p_error_message TEXT,
    p_error_details TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE schema_migrations 
    SET 
        migration_status = 'FAILED',
        error_message = p_error_message,
        error_details = p_error_details,
        updated_at = CURRENT_TIMESTAMP
    WHERE migration_name = p_migration_name;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Migration % not found', p_migration_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to validate migration prerequisites
CREATE OR REPLACE FUNCTION validate_migration_prerequisites(
    p_required_migrations VARCHAR(200)[]
)
RETURNS BOOLEAN AS $$
DECLARE
    missing_migrations TEXT[];
    migration_name VARCHAR(200);
BEGIN
    missing_migrations := ARRAY[]::TEXT[];
    
    FOREACH migration_name IN ARRAY p_required_migrations
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM schema_migrations 
            WHERE migration_name = migration_name 
            AND migration_status = 'COMPLETED'
        ) THEN
            missing_migrations := array_append(missing_migrations, migration_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_migrations, 1) > 0 THEN
        RAISE EXCEPTION 'Missing required migrations: %', array_to_string(missing_migrations, ', ');
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION STATUS VIEW
-- =====================================================

CREATE VIEW v_migration_status AS
SELECT 
    migration_name,
    migration_version,
    migration_description,
    migration_status,
    started_at,
    completed_at,
    execution_time_seconds,
    CASE 
        WHEN migration_status = 'COMPLETED' THEN '✓'
        WHEN migration_status = 'FAILED' THEN '✗'
        WHEN migration_status = 'RUNNING' THEN '⟳'
        WHEN migration_status = 'PENDING' THEN '○'
        WHEN migration_status = 'ROLLED_BACK' THEN '↶'
        ELSE '?'
    END as status_icon,
    applied_by,
    environment
FROM schema_migrations
ORDER BY migration_version, created_at;

-- Add table comment
COMMENT ON TABLE schema_migrations IS 'Tracks all database schema migrations and their execution status';
COMMENT ON VIEW v_migration_status IS 'User-friendly view of migration status with icons';

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Schema migrations tracking system initialized successfully!';
    RAISE NOTICE 'Use SELECT * FROM v_migration_status; to view migration status';
    RAISE NOTICE 'Use SELECT * FROM get_migration_status_summary(); for summary statistics';
END $$;