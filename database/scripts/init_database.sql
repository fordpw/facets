-- =====================================================
-- MASTER DATABASE INITIALIZATION SCRIPT
-- Creates complete database schema for healthcare applications
-- Compatible with PostgreSQL (primary) and SQL Server
-- =====================================================

-- Set client encoding and timezone
SET client_encoding = 'UTF8';
SET timezone = 'UTC';

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom types for better data integrity
CREATE TYPE gender_type AS ENUM ('M', 'F', 'O');
CREATE TYPE claim_status_type AS ENUM ('RECEIVED', 'PROCESSING', 'APPROVED', 'DENIED', 'PAID', 'REJECTED');
CREATE TYPE severity_level_type AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- =====================================================
-- EXECUTE SCHEMA CREATION SCRIPTS IN ORDER
-- =====================================================

-- Core healthcare entities (members, providers, claims, plans)
\i database/schemas/01_core_entities.sql

-- Analytics and reporting schema (fact tables, views, fraud detection)
\i database/schemas/02_analytics_schema.sql

-- API integration and monitoring (API clients, rate limiting, system health)
\i database/schemas/03_api_integration_schema.sql

-- Audit and compliance (HIPAA logging, security monitoring)
\i database/schemas/04_audit_compliance_schema.sql

-- =====================================================
-- SEED REFERENCE DATA
-- =====================================================

-- Insert US states
INSERT INTO states (state_code, state_name) VALUES
('AL', 'Alabama'), ('AK', 'Alaska'), ('AZ', 'Arizona'), ('AR', 'Arkansas'), ('CA', 'California'),
('CO', 'Colorado'), ('CT', 'Connecticut'), ('DE', 'Delaware'), ('FL', 'Florida'), ('GA', 'Georgia'),
('HI', 'Hawaii'), ('ID', 'Idaho'), ('IL', 'Illinois'), ('IN', 'Indiana'), ('IA', 'Iowa'),
('KS', 'Kansas'), ('KY', 'Kentucky'), ('LA', 'Louisiana'), ('ME', 'Maine'), ('MD', 'Maryland'),
('MA', 'Massachusetts'), ('MI', 'Michigan'), ('MN', 'Minnesota'), ('MS', 'Mississippi'), ('MO', 'Missouri'),
('MT', 'Montana'), ('NE', 'Nebraska'), ('NV', 'Nevada'), ('NH', 'New Hampshire'), ('NJ', 'New Jersey'),
('NM', 'New Mexico'), ('NY', 'New York'), ('NC', 'North Carolina'), ('ND', 'North Dakota'), ('OH', 'Ohio'),
('OK', 'Oklahoma'), ('OR', 'Oregon'), ('PA', 'Pennsylvania'), ('RI', 'Rhode Island'), ('SC', 'South Carolina'),
('SD', 'South Dakota'), ('TN', 'Tennessee'), ('TX', 'Texas'), ('UT', 'Utah'), ('VT', 'Vermont'),
('VA', 'Virginia'), ('WA', 'Washington'), ('WV', 'West Virginia'), ('WI', 'Wisconsin'), ('WY', 'Wyoming');

-- Insert plan types
INSERT INTO plan_types (plan_type_id, plan_type_code, plan_type_name, description) VALUES
(1, 'HMO', 'Health Maintenance Organization', 'Managed care plan requiring referrals'),
(2, 'PPO', 'Preferred Provider Organization', 'Flexible plan with in-network discounts'),
(3, 'EPO', 'Exclusive Provider Organization', 'No out-of-network coverage except emergencies'),
(4, 'POS', 'Point of Service', 'Hybrid HMO/PPO plan'),
(5, 'HDHP', 'High Deductible Health Plan', 'Lower premiums with high deductibles'),
(6, 'MA', 'Medicare Advantage', 'Medicare replacement plan'),
(7, 'MEDICAID', 'Medicaid Managed Care', 'State Medicaid managed care plan');

-- Insert medical specialties
INSERT INTO medical_specialties (specialty_id, specialty_code, specialty_name, description) VALUES
(1, 'FAM', 'Family Medicine', 'Primary care for all ages'),
(2, 'INT', 'Internal Medicine', 'Adult primary care and chronic conditions'),
(3, 'PED', 'Pediatrics', 'Medical care for infants, children, and adolescents'),
(4, 'OBG', 'Obstetrics and Gynecology', 'Womens reproductive health'),
(5, 'CAR', 'Cardiology', 'Heart and cardiovascular system'),
(6, 'DER', 'Dermatology', 'Skin, hair, and nail conditions'),
(7, 'END', 'Endocrinology', 'Hormonal and metabolic disorders'),
(8, 'GAS', 'Gastroenterology', 'Digestive system disorders'),
(9, 'NEU', 'Neurology', 'Nervous system disorders'),
(10, 'ONC', 'Oncology', 'Cancer diagnosis and treatment'),
(11, 'ORT', 'Orthopedics', 'Musculoskeletal system'),
(12, 'PSY', 'Psychiatry', 'Mental health disorders'),
(13, 'RAD', 'Radiology', 'Medical imaging'),
(14, 'URO', 'Urology', 'Urinary tract and male reproductive system'),
(15, 'EMR', 'Emergency Medicine', 'Emergency and urgent care');

-- Insert claim status codes
INSERT INTO claim_status_codes (status_code, status_name, description, is_final_status, sort_order) VALUES
('NEW', 'New', 'Newly received claim', FALSE, 1),
('PEND', 'Pending', 'Claim under review', FALSE, 2),
('PROC', 'Processing', 'Claim being processed', FALSE, 3),
('REVIEW', 'Review', 'Claim requires manual review', FALSE, 4),
('APPROVE', 'Approved', 'Claim approved for payment', FALSE, 5),
('PAID', 'Paid', 'Claim has been paid', TRUE, 6),
('DENIED', 'Denied', 'Claim denied', TRUE, 7),
('REJECT', 'Rejected', 'Claim rejected due to errors', TRUE, 8),
('APPEAL', 'Appeal', 'Claim is in appeal process', FALSE, 9),
('VOID', 'Void', 'Claim has been voided', TRUE, 10);

-- Insert default roles for RBAC
INSERT INTO roles (role_name, role_description, is_system_role) VALUES
('System Administrator', 'Full system access and configuration', TRUE),
('Claims Manager', 'Manage claims processing and workflow', FALSE),
('Claims Processor', 'Process and adjudicate claims', FALSE),
('Member Services', 'Handle member inquiries and updates', FALSE),
('Provider Relations', 'Manage provider network and contracts', FALSE),
('Finance Manager', 'Financial reporting and reconciliation', FALSE),
('Compliance Officer', 'Monitor compliance and audit activities', FALSE),
('Analytics User', 'Access to reports and analytics', FALSE),
('API Developer', 'Access to API documentation and tools', FALSE),
('Read Only User', 'View-only access to permitted data', FALSE);

-- Insert default permissions
INSERT INTO permissions (permission_name, resource_type, action, description) VALUES
-- Member permissions
('members.read', 'MEMBERS', 'read', 'View member information'),
('members.write', 'MEMBERS', 'write', 'Create and update member information'),
('members.delete', 'MEMBERS', 'delete', 'Delete member records'),
('members.phi', 'MEMBERS', 'admin', 'Access PHI data elements'),

-- Claims permissions
('claims.read', 'CLAIMS', 'read', 'View claims information'),
('claims.write', 'CLAIMS', 'write', 'Create and update claims'),
('claims.process', 'CLAIMS', 'admin', 'Process and adjudicate claims'),
('claims.payment', 'CLAIMS', 'admin', 'Approve payments'),

-- Provider permissions
('providers.read', 'PROVIDERS', 'read', 'View provider information'),
('providers.write', 'PROVIDERS', 'write', 'Create and update providers'),
('providers.contract', 'PROVIDERS', 'admin', 'Manage provider contracts'),

-- Reports permissions
('reports.claims', 'REPORTS', 'read', 'Access claims reports'),
('reports.financial', 'REPORTS', 'read', 'Access financial reports'),
('reports.analytics', 'REPORTS', 'read', 'Access analytics dashboards'),
('reports.compliance', 'REPORTS', 'read', 'Access compliance reports'),

-- System permissions
('system.admin', 'SYSTEM', 'admin', 'System administration'),
('system.config', 'SYSTEM', 'write', 'Configure system settings'),
('audit.read', 'SYSTEM', 'read', 'View audit logs'),
('users.manage', 'SYSTEM', 'admin', 'Manage user accounts');

-- =====================================================
-- CREATE DEFAULT ADMIN USER
-- =====================================================

-- Insert default admin user (password should be changed immediately)
INSERT INTO app_users (
    username, email, first_name, last_name, 
    password_hash, is_system_admin, requires_password_change
) VALUES (
    'admin', 
    'admin@facetsproject.com', 
    'System', 
    'Administrator',
    crypt('TempPassword123!', gen_salt('bf')), -- bcrypt hash
    TRUE,
    TRUE
);

-- Get the admin user ID for role assignment
DO $$
DECLARE
    admin_user_id UUID;
    sysadmin_role_id UUID;
BEGIN
    SELECT user_id INTO admin_user_id FROM app_users WHERE username = 'admin';
    SELECT role_id INTO sysadmin_role_id FROM roles WHERE role_name = 'System Administrator';
    
    INSERT INTO user_roles (user_id, role_id, granted_by)
    VALUES (admin_user_id, sysadmin_role_id, admin_user_id);
END $$;

-- =====================================================
-- SAMPLE FRAUD DETECTION RULES
-- =====================================================

INSERT INTO fraud_detection_rules (
    rule_name, rule_description, rule_type, rule_category, 
    threshold_value, severity_level, rule_sql
) VALUES 
(
    'High Dollar Claims',
    'Flag claims exceeding $50,000',
    'THRESHOLD',
    'BILLING',
    50000.00,
    'HIGH',
    'SELECT * FROM claims WHERE total_billed_amount > 50000'
),
(
    'Duplicate Billing Same Day',
    'Identify duplicate procedures billed on same day for same member',
    'DUPLICATE',
    'BILLING',
    NULL,
    'MEDIUM',
    'SELECT claim_id FROM claim_lines GROUP BY member_id, procedure_code, service_date HAVING COUNT(*) > 1'
),
(
    'Excessive Daily Claims',
    'Provider billing more than 50 claims per day',
    'OUTLIER',
    'PROVIDER',
    50.00,
    'MEDIUM',
    'SELECT provider_id FROM claims WHERE DATE(received_date) = CURRENT_DATE GROUP BY provider_id HAVING COUNT(*) > 50'
);

-- =====================================================
-- SAMPLE API ENDPOINTS
-- =====================================================

INSERT INTO api_endpoints (
    endpoint_path, http_method, endpoint_name, description, 
    category, rate_limit_per_minute, rate_limit_per_hour
) VALUES
('/api/v1/members', 'GET', 'List Members', 'Retrieve member list', 'MEMBERS', 30, 500),
('/api/v1/members/{id}', 'GET', 'Get Member', 'Retrieve specific member', 'MEMBERS', 60, 1000),
('/api/v1/claims', 'GET', 'List Claims', 'Retrieve claims list', 'CLAIMS', 30, 500),
('/api/v1/claims', 'POST', 'Create Claim', 'Submit new claim', 'CLAIMS', 10, 100),
('/api/v1/providers', 'GET', 'List Providers', 'Retrieve provider list', 'PROVIDERS', 30, 500),
('/api/v1/eligibility/verify', 'POST', 'Verify Eligibility', 'Check member eligibility', 'ELIGIBILITY', 100, 2000);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional performance indexes beyond those in schema files
CREATE INDEX idx_claims_composite_performance ON claims(health_plan_id, claim_status, service_date_from);
CREATE INDEX idx_members_composite_search ON members(last_name, first_name, date_of_birth);
CREATE INDEX idx_providers_composite_search ON providers(last_name, first_name, npi);

-- Partial indexes for active records only
CREATE INDEX idx_members_active ON members(member_number) WHERE is_active = TRUE;
CREATE INDEX idx_providers_active ON providers(npi) WHERE is_active = TRUE;
CREATE INDEX idx_health_plans_active ON health_plans(plan_code) WHERE is_active = TRUE;

-- =====================================================
-- PERFORMANCE MONITORING
-- =====================================================

-- Create materialized views for expensive queries
CREATE MATERIALIZED VIEW mv_monthly_claims_summary AS
SELECT 
    DATE_TRUNC('month', service_date_from) as month,
    health_plan_id,
    claim_type,
    claim_status,
    COUNT(*) as claim_count,
    SUM(total_billed_amount) as total_billed,
    SUM(total_paid_amount) as total_paid,
    AVG(total_paid_amount) as avg_paid
FROM claims
WHERE service_date_from >= CURRENT_DATE - INTERVAL '24 months'
GROUP BY DATE_TRUNC('month', service_date_from), health_plan_id, claim_type, claim_status;

-- Create index on materialized view
CREATE INDEX idx_mv_monthly_claims_month ON mv_monthly_claims_summary(month);

-- =====================================================
-- SECURITY FUNCTIONS
-- =====================================================

-- Function to encrypt SSN
CREATE OR REPLACE FUNCTION encrypt_ssn(ssn_plain TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(ssn_plain, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt SSN (restricted access)
CREATE OR REPLACE FUNCTION decrypt_ssn(ssn_encrypted BYTEA)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(ssn_encrypted, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CLEANUP AND MAINTENANCE FUNCTIONS
-- =====================================================

-- Function to archive old audit logs
CREATE OR REPLACE FUNCTION archive_old_audit_logs(months_to_keep INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move old audit logs to archive table (create if not exists)
    CREATE TABLE IF NOT EXISTS audit_log_archive (LIKE audit_log INCLUDING ALL);
    
    WITH archived_rows AS (
        DELETE FROM audit_log 
        WHERE audit_timestamp < CURRENT_DATE - INTERVAL '1 month' * months_to_keep
        RETURNING *
    )
    INSERT INTO audit_log_archive SELECT * FROM archived_rows;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_monthly_claims_summary;
    -- Add other materialized views here as they are created
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FINAL SETUP AND VALIDATION
-- =====================================================

-- Set up row level security policies (if needed)
-- ALTER TABLE members ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY member_access_policy ON members FOR ALL TO app_role USING (health_plan_id = current_setting('app.user_health_plan')::UUID);

-- Analyze tables for better query planning
ANALYZE;

-- Vacuum for cleanup
VACUUM;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully!';
    RAISE NOTICE 'Tables created: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public');
    RAISE NOTICE 'Indexes created: %', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public');
    RAISE NOTICE 'Default admin user created: admin (password must be changed)';
    RAISE NOTICE 'Please run sample data script if needed: database/seeds/sample_data.sql';
END $$;