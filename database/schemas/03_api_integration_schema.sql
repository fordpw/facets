-- =====================================================
-- API INTEGRATION & SYSTEM MONITORING SCHEMA
-- For Facets API Platform product - tracks API usage,
-- integrations, rate limiting, and system health
-- =====================================================

-- =====================================================
-- API MANAGEMENT TABLES
-- =====================================================

-- API Client applications and consumers
CREATE TABLE api_clients (
    client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(200) NOT NULL,
    client_description TEXT,
    organization_name VARCHAR(200),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    client_type VARCHAR(50) NOT NULL, -- 'INTERNAL', 'PARTNER', 'VENDOR', 'CUSTOMER'
    subscription_tier VARCHAR(50) DEFAULT 'BASIC', -- 'BASIC', 'PREMIUM', 'ENTERPRISE'
    api_key_hash VARCHAR(255) NOT NULL UNIQUE, -- Hashed API key for security
    webhook_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP
);

-- API endpoints and their configurations
CREATE TABLE api_endpoints (
    endpoint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_path VARCHAR(500) NOT NULL UNIQUE,
    http_method VARCHAR(10) NOT NULL, -- 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'
    endpoint_name VARCHAR(200) NOT NULL,
    description TEXT,
    api_version VARCHAR(20) DEFAULT 'v1',
    category VARCHAR(100), -- 'CLAIMS', 'MEMBERS', 'PROVIDERS', 'ELIGIBILITY'
    requires_authentication BOOLEAN DEFAULT TRUE,
    rate_limit_per_minute INT DEFAULT 60,
    rate_limit_per_hour INT DEFAULT 1000,
    rate_limit_per_day INT DEFAULT 10000,
    is_deprecated BOOLEAN DEFAULT FALSE,
    deprecation_date DATE,
    replacement_endpoint_id UUID REFERENCES api_endpoints(endpoint_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client permissions for endpoints
CREATE TABLE api_client_permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES api_clients(client_id) ON DELETE CASCADE,
    endpoint_id UUID NOT NULL REFERENCES api_endpoints(endpoint_id) ON DELETE CASCADE,
    permission_level VARCHAR(20) DEFAULT 'READ', -- 'read', 'write', 'admin'
    custom_rate_limit_per_minute INT,
    custom_rate_limit_per_hour INT,
    custom_rate_limit_per_day INT,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(100),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(client_id, endpoint_id)
);

-- =====================================================
-- API USAGE TRACKING
-- =====================================================

-- API request logs (high volume table)
CREATE TABLE api_requests (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES api_clients(client_id),
    endpoint_id UUID NOT NULL REFERENCES api_endpoints(endpoint_id),
    request_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Request details
    http_method VARCHAR(10) NOT NULL,
    endpoint_path VARCHAR(500) NOT NULL,
    query_parameters TEXT,
    request_size_bytes INT,
    user_agent VARCHAR(500),
    client_ip VARCHAR(45), -- IPv6 compatible
    
    -- Response details
    response_status_code INT NOT NULL,
    response_size_bytes INT,
    response_time_ms INT NOT NULL,
    
    -- Error tracking
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Business context
    member_id UUID,
    provider_id UUID,
    claim_id UUID,
    
    -- Processing metadata
    processed_by_server VARCHAR(100),
    correlation_id UUID,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rate limiting tracking
CREATE TABLE api_rate_limits (
    rate_limit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES api_clients(client_id),
    endpoint_id UUID NOT NULL REFERENCES api_endpoints(endpoint_id),
    time_window_start TIMESTAMP NOT NULL,
    time_window_type VARCHAR(20) NOT NULL, -- 'MINUTE', 'HOUR', 'DAY'
    
    -- Counters
    request_count INT DEFAULT 0,
    successful_requests INT DEFAULT 0,
    failed_requests INT DEFAULT 0,
    rate_limited_requests INT DEFAULT 0,
    
    -- Limits
    rate_limit_threshold INT NOT NULL,
    
    -- Status
    is_rate_limited BOOLEAN DEFAULT FALSE,
    rate_limit_reset_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, endpoint_id, time_window_start, time_window_type)
);

-- =====================================================
-- INTEGRATION MANAGEMENT
-- =====================================================

-- External system integrations
CREATE TABLE integrations (
    integration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_name VARCHAR(200) NOT NULL,
    integration_type VARCHAR(50) NOT NULL, -- 'FACETS_API', 'EDI', 'HL7', 'DATABASE', 'WEBHOOK'
    system_name VARCHAR(200) NOT NULL, -- 'Trizetto Facets', 'Clearinghouse X', 'Provider Portal'
    
    -- Connection details
    endpoint_url VARCHAR(500),
    authentication_type VARCHAR(50), -- 'API_KEY', 'OAUTH2', 'BASIC_AUTH', 'CERTIFICATE'
    connection_timeout_seconds INT DEFAULT 30,
    retry_attempts INT DEFAULT 3,
    
    -- Health monitoring
    health_check_url VARCHAR(500),
    health_check_interval_minutes INT DEFAULT 5,
    is_healthy BOOLEAN DEFAULT TRUE,
    last_health_check TIMESTAMP,
    last_successful_connection TIMESTAMP,
    
    -- Configuration
    config_json JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Integration health monitoring
CREATE TABLE integration_health_checks (
    health_check_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integrations(integration_id),
    check_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Health status
    is_healthy BOOLEAN NOT NULL,
    response_time_ms INT,
    status_code INT,
    error_message TEXT,
    
    -- Detailed metrics
    connection_successful BOOLEAN,
    authentication_successful BOOLEAN,
    data_retrieval_successful BOOLEAN,
    
    checked_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data synchronization jobs
CREATE TABLE sync_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integrations(integration_id),
    job_name VARCHAR(200) NOT NULL,
    job_type VARCHAR(50) NOT NULL, -- 'FULL_SYNC', 'INCREMENTAL', 'REAL_TIME'
    
    -- Scheduling
    schedule_expression VARCHAR(100), -- Cron expression
    next_run_time TIMESTAMP,
    
    -- Execution details
    last_run_start TIMESTAMP,
    last_run_end TIMESTAMP,
    last_run_status VARCHAR(20), -- 'SUCCESS', 'FAILED', 'RUNNING', 'CANCELLED'
    last_run_records_processed INT,
    last_run_errors_count INT,
    last_run_error_message TEXT,
    
    -- Configuration
    source_query TEXT,
    destination_table VARCHAR(200),
    transformation_rules JSONB,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SYSTEM MONITORING
-- =====================================================

-- System performance metrics
CREATE TABLE system_metrics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    server_name VARCHAR(100) NOT NULL,
    
    -- System resources
    cpu_usage_percent DECIMAL(5,2),
    memory_usage_percent DECIMAL(5,2),
    disk_usage_percent DECIMAL(5,2),
    network_io_mbps DECIMAL(10,2),
    
    -- Database performance
    active_connections INT,
    database_size_gb DECIMAL(10,2),
    query_avg_response_time_ms DECIMAL(8,2),
    slow_queries_count INT,
    
    -- Application metrics
    active_api_requests INT,
    queue_size INT,
    cache_hit_ratio DECIMAL(5,4),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Error and exception tracking
CREATE TABLE system_errors (
    error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Error classification
    error_type VARCHAR(50) NOT NULL, -- 'API_ERROR', 'DATABASE_ERROR', 'INTEGRATION_ERROR', 'SYSTEM_ERROR'
    severity_level VARCHAR(20) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    error_code VARCHAR(50),
    error_message TEXT NOT NULL,
    
    -- Context information
    server_name VARCHAR(100),
    application_component VARCHAR(100),
    user_id VARCHAR(100),
    client_id UUID REFERENCES api_clients(client_id),
    request_id UUID,
    
    -- Technical details
    stack_trace TEXT,
    request_data TEXT,
    environment VARCHAR(20), -- 'DEV', 'TEST', 'PROD'
    
    -- Resolution tracking
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ANALYTICS VIEWS FOR MONITORING
-- =====================================================

-- API usage summary by client
CREATE VIEW v_api_usage_summary AS
SELECT 
    c.client_id,
    c.client_name,
    c.subscription_tier,
    COUNT(r.request_id) as total_requests,
    COUNT(CASE WHEN r.response_status_code < 400 THEN 1 END) as successful_requests,
    COUNT(CASE WHEN r.response_status_code >= 400 THEN 1 END) as failed_requests,
    ROUND(AVG(r.response_time_ms), 2) as avg_response_time_ms,
    MAX(r.request_timestamp) as last_request_time,
    SUM(r.request_size_bytes + r.response_size_bytes) as total_bandwidth_bytes
FROM api_clients c
LEFT JOIN api_requests r ON c.client_id = r.client_id
WHERE r.request_timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.client_id, c.client_name, c.subscription_tier
ORDER BY total_requests DESC;

-- Endpoint performance metrics
CREATE VIEW v_endpoint_performance AS
SELECT 
    e.endpoint_id,
    e.endpoint_path,
    e.category,
    COUNT(r.request_id) as total_requests,
    ROUND(AVG(r.response_time_ms), 2) as avg_response_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY r.response_time_ms) as p95_response_time_ms,
    COUNT(CASE WHEN r.response_status_code >= 400 THEN 1 END) as error_count,
    ROUND(
        COUNT(CASE WHEN r.response_status_code >= 400 THEN 1 END)::DECIMAL / 
        COUNT(r.request_id)::DECIMAL * 100, 2
    ) as error_rate_percent
FROM api_endpoints e
LEFT JOIN api_requests r ON e.endpoint_id = r.endpoint_id
WHERE r.request_timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY e.endpoint_id, e.endpoint_path, e.category
HAVING COUNT(r.request_id) > 0
ORDER BY total_requests DESC;

-- System health dashboard
CREATE VIEW v_system_health AS
SELECT 
    i.integration_name,
    i.system_name,
    i.is_healthy,
    i.last_health_check,
    i.last_successful_connection,
    CASE 
        WHEN i.last_health_check < CURRENT_TIMESTAMP - INTERVAL '10 minutes' THEN 'STALE'
        WHEN i.is_healthy THEN 'HEALTHY'
        ELSE 'UNHEALTHY'
    END as health_status,
    COUNT(hc.health_check_id) as checks_last_hour,
    AVG(hc.response_time_ms) as avg_response_time_ms
FROM integrations i
LEFT JOIN integration_health_checks hc ON i.integration_id = hc.integration_id
    AND hc.check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
GROUP BY i.integration_id, i.integration_name, i.system_name, 
         i.is_healthy, i.last_health_check, i.last_successful_connection
ORDER BY i.integration_name;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- API request indexes (critical for high volume)
CREATE INDEX idx_api_requests_timestamp ON api_requests(request_timestamp);
CREATE INDEX idx_api_requests_client_timestamp ON api_requests(client_id, request_timestamp);
CREATE INDEX idx_api_requests_endpoint_timestamp ON api_requests(endpoint_id, request_timestamp);
CREATE INDEX idx_api_requests_status_timestamp ON api_requests(response_status_code, request_timestamp);
CREATE INDEX idx_api_requests_correlation_id ON api_requests(correlation_id);

-- Rate limiting indexes
CREATE INDEX idx_rate_limits_client_endpoint ON api_rate_limits(client_id, endpoint_id);
CREATE INDEX idx_rate_limits_window ON api_rate_limits(time_window_start, time_window_type);
CREATE INDEX idx_rate_limits_active ON api_rate_limits(is_rate_limited) WHERE is_rate_limited = TRUE;

-- System monitoring indexes
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(metric_timestamp);
CREATE INDEX idx_system_metrics_server ON system_metrics(server_name, metric_timestamp);
CREATE INDEX idx_system_errors_timestamp ON system_errors(error_timestamp);
CREATE INDEX idx_system_errors_severity ON system_errors(severity_level, error_timestamp);
CREATE INDEX idx_system_errors_unresolved ON system_errors(is_resolved) WHERE is_resolved = FALSE;

-- Integration health indexes
CREATE INDEX idx_integration_health_integration ON integration_health_checks(integration_id, check_timestamp);
CREATE INDEX idx_integration_health_timestamp ON integration_health_checks(check_timestamp);

-- =====================================================
-- PARTITIONING STRATEGIES
-- =====================================================

-- Partition api_requests by month (PostgreSQL syntax)
/*
CREATE TABLE api_requests_2024_01 PARTITION OF api_requests 
FOR VALUES FROM ('2024-01-01 00:00:00') TO ('2024-02-01 00:00:00');

CREATE TABLE api_requests_2024_02 PARTITION OF api_requests 
FOR VALUES FROM ('2024-02-01 00:00:00') TO ('2024-03-01 00:00:00');

-- Add more partitions as needed
*/

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE api_clients IS 'API client applications and their configurations';
COMMENT ON TABLE api_endpoints IS 'Available API endpoints and their settings';
COMMENT ON TABLE api_requests IS 'High-volume table tracking all API requests and responses';
COMMENT ON TABLE api_rate_limits IS 'Rate limiting tracking and enforcement';
COMMENT ON TABLE integrations IS 'External system integrations configuration';
COMMENT ON TABLE integration_health_checks IS 'Health monitoring for external integrations';
COMMENT ON TABLE sync_jobs IS 'Data synchronization job definitions and status';
COMMENT ON TABLE system_metrics IS 'System performance and resource utilization metrics';
COMMENT ON TABLE system_errors IS 'Application errors and exceptions tracking';

COMMENT ON VIEW v_api_usage_summary IS 'API usage summary by client for the last 30 days';
COMMENT ON VIEW v_endpoint_performance IS 'Endpoint performance metrics for the last 7 days';
COMMENT ON VIEW v_system_health IS 'Current system and integration health status';