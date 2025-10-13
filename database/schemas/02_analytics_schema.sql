-- =====================================================
-- CLAIMS ANALYTICS & REPORTING SCHEMA  
-- Optimized for business intelligence, fraud detection,
-- and advanced analytics on healthcare claims data
-- =====================================================

-- =====================================================
-- CLAIMS ANALYTICS FACT TABLES
-- =====================================================

-- Claims summary fact table - optimized for fast aggregations
CREATE TABLE fact_claims_daily (
    fact_date DATE NOT NULL,
    health_plan_id UUID NOT NULL REFERENCES health_plans(health_plan_id),
    product_line_id UUID NOT NULL REFERENCES product_lines(product_line_id),
    provider_id UUID REFERENCES providers(provider_id),
    provider_org_id UUID REFERENCES provider_organizations(provider_org_id),
    claim_type VARCHAR(20) NOT NULL,
    claim_status VARCHAR(10) NOT NULL,
    place_of_service_code VARCHAR(10),
    primary_diagnosis_code VARCHAR(20),
    specialty_id INT REFERENCES medical_specialties(specialty_id),
    
    -- Counts
    claims_count INT DEFAULT 0,
    claim_lines_count INT DEFAULT 0,
    unique_members_count INT DEFAULT 0,
    unique_providers_count INT DEFAULT 0,
    
    -- Financial aggregates
    total_billed_amount DECIMAL(15,2) DEFAULT 0.00,
    total_allowed_amount DECIMAL(15,2) DEFAULT 0.00,
    total_paid_amount DECIMAL(15,2) DEFAULT 0.00,
    total_member_responsibility DECIMAL(15,2) DEFAULT 0.00,
    total_deductible_amount DECIMAL(15,2) DEFAULT 0.00,
    total_copay_amount DECIMAL(15,2) DEFAULT 0.00,
    total_coinsurance_amount DECIMAL(15,2) DEFAULT 0.00,
    
    -- Processing metrics
    avg_processing_days DECIMAL(8,2),
    avg_payment_days DECIMAL(8,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (fact_date, health_plan_id, product_line_id, 
                COALESCE(provider_id, '00000000-0000-0000-0000-000000000000'::UUID),
                COALESCE(provider_org_id, '00000000-0000-0000-0000-000000000000'::UUID),
                claim_type, claim_status, 
                COALESCE(place_of_service_code, ''), 
                COALESCE(primary_diagnosis_code, ''),
                COALESCE(specialty_id, 0))
);

-- Member utilization patterns
CREATE TABLE fact_member_utilization (
    member_id UUID NOT NULL REFERENCES members(member_id),
    health_plan_id UUID NOT NULL REFERENCES health_plans(health_plan_id),
    year_month DATE NOT NULL, -- First day of month
    
    -- Visit counts by type
    inpatient_visits INT DEFAULT 0,
    outpatient_visits INT DEFAULT 0,
    emergency_visits INT DEFAULT 0,
    primary_care_visits INT DEFAULT 0,
    specialist_visits INT DEFAULT 0,
    preventive_visits INT DEFAULT 0,
    
    -- Total costs
    total_medical_costs DECIMAL(12,2) DEFAULT 0.00,
    total_pharmacy_costs DECIMAL(12,2) DEFAULT 0.00,
    total_member_costs DECIMAL(12,2) DEFAULT 0.00,
    
    -- Chronic conditions flags
    has_diabetes BOOLEAN DEFAULT FALSE,
    has_hypertension BOOLEAN DEFAULT FALSE,
    has_heart_disease BOOLEAN DEFAULT FALSE,
    has_mental_health BOOLEAN DEFAULT FALSE,
    
    -- Risk indicators
    risk_score DECIMAL(8,2),
    is_high_cost_member BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (member_id, health_plan_id, year_month)
);

-- Provider performance metrics
CREATE TABLE fact_provider_performance (
    provider_id UUID NOT NULL REFERENCES providers(provider_id),
    health_plan_id UUID NOT NULL REFERENCES health_plans(health_plan_id),
    year_month DATE NOT NULL,
    specialty_id INT REFERENCES medical_specialties(specialty_id),
    
    -- Volume metrics
    total_claims INT DEFAULT 0,
    total_members_served INT DEFAULT 0,
    total_services INT DEFAULT 0,
    
    -- Financial metrics
    avg_claim_amount DECIMAL(10,2),
    total_payments DECIMAL(15,2) DEFAULT 0.00,
    cost_per_member DECIMAL(10,2),
    
    -- Quality metrics
    claim_denial_rate DECIMAL(5,4),
    prior_auth_approval_rate DECIMAL(5,4),
    member_complaints INT DEFAULT 0,
    
    -- Efficiency metrics
    avg_processing_time_days DECIMAL(6,2),
    clean_claim_rate DECIMAL(5,4),
    
    -- Network participation
    in_network_percentage DECIMAL(5,4),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (provider_id, health_plan_id, year_month)
);

-- =====================================================
-- FRAUD DETECTION TABLES
-- =====================================================

-- Fraud detection rules and patterns
CREATE TABLE fraud_detection_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(200) NOT NULL,
    rule_description TEXT,
    rule_type VARCHAR(50) NOT NULL, -- 'PATTERN', 'THRESHOLD', 'OUTLIER', 'DUPLICATE'
    rule_category VARCHAR(50), -- 'BILLING', 'PROVIDER', 'MEMBER', 'SERVICE'
    rule_sql TEXT, -- SQL query for rule evaluation
    threshold_value DECIMAL(15,2),
    severity_level VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fraud alerts and suspicious activities
CREATE TABLE fraud_alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES fraud_detection_rules(rule_id),
    claim_id UUID REFERENCES claims(claim_id),
    provider_id UUID REFERENCES providers(provider_id),
    member_id UUID REFERENCES members(member_id),
    alert_type VARCHAR(50) NOT NULL,
    alert_description TEXT,
    risk_score DECIMAL(5,2), -- 0.00 to 100.00
    financial_impact DECIMAL(12,2),
    alert_status VARCHAR(20) DEFAULT 'OPEN', -- 'OPEN', 'INVESTIGATING', 'CLOSED', 'FALSE_POSITIVE'
    investigated_by VARCHAR(100),
    investigation_notes TEXT,
    resolution_action VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Provider fraud risk scoring
CREATE TABLE provider_risk_scores (
    provider_id UUID NOT NULL REFERENCES providers(provider_id),
    health_plan_id UUID NOT NULL REFERENCES health_plans(health_plan_id),
    evaluation_date DATE NOT NULL,
    
    -- Risk score components
    billing_pattern_score DECIMAL(5,2) DEFAULT 0.00,
    volume_anomaly_score DECIMAL(5,2) DEFAULT 0.00,
    duplicate_billing_score DECIMAL(5,2) DEFAULT 0.00,
    outlier_pricing_score DECIMAL(5,2) DEFAULT 0.00,
    network_association_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- Overall scores
    overall_risk_score DECIMAL(5,2) DEFAULT 0.00,
    risk_tier VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    
    -- Supporting metrics
    claims_investigated INT DEFAULT 0,
    fraud_alerts_count INT DEFAULT 0,
    total_questionable_amount DECIMAL(15,2) DEFAULT 0.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (provider_id, health_plan_id, evaluation_date)
);

-- =====================================================
-- REPORTING AND ANALYTICS VIEWS
-- =====================================================

-- Claims processing dashboard view
CREATE VIEW v_claims_dashboard AS
SELECT 
    c.claim_status,
    c.claim_type,
    COUNT(*) as claims_count,
    SUM(c.total_billed_amount) as total_billed,
    SUM(c.total_paid_amount) as total_paid,
    AVG(c.total_billed_amount) as avg_claim_amount,
    AVG(EXTRACT(days FROM (c.processed_date - c.received_date))) as avg_processing_days
FROM claims c
WHERE c.received_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.claim_status, c.claim_type
ORDER BY claims_count DESC;

-- Provider performance summary
CREATE VIEW v_provider_performance AS
SELECT 
    p.provider_id,
    p.first_name || ' ' || p.last_name as provider_name,
    ms.specialty_name,
    COUNT(c.claim_id) as total_claims,
    COUNT(DISTINCT c.member_id) as unique_members,
    SUM(c.total_billed_amount) as total_billed,
    SUM(c.total_paid_amount) as total_paid,
    ROUND(AVG(c.total_paid_amount), 2) as avg_payment,
    ROUND(
        COUNT(CASE WHEN c.claim_status IN ('DENIED', 'REJECTED') THEN 1 END)::DECIMAL / 
        COUNT(*)::DECIMAL * 100, 2
    ) as denial_rate_percent
FROM providers p
JOIN claims c ON p.provider_id = c.billing_provider_id
LEFT JOIN medical_specialties ms ON p.primary_specialty_id = ms.specialty_id
WHERE c.received_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY p.provider_id, p.first_name, p.last_name, ms.specialty_name
HAVING COUNT(c.claim_id) >= 10
ORDER BY total_paid DESC;

-- Member cost analysis view
CREATE VIEW v_member_costs AS
SELECT 
    m.member_id,
    m.first_name || ' ' || m.last_name as member_name,
    m.date_of_birth,
    hp.plan_name,
    COUNT(c.claim_id) as total_claims,
    SUM(c.total_billed_amount) as total_billed,
    SUM(c.total_paid_amount) as total_plan_paid,
    SUM(c.member_responsibility) as total_member_cost,
    MAX(c.service_date_from) as last_service_date
FROM members m
JOIN claims c ON m.member_id = c.member_id
JOIN health_plans hp ON c.health_plan_id = hp.health_plan_id
WHERE c.service_date_from >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY m.member_id, m.first_name, m.last_name, m.date_of_birth, hp.plan_name
ORDER BY total_plan_paid DESC;

-- High-cost claims analysis
CREATE VIEW v_high_cost_claims AS
SELECT 
    c.claim_id,
    c.claim_number,
    m.first_name || ' ' || m.last_name as member_name,
    p.first_name || ' ' || p.last_name as provider_name,
    c.claim_type,
    c.service_date_from,
    c.total_billed_amount,
    c.total_paid_amount,
    c.claim_status,
    c.primary_diagnosis_code,
    CASE 
        WHEN c.total_paid_amount >= 100000 THEN 'Very High'
        WHEN c.total_paid_amount >= 50000 THEN 'High'
        WHEN c.total_paid_amount >= 25000 THEN 'Medium-High'
        ELSE 'Standard'
    END as cost_category
FROM claims c
JOIN members m ON c.member_id = m.member_id
LEFT JOIN providers p ON c.billing_provider_id = p.provider_id
WHERE c.total_paid_amount >= 25000
ORDER BY c.total_paid_amount DESC;

-- =====================================================
-- PERFORMANCE INDEXES FOR ANALYTICS
-- =====================================================

-- Fact table indexes
CREATE INDEX idx_fact_claims_daily_date ON fact_claims_daily(fact_date);
CREATE INDEX idx_fact_claims_daily_health_plan ON fact_claims_daily(health_plan_id);
CREATE INDEX idx_fact_claims_daily_provider ON fact_claims_daily(provider_id);
CREATE INDEX idx_fact_claims_daily_type_status ON fact_claims_daily(claim_type, claim_status);

CREATE INDEX idx_fact_member_util_month ON fact_member_utilization(year_month);
CREATE INDEX idx_fact_member_util_member ON fact_member_utilization(member_id);
CREATE INDEX idx_fact_member_util_high_cost ON fact_member_utilization(is_high_cost_member) WHERE is_high_cost_member = TRUE;

CREATE INDEX idx_fact_provider_perf_month ON fact_provider_performance(year_month);
CREATE INDEX idx_fact_provider_perf_provider ON fact_provider_performance(provider_id);
CREATE INDEX idx_fact_provider_perf_denial_rate ON fact_provider_performance(claim_denial_rate);

-- Fraud detection indexes
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(alert_status);
CREATE INDEX idx_fraud_alerts_risk_score ON fraud_alerts(risk_score);
CREATE INDEX idx_fraud_alerts_created ON fraud_alerts(created_at);
CREATE INDEX idx_fraud_alerts_claim ON fraud_alerts(claim_id);
CREATE INDEX idx_fraud_alerts_provider ON fraud_alerts(provider_id);

CREATE INDEX idx_provider_risk_scores_tier ON provider_risk_scores(risk_tier);
CREATE INDEX idx_provider_risk_scores_score ON provider_risk_scores(overall_risk_score);
CREATE INDEX idx_provider_risk_scores_date ON provider_risk_scores(evaluation_date);

-- =====================================================
-- PARTITIONING FOR LARGE DATASETS
-- =====================================================

-- Partition fact_claims_daily by month for better performance
-- (PostgreSQL syntax - adjust for other databases)
/*
CREATE TABLE fact_claims_daily_template (LIKE fact_claims_daily INCLUDING ALL);

-- Create monthly partitions
CREATE TABLE fact_claims_daily_2024_01 PARTITION OF fact_claims_daily 
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE fact_claims_daily_2024_02 PARTITION OF fact_claims_daily 
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Add more partitions as needed
*/

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE fact_claims_daily IS 'Daily aggregated claims data optimized for reporting and analytics';
COMMENT ON TABLE fact_member_utilization IS 'Monthly member utilization patterns and costs';
COMMENT ON TABLE fact_provider_performance IS 'Monthly provider performance metrics and quality indicators';
COMMENT ON TABLE fraud_detection_rules IS 'Configurable fraud detection rules and patterns';
COMMENT ON TABLE fraud_alerts IS 'Generated fraud alerts requiring investigation';
COMMENT ON TABLE provider_risk_scores IS 'Provider fraud risk assessment scores';

COMMENT ON VIEW v_claims_dashboard IS 'Real-time claims processing dashboard metrics';
COMMENT ON VIEW v_provider_performance IS '90-day provider performance summary';
COMMENT ON VIEW v_member_costs IS '12-month member cost analysis';
COMMENT ON VIEW v_high_cost_claims IS 'Claims exceeding $25,000 in payments';