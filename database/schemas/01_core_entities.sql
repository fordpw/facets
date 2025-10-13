-- =====================================================
-- CORE HEALTHCARE ENTITIES SCHEMA
-- Foundation tables for all healthcare applications
-- Compatible with PostgreSQL and SQL Server
-- =====================================================

-- Enable extensions (PostgreSQL)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- REFERENCE DATA TABLES
-- =====================================================

-- States and geographic data
CREATE TABLE states (
    state_code CHAR(2) PRIMARY KEY,
    state_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insurance plan types
CREATE TABLE plan_types (
    plan_type_id INT PRIMARY KEY,
    plan_type_code VARCHAR(20) NOT NULL UNIQUE,
    plan_type_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medical specialty codes
CREATE TABLE medical_specialties (
    specialty_id INT PRIMARY KEY,
    specialty_code VARCHAR(20) NOT NULL UNIQUE,
    specialty_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claim status codes
CREATE TABLE claim_status_codes (
    status_code VARCHAR(10) PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL,
    description TEXT,
    is_final_status BOOLEAN DEFAULT FALSE,
    sort_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ORGANIZATIONS AND PLANS
-- =====================================================

-- Health plans/payers
CREATE TABLE health_plans (
    health_plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code VARCHAR(20) NOT NULL UNIQUE,
    plan_name VARCHAR(200) NOT NULL,
    plan_type_id INT NOT NULL REFERENCES plan_types(plan_type_id),
    tax_id VARCHAR(20),
    npi VARCHAR(10),
    address_line1 VARCHAR(100),
    address_line2 VARCHAR(100),
    city VARCHAR(50),
    state_code CHAR(2) REFERENCES states(state_code),
    zip_code VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE NOT NULL,
    termination_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product lines within health plans
CREATE TABLE product_lines (
    product_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    health_plan_id UUID NOT NULL REFERENCES health_plans(health_plan_id),
    product_code VARCHAR(20) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE NOT NULL,
    termination_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(health_plan_id, product_code)
);

-- =====================================================
-- PROVIDERS
-- =====================================================

-- Provider organizations (hospitals, clinics, groups)
CREATE TABLE provider_organizations (
    provider_org_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name VARCHAR(200) NOT NULL,
    org_type VARCHAR(50), -- 'Hospital', 'Clinic', 'Group', 'Facility'
    tax_id VARCHAR(20),
    npi VARCHAR(10) UNIQUE,
    address_line1 VARCHAR(100),
    address_line2 VARCHAR(100),
    city VARCHAR(50),
    state_code CHAR(2) REFERENCES states(state_code),
    zip_code VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual providers (doctors, nurses, therapists)
CREATE TABLE providers (
    provider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_org_id UUID REFERENCES provider_organizations(provider_org_id),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    suffix VARCHAR(10),
    gender CHAR(1), -- 'M', 'F', 'O'
    date_of_birth DATE,
    npi VARCHAR(10) UNIQUE,
    license_number VARCHAR(50),
    license_state CHAR(2) REFERENCES states(state_code),
    primary_specialty_id INT REFERENCES medical_specialties(specialty_id),
    address_line1 VARCHAR(100),
    address_line2 VARCHAR(100),
    city VARCHAR(50),
    state_code CHAR(2) REFERENCES states(state_code),
    zip_code VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Provider network participation
CREATE TABLE provider_networks (
    network_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    health_plan_id UUID NOT NULL REFERENCES health_plans(health_plan_id),
    provider_id UUID REFERENCES providers(provider_id),
    provider_org_id UUID REFERENCES provider_organizations(provider_org_id),
    network_tier VARCHAR(20), -- 'Tier 1', 'Tier 2', 'Out of Network'
    contract_number VARCHAR(50),
    effective_date DATE NOT NULL,
    termination_date DATE,
    is_accepting_patients BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT provider_networks_provider_check 
        CHECK ((provider_id IS NOT NULL AND provider_org_id IS NULL) OR 
               (provider_id IS NULL AND provider_org_id IS NOT NULL))
);

-- =====================================================
-- MEMBERS
-- =====================================================

-- Member demographics and basic information
CREATE TABLE members (
    member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_number VARCHAR(50) NOT NULL UNIQUE,
    ssn_encrypted BYTEA, -- Encrypted SSN for security
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    suffix VARCHAR(10),
    gender CHAR(1), -- 'M', 'F', 'O'
    date_of_birth DATE NOT NULL,
    address_line1 VARCHAR(100),
    address_line2 VARCHAR(100),
    city VARCHAR(50),
    state_code CHAR(2) REFERENCES states(state_code),
    zip_code VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(100),
    preferred_language VARCHAR(10) DEFAULT 'EN',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Member enrollment in health plans
CREATE TABLE member_enrollments (
    enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(member_id),
    health_plan_id UUID NOT NULL REFERENCES health_plans(health_plan_id),
    product_line_id UUID NOT NULL REFERENCES product_lines(product_line_id),
    subscriber_id VARCHAR(50), -- Primary member ID
    relationship_code VARCHAR(10), -- 'SELF', 'SPOUSE', 'CHILD', 'OTHER'
    group_number VARCHAR(50),
    effective_date DATE NOT NULL,
    termination_date DATE,
    termination_reason VARCHAR(50),
    copay_amount DECIMAL(10,2),
    deductible_amount DECIMAL(10,2),
    out_of_pocket_max DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Primary Care Provider assignments
CREATE TABLE member_pcp_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(member_id),
    provider_id UUID NOT NULL REFERENCES providers(provider_id),
    effective_date DATE NOT NULL,
    termination_date DATE,
    assignment_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CLAIMS CORE ENTITIES
-- =====================================================

-- Claims header information
CREATE TABLE claims (
    claim_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number VARCHAR(50) NOT NULL UNIQUE,
    member_id UUID NOT NULL REFERENCES members(member_id),
    health_plan_id UUID NOT NULL REFERENCES health_plans(health_plan_id),
    billing_provider_id UUID REFERENCES providers(provider_id),
    billing_provider_org_id UUID REFERENCES provider_organizations(provider_org_id),
    servicing_provider_id UUID REFERENCES providers(provider_id),
    claim_type VARCHAR(20) NOT NULL, -- 'MEDICAL', 'PHARMACY', 'DENTAL', 'VISION'
    claim_status VARCHAR(10) NOT NULL REFERENCES claim_status_codes(status_code),
    service_date_from DATE NOT NULL,
    service_date_to DATE,
    admission_date DATE,
    discharge_date DATE,
    total_billed_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_allowed_amount DECIMAL(12,2) DEFAULT 0.00,
    total_paid_amount DECIMAL(12,2) DEFAULT 0.00,
    member_responsibility DECIMAL(12,2) DEFAULT 0.00,
    diagnosis_code_primary VARCHAR(20),
    diagnosis_code_secondary VARCHAR(20),
    place_of_service_code VARCHAR(10),
    claim_frequency_code VARCHAR(10),
    accident_related BOOLEAN DEFAULT FALSE,
    emergency_related BOOLEAN DEFAULT FALSE,
    submitted_date TIMESTAMP,
    received_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP,
    paid_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT claims_billing_provider_check 
        CHECK ((billing_provider_id IS NOT NULL AND billing_provider_org_id IS NULL) OR 
               (billing_provider_id IS NULL AND billing_provider_org_id IS NOT NULL))
);

-- Claim line items (services/procedures)
CREATE TABLE claim_lines (
    claim_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(claim_id) ON DELETE CASCADE,
    line_number INT NOT NULL,
    procedure_code VARCHAR(20) NOT NULL,
    procedure_modifier VARCHAR(10),
    procedure_description VARCHAR(500),
    service_date DATE NOT NULL,
    units_of_service DECIMAL(8,2) DEFAULT 1.00,
    billed_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    allowed_amount DECIMAL(10,2) DEFAULT 0.00,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    deductible_amount DECIMAL(10,2) DEFAULT 0.00,
    copay_amount DECIMAL(10,2) DEFAULT 0.00,
    coinsurance_amount DECIMAL(10,2) DEFAULT 0.00,
    denial_reason_code VARCHAR(20),
    denial_reason_description VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (claim_id, line_number)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Members indexes
CREATE INDEX idx_members_member_number ON members(member_number);
CREATE INDEX idx_members_name ON members(last_name, first_name);
CREATE INDEX idx_members_dob ON members(date_of_birth);

-- Provider indexes
CREATE INDEX idx_providers_npi ON providers(npi);
CREATE INDEX idx_providers_name ON providers(last_name, first_name);
CREATE INDEX idx_provider_orgs_npi ON provider_organizations(npi);

-- Claims indexes
CREATE INDEX idx_claims_member_id ON claims(member_id);
CREATE INDEX idx_claims_claim_number ON claims(claim_number);
CREATE INDEX idx_claims_service_date ON claims(service_date_from);
CREATE INDEX idx_claims_status ON claims(claim_status);
CREATE INDEX idx_claims_received_date ON claims(received_date);
CREATE INDEX idx_claims_billing_provider ON claims(billing_provider_id);
CREATE INDEX idx_claims_health_plan ON claims(health_plan_id);

-- Claim lines indexes
CREATE INDEX idx_claim_lines_procedure_code ON claim_lines(procedure_code);
CREATE INDEX idx_claim_lines_service_date ON claim_lines(service_date);

-- Member enrollment indexes
CREATE INDEX idx_member_enrollments_member_id ON member_enrollments(member_id);
CREATE INDEX idx_member_enrollments_effective_date ON member_enrollments(effective_date);
CREATE INDEX idx_member_enrollments_health_plan ON member_enrollments(health_plan_id);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE members IS 'Core member demographics and personal information';
COMMENT ON TABLE claims IS 'Healthcare claims header information';
COMMENT ON TABLE claim_lines IS 'Individual services/procedures within a claim';
COMMENT ON TABLE providers IS 'Individual healthcare providers (doctors, nurses, etc.)';
COMMENT ON TABLE provider_organizations IS 'Healthcare organizations (hospitals, clinics, groups)';
COMMENT ON TABLE health_plans IS 'Insurance plans/payers';
COMMENT ON TABLE member_enrollments IS 'Member enrollment history in health plans';