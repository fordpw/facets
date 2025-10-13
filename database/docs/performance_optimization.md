# Healthcare Database Performance Optimization Guide

This document provides comprehensive performance optimization strategies for healthcare applications handling high volumes of claims, member, and provider data.

## Table of Contents
- [Performance Targets](#performance-targets)
- [Indexing Strategies](#indexing-strategies)
- [Partitioning Approaches](#partitioning-approaches)
- [Query Optimization](#query-optimization)
- [Memory and Storage](#memory-and-storage)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Scale-Out Strategies](#scale-out-strategies)

## Performance Targets

### Healthcare Industry Benchmarks
- **Claims Processing**: Handle 1M+ claims per day
- **Member Lookups**: Sub-second response times for member searches
- **Provider Directories**: Support 100K+ concurrent provider lookups
- **Reports**: Complex analytics queries complete within 30 seconds
- **API Responses**: 95th percentile under 200ms for standard operations
- **Concurrent Users**: Support 1000+ simultaneous users

### Database Performance Goals
- **Transaction Throughput**: 10,000+ TPS during peak hours
- **Query Response**: 95% of queries under 100ms
- **Index Maintenance**: Minimal impact on write performance
- **Backup/Recovery**: Full backup in under 4 hours, recovery in under 2 hours
- **High Availability**: 99.9% uptime (8.76 hours downtime per year)

## Indexing Strategies

### Core Entity Indexes

#### Members Table
```sql
-- Primary lookup patterns
CREATE INDEX idx_members_lookup ON members(last_name, first_name, date_of_birth);
CREATE INDEX idx_members_number_active ON members(member_number) WHERE is_active = TRUE;
CREATE INDEX idx_members_dob_gender ON members(date_of_birth, gender);

-- Geographic clustering
CREATE INDEX idx_members_geo ON members(state_code, city, zip_code);

-- Communication indexes
CREATE INDEX idx_members_email ON members(email) WHERE email IS NOT NULL;
CREATE INDEX idx_members_phone ON members(phone) WHERE phone IS NOT NULL;
```

#### Claims Table
```sql
-- Core claims processing indexes
CREATE INDEX idx_claims_processing ON claims(claim_status, received_date) 
    WHERE claim_status IN ('NEW', 'PEND', 'PROC', 'REVIEW');

-- Financial analysis indexes
CREATE INDEX idx_claims_amounts ON claims(total_paid_amount DESC) 
    WHERE total_paid_amount > 1000;

-- Date-based reporting
CREATE INDEX idx_claims_service_month ON claims(DATE_TRUNC('month', service_date_from));
CREATE INDEX idx_claims_received_week ON claims(DATE_TRUNC('week', received_date));

-- Provider-centric indexes
CREATE INDEX idx_claims_provider_status ON claims(billing_provider_id, claim_status, service_date_from);

-- Composite performance index
CREATE INDEX idx_claims_performance ON claims(health_plan_id, claim_status, service_date_from, total_paid_amount);
```

#### Providers Table  
```sql
-- Provider search indexes
CREATE INDEX idx_providers_name_specialty ON providers(last_name, first_name, primary_specialty_id);
CREATE INDEX idx_providers_npi_active ON providers(npi) WHERE is_active = TRUE;

-- Geographic provider search
CREATE INDEX idx_providers_location ON providers(state_code, city, primary_specialty_id) 
    WHERE is_active = TRUE;

-- Full-text search for provider names (PostgreSQL)
CREATE INDEX idx_providers_fulltext ON providers 
    USING gin(to_tsvector('english', first_name || ' ' || last_name));
```

### Advanced Indexing Techniques

#### Partial Indexes for Active Data
```sql
-- Only index active records to reduce index size
CREATE INDEX idx_active_enrollments ON member_enrollments(member_id, effective_date) 
    WHERE is_active = TRUE AND (termination_date IS NULL OR termination_date > CURRENT_DATE);

CREATE INDEX idx_pending_claims ON claims(received_date, claim_type) 
    WHERE claim_status IN ('NEW', 'PEND', 'PROC');
```

#### Covering Indexes
```sql
-- Include frequently accessed columns to avoid table lookups
CREATE INDEX idx_claims_summary_covering ON claims(member_id, service_date_from) 
    INCLUDE (claim_number, total_paid_amount, claim_status);

CREATE INDEX idx_member_summary_covering ON members(member_number) 
    INCLUDE (first_name, last_name, date_of_birth, email);
```

#### Expression Indexes
```sql
-- Index computed values for faster searches
CREATE INDEX idx_claims_age_days ON claims((CURRENT_DATE - received_date));
CREATE INDEX idx_members_age_years ON members((DATE_PART('year', AGE(date_of_birth))));

-- Case-insensitive searches
CREATE INDEX idx_members_name_ci ON members(UPPER(last_name), UPPER(first_name));
```

## Partitioning Approaches

### Horizontal Partitioning (PostgreSQL)

#### Claims Partitioning by Date
```sql
-- Partition claims by month for better performance
CREATE TABLE claims_partitioned (LIKE claims INCLUDING ALL);

-- Monthly partitions
CREATE TABLE claims_2024_01 PARTITION OF claims_partitioned 
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE claims_2024_02 PARTITION OF claims_partitioned 
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Automatic partition creation function
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || TO_CHAR(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
                   
    -- Create indexes on the new partition
    EXECUTE format('CREATE INDEX idx_%s_member_id ON %I(member_id)', 
                   partition_name, partition_name);
    EXECUTE format('CREATE INDEX idx_%s_provider_id ON %I(billing_provider_id)', 
                   partition_name, partition_name);
END;
$$ LANGUAGE plpgsql;
```

#### Audit Log Partitioning
```sql
-- Partition audit logs by month for compliance retention
CREATE TABLE audit_log_partitioned (LIKE audit_log INCLUDING ALL);

-- Create partitions automatically
CREATE OR REPLACE FUNCTION create_audit_partition(year INTEGER, month INTEGER)
RETURNS VOID AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    start_date := make_date(year, month, 1);
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'audit_log_' || year || '_' || LPAD(month::TEXT, 2, '0');
    
    EXECUTE format('CREATE TABLE %I PARTITION OF audit_log_partitioned 
                    FOR VALUES FROM (%L) TO (%L)',
                   partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

### Vertical Partitioning

#### Separate PHI Data
```sql
-- Split member data to isolate PHI
CREATE TABLE member_demographics (
    member_id UUID PRIMARY KEY,
    member_number VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender CHAR(1),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE member_pii (
    member_id UUID PRIMARY KEY REFERENCES member_demographics(member_id),
    ssn_encrypted BYTEA,
    address_line1 VARCHAR(100),
    address_line2 VARCHAR(100),
    city VARCHAR(50),
    state_code CHAR(2),
    zip_code VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Query Optimization

### Common Query Patterns

#### Optimized Member Lookup
```sql
-- Efficient member search with proper index usage
EXPLAIN (ANALYZE, BUFFERS) 
SELECT m.member_id, m.member_number, m.first_name, m.last_name, m.date_of_birth
FROM members m
WHERE m.last_name = 'Smith' 
  AND m.first_name LIKE 'John%'
  AND m.date_of_birth BETWEEN '1970-01-01' AND '1990-12-31'
  AND m.is_active = TRUE;
```

#### Claims Analytics Query
```sql
-- Optimized claims summary with covering index
WITH monthly_claims AS (
    SELECT 
        DATE_TRUNC('month', service_date_from) as month,
        health_plan_id,
        claim_status,
        COUNT(*) as claim_count,
        SUM(total_paid_amount) as total_paid
    FROM claims
    WHERE service_date_from >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', service_date_from), health_plan_id, claim_status
)
SELECT * FROM monthly_claims ORDER BY month DESC, total_paid DESC;
```

#### Provider Search with Geolocation
```sql
-- Efficient provider search with distance calculation
SELECT 
    p.provider_id,
    p.first_name || ' ' || p.last_name as provider_name,
    ms.specialty_name,
    p.address_line1 || ', ' || p.city || ', ' || p.state_code as address
FROM providers p
JOIN medical_specialties ms ON p.primary_specialty_id = ms.specialty_id
JOIN provider_networks pn ON p.provider_id = pn.provider_id
WHERE p.is_active = TRUE
  AND pn.is_accepting_patients = TRUE
  AND p.primary_specialty_id = 5  -- Cardiology
  AND p.state_code = 'IL'
  AND p.city = 'Chicago'
ORDER BY p.last_name, p.first_name
LIMIT 50;
```

### Query Plan Optimization

#### Analyzing Query Performance
```sql
-- Enable query plan analysis
SET enable_seqscan = OFF;  -- Force index usage for testing
SET work_mem = '256MB';    -- Increase sort/hash memory
SET shared_buffers = '1GB'; -- Increase shared buffer cache

-- Analyze query execution
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT ... FROM ... WHERE ...;
```

#### Common Optimization Techniques
```sql
-- Use CTEs for complex queries
WITH high_cost_claims AS (
    SELECT member_id, SUM(total_paid_amount) as total_cost
    FROM claims
    WHERE service_date_from >= '2024-01-01'
    GROUP BY member_id
    HAVING SUM(total_paid_amount) > 10000
)
SELECT m.member_number, m.first_name, m.last_name, hcc.total_cost
FROM high_cost_claims hcc
JOIN members m ON hcc.member_id = m.member_id
ORDER BY hcc.total_cost DESC;

-- Use window functions for rankings
SELECT 
    claim_id,
    member_id,
    total_paid_amount,
    ROW_NUMBER() OVER (PARTITION BY member_id ORDER BY total_paid_amount DESC) as cost_rank
FROM claims
WHERE service_date_from >= CURRENT_DATE - INTERVAL '1 year';
```

## Memory and Storage Configuration

### PostgreSQL Configuration
```sql
-- postgresql.conf optimizations for healthcare workloads

-- Memory settings (for 32GB RAM server)
shared_buffers = 8GB                    -- 25% of RAM
work_mem = 256MB                        -- For complex sorts/joins
maintenance_work_mem = 2GB              -- For index creation/maintenance
effective_cache_size = 24GB             -- 75% of total RAM

-- I/O settings
random_page_cost = 1.1                  -- SSD storage
seq_page_cost = 1.0
wal_buffers = 16MB
checkpoint_completion_target = 0.9

-- Query planner settings
default_statistics_target = 1000        -- Better statistics for complex queries
constraint_exclusion = partition        -- Enable partition pruning
enable_partitionwise_join = on
enable_partitionwise_aggregate = on

-- Logging for performance monitoring
log_min_duration_statement = 1000       -- Log slow queries
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
```

### Storage Optimization
```sql
-- Table storage parameters
ALTER TABLE claims SET (
    fillfactor = 85,              -- Leave room for updates
    parallel_workers = 4          -- Enable parallel query processing
);

ALTER TABLE audit_log SET (
    fillfactor = 100,            -- Insert-only table
    parallel_workers = 8
);

-- Enable compression for large tables
ALTER TABLE claim_lines SET COMPRESSION pglz;
ALTER TABLE audit_log SET COMPRESSION lz4;
```

## Monitoring and Maintenance

### Performance Monitoring Views
```sql
-- Create monitoring views for database health
CREATE VIEW v_database_performance AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    histogram_bounds
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- Index usage statistics
CREATE VIEW v_index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'Unused'
        WHEN idx_scan < 10 THEN 'Low Usage'
        WHEN idx_scan < 100 THEN 'Medium Usage'
        ELSE 'High Usage'
    END as usage_level
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Slow query monitoring
CREATE VIEW v_slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries taking more than 100ms on average
ORDER BY total_time DESC;
```

### Automated Maintenance
```sql
-- Maintenance procedures
CREATE OR REPLACE FUNCTION daily_maintenance()
RETURNS VOID AS $$
BEGIN
    -- Update table statistics
    ANALYZE;
    
    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW mv_monthly_claims_summary;
    
    -- Archive old audit logs (keep 24 months)
    PERFORM archive_old_audit_logs(24);
    
    -- Clean up old API request logs (keep 90 days)
    DELETE FROM api_requests 
    WHERE request_timestamp < CURRENT_DATE - INTERVAL '90 days';
    
    -- Update performance metrics
    INSERT INTO system_metrics (
        server_name, cpu_usage_percent, memory_usage_percent,
        active_connections, database_size_gb
    ) VALUES (
        'db-primary',
        (SELECT cpu_percent FROM pg_stat_activity LIMIT 1),
        (SELECT memory_percent FROM pg_stat_activity LIMIT 1),
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
        (SELECT pg_database_size(current_database()) / 1024 / 1024 / 1024)
    );
    
    RAISE NOTICE 'Daily maintenance completed at %', CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily maintenance
-- Add to crontab: 0 2 * * * psql -d healthcare_db -c "SELECT daily_maintenance();"
```

### Alerting Thresholds
```sql
-- Performance alerting function
CREATE OR REPLACE FUNCTION check_performance_alerts()
RETURNS TEXT AS $$
DECLARE
    alert_messages TEXT := '';
    slow_query_count INTEGER;
    large_table_size BIGINT;
    index_bloat_percent NUMERIC;
BEGIN
    -- Check for excessive slow queries
    SELECT COUNT(*) INTO slow_query_count
    FROM pg_stat_statements 
    WHERE mean_time > 1000;  -- 1 second average
    
    IF slow_query_count > 10 THEN
        alert_messages := alert_messages || 'WARNING: ' || slow_query_count || ' slow queries detected. ';
    END IF;
    
    -- Check for large table sizes
    SELECT pg_total_relation_size('claims') / 1024 / 1024 / 1024 INTO large_table_size;
    
    IF large_table_size > 100 THEN  -- 100GB threshold
        alert_messages := alert_messages || 'WARNING: Claims table size ' || large_table_size || 'GB. Consider partitioning. ';
    END IF;
    
    -- Return alerts or OK status
    IF alert_messages = '' THEN
        RETURN 'All performance metrics within normal ranges';
    ELSE
        RETURN alert_messages;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

## Scale-Out Strategies

### Read Replicas
```sql
-- Configure streaming replication for read scaling
-- On primary server:
-- wal_level = replica
-- max_wal_senders = 3
-- wal_keep_segments = 64

-- Create read-only user for replicas
CREATE ROLE readonly_user LOGIN;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- Route read queries to replicas
-- SELECT queries → read replica
-- INSERT/UPDATE/DELETE → primary
```

### Connection Pooling
```sql
-- PgBouncer configuration for connection pooling
-- pool_mode = transaction
-- max_client_conn = 1000
-- default_pool_size = 100
-- server_reset_query = DISCARD ALL;
```

### Caching Strategies
```sql
-- Application-level caching considerations
-- 1. Cache frequently accessed member data (Redis)
-- 2. Cache provider directory searches (Memcached)
-- 3. Cache complex report results (Application cache)
-- 4. Use materialized views for aggregated data

-- Example: Cache invalidation trigger
CREATE OR REPLACE FUNCTION invalidate_member_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Signal application to invalidate cache
    PERFORM pg_notify('cache_invalidation', 'member:' || NEW.member_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER member_cache_invalidation
    AFTER UPDATE OF first_name, last_name, email ON members
    FOR EACH ROW EXECUTE FUNCTION invalidate_member_cache();
```

## Performance Testing

### Load Testing Queries
```sql
-- Simulate concurrent member lookups
DO $$
DECLARE
    i INTEGER := 0;
BEGIN
    WHILE i < 1000 LOOP
        PERFORM member_id FROM members 
        WHERE member_number = 'M' || LPAD((random() * 100000)::INTEGER::TEXT, 7, '0');
        i := i + 1;
    END LOOP;
END $$;

-- Simulate claims processing load  
DO $$
DECLARE
    i INTEGER := 0;
BEGIN
    WHILE i < 10000 LOOP
        UPDATE claims 
        SET claim_status = 'PROC' 
        WHERE claim_status = 'NEW' 
        AND claim_id = (SELECT claim_id FROM claims WHERE claim_status = 'NEW' ORDER BY random() LIMIT 1);
        i := i + 1;
    END LOOP;
END $$;
```

This performance optimization guide provides a foundation for scaling healthcare applications to handle enterprise-level data volumes while maintaining sub-second response times for critical operations.