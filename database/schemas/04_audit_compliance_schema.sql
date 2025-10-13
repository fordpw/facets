-- =====================================================
-- AUDIT & COMPLIANCE SCHEMA
-- HIPAA compliance, security monitoring, and 
-- comprehensive audit logging for healthcare data
-- =====================================================

-- =====================================================
-- USER MANAGEMENT AND ACCESS CONTROL
-- =====================================================

-- Application users (not database users)
CREATE TABLE app_users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50),
    department VARCHAR(100),
    job_title VARCHAR(200),
    
    -- Authentication
    password_hash VARCHAR(255), -- If using local auth
    salt VARCHAR(100),
    last_password_change TIMESTAMP,
    password_expiry_date DATE,
    failed_login_attempts INT DEFAULT 0,
    account_locked_until TIMESTAMP,
    
    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    is_system_admin BOOLEAN DEFAULT FALSE,
    requires_password_change BOOLEAN DEFAULT TRUE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(100),
    
    -- Metadata
    created_by UUID REFERENCES app_users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    last_activity TIMESTAMP
);

-- Role-based access control
CREATE TABLE roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(100) NOT NULL UNIQUE,
    role_description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User role assignments
CREATE TABLE user_roles (
    user_role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES app_users(user_id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, role_id)
);

-- Permissions for fine-grained access control
CREATE TABLE permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_name VARCHAR(200) NOT NULL UNIQUE,
    resource_type VARCHAR(100) NOT NULL, -- 'CLAIMS', 'MEMBERS', 'PROVIDERS', 'REPORTS'
    action VARCHAR(50) NOT NULL, -- 'READ', 'WRITE', 'DELETE', 'ADMIN'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role permissions mapping
CREATE TABLE role_permissions (
    role_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- =====================================================
-- COMPREHENSIVE AUDIT LOGGING
-- =====================================================

-- Master audit log for all data access and modifications
CREATE TABLE audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- User context
    user_id UUID REFERENCES app_users(user_id),
    username VARCHAR(100),
    session_id VARCHAR(100),
    client_ip VARCHAR(45),
    user_agent VARCHAR(500),
    
    -- Action details
    action_type VARCHAR(50) NOT NULL, -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
    resource_type VARCHAR(100) NOT NULL, -- 'MEMBER', 'CLAIM', 'PROVIDER', 'USER', 'SYSTEM'
    resource_id VARCHAR(100), -- ID of the affected record
    
    -- Data context
    table_name VARCHAR(100),
    primary_key_value VARCHAR(100),
    column_name VARCHAR(100), -- For column-level tracking
    
    -- Change tracking
    old_value TEXT,
    new_value TEXT,
    
    -- Business context
    reason_code VARCHAR(50), -- Business reason for the change
    business_justification TEXT,
    
    -- Technical context
    application_name VARCHAR(100),
    module_name VARCHAR(100),
    function_name VARCHAR(100),
    sql_statement TEXT,
    
    -- PHI tracking
    contains_phi BOOLEAN DEFAULT FALSE,
    phi_elements TEXT[], -- Array of PHI elements accessed
    
    -- Compliance
    hipaa_compliant BOOLEAN DEFAULT TRUE,
    audit_trail_complete BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Login/logout audit trail
CREATE TABLE login_audit (
    login_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES app_users(user_id),
    username VARCHAR(100) NOT NULL,
    login_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    logout_timestamp TIMESTAMP,
    session_id VARCHAR(100) NOT NULL,
    
    -- Login details
    login_method VARCHAR(50), -- 'PASSWORD', 'SSO', 'MFA', 'API_KEY'
    client_ip VARCHAR(45),
    user_agent VARCHAR(500),
    device_info VARCHAR(500),
    location_info VARCHAR(200),
    
    -- Login outcome
    login_successful BOOLEAN NOT NULL,
    failure_reason VARCHAR(200),
    
    -- Session details
    session_duration_minutes INT,
    pages_accessed INT DEFAULT 0,
    records_accessed INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PHI access tracking (HIPAA requirement)
CREATE TABLE phi_access_log (
    access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- User context
    user_id UUID NOT NULL REFERENCES app_users(user_id),
    username VARCHAR(100) NOT NULL,
    user_role VARCHAR(100),
    
    -- PHI details
    member_id UUID REFERENCES members(member_id),
    phi_type VARCHAR(100) NOT NULL, -- 'DEMOGRAPHIC', 'MEDICAL', 'FINANCIAL', 'CONTACT'
    phi_elements TEXT[] NOT NULL, -- Specific PHI elements accessed
    
    -- Access context
    access_reason VARCHAR(200) NOT NULL, -- Business reason for access
    access_method VARCHAR(50), -- 'DIRECT_QUERY', 'REPORT', 'API', 'EXPORT'
    minimum_necessary BOOLEAN DEFAULT TRUE, -- HIPAA minimum necessary standard
    
    -- Technical details
    source_system VARCHAR(100),
    client_ip VARCHAR(45),
    session_id VARCHAR(100),
    
    -- Disclosure tracking
    disclosed_to VARCHAR(200), -- If PHI was disclosed to third parties
    disclosure_reason VARCHAR(500),
    disclosure_authorization_id VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SECURITY MONITORING
-- =====================================================

-- Security events and incidents
CREATE TABLE security_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Event classification
    event_type VARCHAR(100) NOT NULL, -- 'UNAUTHORIZED_ACCESS', 'DATA_BREACH', 'MALICIOUS_ACTIVITY'
    severity_level VARCHAR(20) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    event_category VARCHAR(50), -- 'AUTHENTICATION', 'AUTHORIZATION', 'DATA_ACCESS', 'SYSTEM'
    
    -- Event details
    event_description TEXT NOT NULL,
    affected_user_id UUID REFERENCES app_users(user_id),
    affected_resource_type VARCHAR(100),
    affected_resource_id VARCHAR(100),
    
    -- Technical context
    client_ip VARCHAR(45),
    user_agent VARCHAR(500),
    session_id VARCHAR(100),
    request_details TEXT,
    
    -- Response and resolution
    response_action VARCHAR(500),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES app_users(user_id),
    resolution_notes TEXT,
    
    -- Compliance impact
    potential_hipaa_violation BOOLEAN DEFAULT FALSE,
    breach_notification_required BOOLEAN DEFAULT FALSE,
    regulatory_reporting_required BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Failed login attempts monitoring
CREATE TABLE failed_login_attempts (
    attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Attempt details
    username VARCHAR(100) NOT NULL,
    client_ip VARCHAR(45),
    user_agent VARCHAR(500),
    
    -- Failure analysis
    failure_reason VARCHAR(200),
    is_suspicious BOOLEAN DEFAULT FALSE,
    risk_score DECIMAL(5,2), -- 0.00 to 100.00
    
    -- Blocking status
    ip_blocked BOOLEAN DEFAULT FALSE,
    account_locked BOOLEAN DEFAULT FALSE,
    block_duration_minutes INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data export/download tracking
CREATE TABLE data_exports (
    export_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- User context
    user_id UUID NOT NULL REFERENCES app_users(user_id),
    username VARCHAR(100) NOT NULL,
    
    -- Export details
    export_type VARCHAR(100) NOT NULL, -- 'REPORT', 'BULK_DATA', 'SEARCH_RESULTS'
    data_category VARCHAR(100), -- 'CLAIMS', 'MEMBERS', 'PROVIDERS', 'ANALYTICS'
    record_count INT NOT NULL,
    file_format VARCHAR(20), -- 'CSV', 'PDF', 'EXCEL', 'JSON'
    file_size_bytes BIGINT,
    
    -- Content analysis
    contains_phi BOOLEAN DEFAULT FALSE,
    phi_record_count INT DEFAULT 0,
    sensitivity_level VARCHAR(20), -- 'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'
    
    -- Export authorization
    business_justification TEXT NOT NULL,
    authorized_by UUID REFERENCES app_users(user_id),
    authorization_reference VARCHAR(100),
    
    -- Delivery details
    delivery_method VARCHAR(50), -- 'DOWNLOAD', 'EMAIL', 'FTP', 'API'
    recipient_email VARCHAR(255),
    expiry_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- COMPLIANCE MONITORING
-- =====================================================

-- HIPAA compliance violations tracking
CREATE TABLE hipaa_violations (
    violation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Violation details
    violation_type VARCHAR(100) NOT NULL, -- 'UNAUTHORIZED_ACCESS', 'IMPROPER_DISCLOSURE', 'DATA_BREACH'
    violation_description TEXT NOT NULL,
    affected_individuals_count INT DEFAULT 0,
    
    -- Context
    user_id UUID REFERENCES app_users(user_id),
    system_component VARCHAR(100),
    data_elements_involved TEXT[],
    
    -- Risk assessment
    risk_level VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    potential_harm_assessment TEXT,
    likelihood_of_compromise VARCHAR(20),
    
    -- Response actions
    immediate_action_taken TEXT,
    mitigation_steps TEXT,
    preventive_measures TEXT,
    
    -- Regulatory compliance
    breach_notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_date DATE,
    regulatory_authority_notified BOOLEAN DEFAULT FALSE,
    authority_notification_date DATE,
    
    -- Investigation
    investigation_status VARCHAR(50) DEFAULT 'OPEN',
    assigned_investigator VARCHAR(100),
    investigation_notes TEXT,
    investigation_completed_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data retention policy compliance
CREATE TABLE data_retention_log (
    retention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retention_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Retention action
    action_type VARCHAR(50) NOT NULL, -- 'ARCHIVE', 'DELETE', 'RETAIN'
    table_name VARCHAR(100) NOT NULL,
    records_processed INT NOT NULL,
    retention_period_years INT,
    
    -- Policy compliance
    retention_policy_id VARCHAR(100),
    policy_reason VARCHAR(200),
    legal_hold_applied BOOLEAN DEFAULT FALSE,
    
    -- Execution details
    processed_by VARCHAR(100),
    processing_start TIMESTAMP,
    processing_end TIMESTAMP,
    processing_status VARCHAR(20), -- 'SUCCESS', 'FAILED', 'PARTIAL'
    error_details TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ANALYTICS VIEWS FOR COMPLIANCE REPORTING
-- =====================================================

-- PHI access summary for compliance reporting
CREATE VIEW v_phi_access_summary AS
SELECT 
    DATE_TRUNC('month', access_timestamp) as month,
    COUNT(*) as total_accesses,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT member_id) as unique_members,
    COUNT(CASE WHEN minimum_necessary = FALSE THEN 1 END) as violations_count,
    array_agg(DISTINCT phi_type) as phi_types_accessed
FROM phi_access_log
WHERE access_timestamp >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', access_timestamp)
ORDER BY month DESC;

-- Security incident dashboard
CREATE VIEW v_security_dashboard AS
SELECT 
    event_type,
    severity_level,
    COUNT(*) as incident_count,
    COUNT(CASE WHEN is_resolved = FALSE THEN 1 END) as open_incidents,
    AVG(EXTRACT(hours FROM (resolved_at - event_timestamp))) as avg_resolution_hours,
    MAX(event_timestamp) as last_incident
FROM security_events
WHERE event_timestamp >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY event_type, severity_level
ORDER BY incident_count DESC;

-- User activity summary
CREATE VIEW v_user_activity_summary AS
SELECT 
    u.user_id,
    u.username,
    u.department,
    COUNT(al.audit_id) as total_actions,
    COUNT(CASE WHEN al.contains_phi = TRUE THEN 1 END) as phi_accesses,
    MAX(al.audit_timestamp) as last_activity,
    COUNT(DISTINCT DATE(al.audit_timestamp)) as active_days_last_30
FROM app_users u
LEFT JOIN audit_log al ON u.user_id = al.user_id
    AND al.audit_timestamp >= CURRENT_DATE - INTERVAL '30 days'
WHERE u.is_active = TRUE
GROUP BY u.user_id, u.username, u.department
ORDER BY total_actions DESC;

-- =====================================================
-- INDEXES FOR AUDIT PERFORMANCE
-- =====================================================

-- Audit log indexes (high volume table)
CREATE INDEX idx_audit_log_timestamp ON audit_log(audit_timestamp);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_action ON audit_log(action_type);
CREATE INDEX idx_audit_log_phi ON audit_log(contains_phi) WHERE contains_phi = TRUE;
CREATE INDEX idx_audit_log_table ON audit_log(table_name);

-- PHI access log indexes
CREATE INDEX idx_phi_access_timestamp ON phi_access_log(access_timestamp);
CREATE INDEX idx_phi_access_user_id ON phi_access_log(user_id);
CREATE INDEX idx_phi_access_member_id ON phi_access_log(member_id);
CREATE INDEX idx_phi_access_type ON phi_access_log(phi_type);

-- Security event indexes
CREATE INDEX idx_security_events_timestamp ON security_events(event_timestamp);
CREATE INDEX idx_security_events_severity ON security_events(severity_level);
CREATE INDEX idx_security_events_unresolved ON security_events(is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX idx_security_events_type ON security_events(event_type);

-- Login audit indexes
CREATE INDEX idx_login_audit_user_id ON login_audit(user_id);
CREATE INDEX idx_login_audit_timestamp ON login_audit(login_timestamp);
CREATE INDEX idx_login_audit_ip ON login_audit(client_ip);
CREATE INDEX idx_login_audit_failed ON login_audit(login_successful) WHERE login_successful = FALSE;

-- Failed login attempts indexes
CREATE INDEX idx_failed_logins_timestamp ON failed_login_attempts(attempt_timestamp);
CREATE INDEX idx_failed_logins_ip ON failed_login_attempts(client_ip);
CREATE INDEX idx_failed_logins_username ON failed_login_attempts(username);
CREATE INDEX idx_failed_logins_suspicious ON failed_login_attempts(is_suspicious) WHERE is_suspicious = TRUE;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC AUDIT LOGGING
-- =====================================================

-- Example trigger function for audit logging (PostgreSQL)
/*
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (
            user_id, action_type, resource_type, table_name, 
            primary_key_value, old_value, contains_phi
        ) VALUES (
            current_setting('app.current_user_id')::UUID,
            'DELETE', 
            TG_TABLE_NAME,
            TG_TABLE_NAME,
            OLD.id::TEXT,
            row_to_json(OLD)::TEXT,
            TRUE  -- Assume healthcare tables contain PHI
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (
            user_id, action_type, resource_type, table_name, 
            primary_key_value, old_value, new_value, contains_phi
        ) VALUES (
            current_setting('app.current_user_id')::UUID,
            'UPDATE',
            TG_TABLE_NAME,
            TG_TABLE_NAME, 
            NEW.id::TEXT,
            row_to_json(OLD)::TEXT,
            row_to_json(NEW)::TEXT,
            TRUE
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (
            user_id, action_type, resource_type, table_name,
            primary_key_value, new_value, contains_phi
        ) VALUES (
            current_setting('app.current_user_id')::UUID,
            'INSERT',
            TG_TABLE_NAME,
            TG_TABLE_NAME,
            NEW.id::TEXT,
            row_to_json(NEW)::TEXT,
            TRUE
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to key tables
CREATE TRIGGER members_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON members
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER claims_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON claims
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
*/

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE app_users IS 'Application users with authentication and authorization';
COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for all data access and modifications';
COMMENT ON TABLE phi_access_log IS 'HIPAA-compliant PHI access tracking';
COMMENT ON TABLE security_events IS 'Security incidents and threat monitoring';
COMMENT ON TABLE hipaa_violations IS 'HIPAA compliance violations and breach tracking';
COMMENT ON TABLE data_retention_log IS 'Data retention policy compliance tracking';

COMMENT ON VIEW v_phi_access_summary IS 'Monthly PHI access summary for compliance reporting';
COMMENT ON VIEW v_security_dashboard IS 'Security incident dashboard for the last 90 days';
COMMENT ON VIEW v_user_activity_summary IS 'User activity summary for the last 30 days';