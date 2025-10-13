-- =====================================================
-- SAMPLE HEALTHCARE DATA FOR TESTING & DEVELOPMENT
-- Generates realistic test data for claims, members, providers
-- *** DO NOT RUN IN PRODUCTION ***
-- =====================================================

-- Only run in development environments
DO $$
BEGIN
    IF COALESCE(current_setting('app.environment', true), 'dev') = 'prod' THEN
        RAISE EXCEPTION 'Sample data cannot be loaded in production environment';
    END IF;
    
    RAISE NOTICE 'Loading sample healthcare data for development/testing...';
END $$;

-- =====================================================
-- SAMPLE HEALTH PLANS
-- =====================================================

INSERT INTO health_plans (plan_code, plan_name, plan_type_id, effective_date, address_line1, city, state_code, zip_code) VALUES
('ACME001', 'Acme Health Plan - PPO', 2, '2024-01-01', '123 Insurance Way', 'Chicago', 'IL', '60601'),
('BETA002', 'Beta Care Network - HMO', 1, '2024-01-01', '456 Healthcare Blvd', 'Phoenix', 'AZ', '85001'),
('GAMMA003', 'Gamma Medical Advantage', 6, '2024-01-01', '789 Medicare Dr', 'Miami', 'FL', '33101');

-- Create product lines for each health plan
INSERT INTO product_lines (health_plan_id, product_code, product_name, effective_date)
SELECT 
    hp.health_plan_id,
    hp.plan_code || '-' || pt.plan_type_code,
    hp.plan_name || ' - ' || pt.plan_type_name,
    hp.effective_date
FROM health_plans hp
JOIN plan_types pt ON hp.plan_type_id = pt.plan_type_id;

-- =====================================================
-- SAMPLE PROVIDER ORGANIZATIONS
-- =====================================================

INSERT INTO provider_organizations (org_name, org_type, npi, address_line1, city, state_code, zip_code) VALUES
('Metro General Hospital', 'Hospital', '1234567890', '100 Hospital Ave', 'Chicago', 'IL', '60602'),
('Sunrise Medical Center', 'Hospital', '1234567891', '200 Medical Pkwy', 'Phoenix', 'AZ', '85002'),
('City Family Clinic', 'Clinic', '1234567892', '300 Health St', 'Miami', 'FL', '33102'),
('Regional Cardiology Group', 'Group', '1234567893', '400 Heart Lane', 'Chicago', 'IL', '60603'),
('Desert Pediatrics', 'Clinic', '1234567894', '500 Child Ave', 'Phoenix', 'AZ', '85003');

-- =====================================================
-- SAMPLE INDIVIDUAL PROVIDERS
-- =====================================================

INSERT INTO providers (provider_org_id, first_name, last_name, npi, primary_specialty_id, address_line1, city, state_code, zip_code) VALUES
((SELECT provider_org_id FROM provider_organizations WHERE org_name = 'Metro General Hospital'), 'John', 'Smith', '2345678901', 5, '100 Hospital Ave', 'Chicago', 'IL', '60602'),
((SELECT provider_org_id FROM provider_organizations WHERE org_name = 'Metro General Hospital'), 'Sarah', 'Johnson', '2345678902', 1, '100 Hospital Ave', 'Chicago', 'IL', '60602'),
((SELECT provider_org_id FROM provider_organizations WHERE org_name = 'Sunrise Medical Center'), 'Michael', 'Davis', '2345678903', 15, '200 Medical Pkwy', 'Phoenix', 'AZ', '85002'),
((SELECT provider_org_id FROM provider_organizations WHERE org_name = 'City Family Clinic'), 'Emily', 'Wilson', '2345678904', 1, '300 Health St', 'Miami', 'FL', '33102'),
((SELECT provider_org_id FROM provider_organizations WHERE org_name = 'Regional Cardiology Group'), 'Robert', 'Brown', '2345678905', 5, '400 Heart Lane', 'Chicago', 'IL', '60603'),
((SELECT provider_org_id FROM provider_organizations WHERE org_name = 'Desert Pediatrics'), 'Lisa', 'Miller', '2345678906', 3, '500 Child Ave', 'Phoenix', 'AZ', '85003'),
((SELECT provider_org_id FROM provider_organizations WHERE org_name = 'Metro General Hospital'), 'David', 'Anderson', '2345678907', 11, '100 Hospital Ave', 'Chicago', 'IL', '60602'),
((SELECT provider_org_id FROM provider_organizations WHERE org_name = 'Sunrise Medical Center'), 'Jennifer', 'Taylor', '2345678908', 4, '200 Medical Pkwy', 'Phoenix', 'AZ', '85002');

-- =====================================================
-- SAMPLE MEMBERS
-- =====================================================

-- Create sample members with varied demographics
INSERT INTO members (member_number, first_name, last_name, gender, date_of_birth, address_line1, city, state_code, zip_code, email) VALUES
('M0001001', 'Alice', 'Thompson', 'F', '1985-03-15', '1001 Main St', 'Chicago', 'IL', '60610', 'alice.thompson@email.com'),
('M0001002', 'Bob', 'Martinez', 'M', '1978-07-22', '1002 Oak Ave', 'Chicago', 'IL', '60611', 'bob.martinez@email.com'),
('M0001003', 'Carol', 'White', 'F', '1992-11-08', '1003 Pine St', 'Phoenix', 'AZ', '85010', 'carol.white@email.com'),
('M0001004', 'Daniel', 'Lee', 'M', '1965-05-30', '1004 Elm Dr', 'Miami', 'FL', '33110', 'daniel.lee@email.com'),
('M0001005', 'Emma', 'Garcia', 'F', '1990-09-12', '1005 Maple Ave', 'Chicago', 'IL', '60612', 'emma.garcia@email.com'),
('M0001006', 'Frank', 'Rodriguez', 'M', '1982-12-03', '1006 Cedar St', 'Phoenix', 'AZ', '85011', 'frank.rodriguez@email.com'),
('M0001007', 'Grace', 'Chen', 'F', '1975-02-18', '1007 Birch Lane', 'Miami', 'FL', '33111', 'grace.chen@email.com'),
('M0001008', 'Henry', 'Jackson', 'M', '1988-08-25', '1008 Spruce Rd', 'Chicago', 'IL', '60613', 'henry.jackson@email.com'),
('M0001009', 'Iris', 'Patel', 'F', '1995-06-14', '1009 Willow St', 'Phoenix', 'AZ', '85012', 'iris.patel@email.com'),
('M0001010', 'Jack', 'O''Connor', 'M', '1972-10-07', '1010 Ash Ave', 'Miami', 'FL', '33112', 'jack.oconnor@email.com');

-- Create member enrollments
INSERT INTO member_enrollments (member_id, health_plan_id, product_line_id, relationship_code, effective_date, copay_amount, deductible_amount, out_of_pocket_max)
SELECT 
    m.member_id,
    hp.health_plan_id,
    pl.product_line_id,
    'SELF',
    '2024-01-01'::DATE,
    CASE hp.plan_code 
        WHEN 'ACME001' THEN 25.00
        WHEN 'BETA002' THEN 20.00 
        WHEN 'GAMMA003' THEN 15.00
    END,
    CASE hp.plan_code
        WHEN 'ACME001' THEN 1500.00
        WHEN 'BETA002' THEN 1000.00
        WHEN 'GAMMA003' THEN 500.00
    END,
    CASE hp.plan_code
        WHEN 'ACME001' THEN 8000.00
        WHEN 'BETA002' THEN 6000.00
        WHEN 'GAMMA003' THEN 4000.00
    END
FROM members m
CROSS JOIN health_plans hp
JOIN product_lines pl ON hp.health_plan_id = pl.health_plan_id
WHERE (m.member_number LIKE '%001' OR m.member_number LIKE '%004' OR m.member_number LIKE '%007' OR m.member_number LIKE '%010') AND hp.plan_code = 'ACME001'
   OR (m.member_number LIKE '%002' OR m.member_number LIKE '%005' OR m.member_number LIKE '%008') AND hp.plan_code = 'BETA002'
   OR (m.member_number LIKE '%003' OR m.member_number LIKE '%006' OR m.member_number LIKE '%009') AND hp.plan_code = 'GAMMA003';

-- =====================================================
-- SAMPLE CLAIMS DATA
-- =====================================================

-- Generate realistic claims with varied scenarios
DO $$
DECLARE
    claim_counter INTEGER := 1;
    member_rec RECORD;
    provider_rec RECORD;
    service_date DATE;
    claim_amount DECIMAL(10,2);
    claim_id_var UUID;
BEGIN
    -- Create claims for each member
    FOR member_rec IN SELECT member_id, health_plan_id FROM member_enrollments LOOP
        -- Generate 3-8 claims per member
        FOR i IN 1..(3 + floor(random() * 6)::int) LOOP
            -- Random service date in last 12 months
            service_date := CURRENT_DATE - (random() * 365)::int;
            
            -- Random claim amount based on service type
            claim_amount := CASE 
                WHEN random() < 0.1 THEN 15000 + (random() * 50000)::decimal(10,2) -- 10% high-cost claims
                WHEN random() < 0.3 THEN 1000 + (random() * 5000)::decimal(10,2)   -- 20% medium claims
                ELSE 50 + (random() * 500)::decimal(10,2)                          -- 70% routine claims
            END;
            
            -- Select random provider
            SELECT provider_id INTO provider_rec FROM providers ORDER BY random() LIMIT 1;
            
            -- Insert claim
            INSERT INTO claims (
                claim_number, member_id, health_plan_id, billing_provider_id,
                claim_type, claim_status, service_date_from, service_date_to,
                total_billed_amount, total_allowed_amount, total_paid_amount, member_responsibility,
                diagnosis_code_primary, place_of_service_code, submitted_date, received_date,
                processed_date, paid_date
            ) VALUES (
                'CLM' || LPAD(claim_counter::text, 7, '0'),
                member_rec.member_id,
                member_rec.health_plan_id,
                provider_rec.provider_id,
                CASE 
                    WHEN random() < 0.8 THEN 'MEDICAL'
                    WHEN random() < 0.9 THEN 'PHARMACY'
                    ELSE 'DENTAL'
                END,
                CASE 
                    WHEN random() < 0.7 THEN 'PAID'
                    WHEN random() < 0.85 THEN 'PROC'
                    WHEN random() < 0.95 THEN 'APPROVE'
                    ELSE 'DENIED'
                END,
                service_date,
                service_date + (random() * 3)::int, -- Service end date
                claim_amount,
                claim_amount * (0.8 + random() * 0.2), -- Allowed amount
                claim_amount * (0.7 + random() * 0.2), -- Paid amount  
                claim_amount * (0.1 + random() * 0.1), -- Member responsibility
                CASE (random() * 5)::int
                    WHEN 0 THEN 'Z00.00' -- Routine checkup
                    WHEN 1 THEN 'I10'    -- Hypertension
                    WHEN 2 THEN 'E11.9'  -- Diabetes
                    WHEN 3 THEN 'M79.3'  -- Back pain
                    ELSE 'K21.9'         -- GERD
                END,
                CASE (random() * 4)::int
                    WHEN 0 THEN '11'     -- Office
                    WHEN 1 THEN '21'     -- Inpatient
                    WHEN 2 THEN '22'     -- Outpatient
                    ELSE '23'            -- Emergency
                END,
                service_date + 1 + (random() * 5)::int,  -- Submitted date
                service_date + 2 + (random() * 5)::int,  -- Received date
                service_date + 5 + (random() * 10)::int, -- Processed date
                service_date + 10 + (random() * 10)::int -- Paid date
            ) RETURNING claim_id INTO claim_id_var;
            
            -- Add claim lines for each claim
            INSERT INTO claim_lines (
                claim_id, line_number, procedure_code, service_date,
                units_of_service, billed_amount, allowed_amount, paid_amount,
                deductible_amount, copay_amount, coinsurance_amount
            ) VALUES (
                claim_id_var, 1,
                CASE (random() * 10)::int
                    WHEN 0 THEN '99213'  -- Office visit
                    WHEN 1 THEN '99214'  -- Office visit complex
                    WHEN 2 THEN '80053'  -- Lab work
                    WHEN 3 THEN '71020'  -- Chest X-ray
                    WHEN 4 THEN '93000'  -- EKG
                    WHEN 5 THEN '85025'  -- CBC
                    WHEN 6 THEN '36415'  -- Blood draw
                    WHEN 7 THEN '90788'  -- Injection
                    WHEN 8 THEN '99203'  -- New patient visit
                    ELSE '99393'         -- Preventive visit
                END,
                service_date,
                1.00,
                claim_amount,
                claim_amount * (0.8 + random() * 0.2),
                claim_amount * (0.7 + random() * 0.2),
                claim_amount * 0.1,
                25.00, -- Copay
                claim_amount * 0.1  -- Coinsurance
            );
            
            claim_counter := claim_counter + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Generated % sample claims', claim_counter - 1;
END $$;

-- =====================================================
-- SAMPLE API CLIENTS
-- =====================================================

INSERT INTO api_clients (client_name, client_description, organization_name, contact_email, client_type, api_key_hash) VALUES
('Provider Portal Integration', 'Integration for provider web portal', 'Metro General Hospital', 'it@metrogh.com', 'PARTNER', encode(sha256('dev-key-001'::bytea), 'hex')),
('Claims Processing System', 'Automated claims processing integration', 'Acme Health Plan', 'dev@acmehealth.com', 'INTERNAL', encode(sha256('dev-key-002'::bytea), 'hex')),
('Mobile App Backend', 'Backend services for member mobile app', 'Beta Care Network', 'mobile@betacare.com', 'INTERNAL', encode(sha256('dev-key-003'::bytea), 'hex')),
('Reporting Service', 'Analytics and reporting integration', 'Third Party Analytics', 'reports@analytics.com', 'VENDOR', encode(sha256('dev-key-004'::bytea), 'hex'));

-- =====================================================
-- SAMPLE SYSTEM USERS
-- =====================================================

-- Create sample application users for testing
INSERT INTO app_users (username, email, first_name, last_name, department, job_title, password_hash) VALUES
('jdoe', 'john.doe@facetsproject.com', 'John', 'Doe', 'Claims', 'Claims Processor', crypt('TempPass123!', gen_salt('bf'))),
('ssmith', 'sarah.smith@facetsproject.com', 'Sarah', 'Smith', 'Member Services', 'Member Services Rep', crypt('TempPass123!', gen_salt('bf'))),
('mwilson', 'mike.wilson@facetsproject.com', 'Mike', 'Wilson', 'Provider Relations', 'Provider Relations Manager', crypt('TempPass123!', gen_salt('bf'))),
('ljohnson', 'lisa.johnson@facetsproject.com', 'Lisa', 'Johnson', 'Finance', 'Finance Analyst', crypt('TempPass123!', gen_salt('bf'))),
('rbrown', 'robert.brown@facetsproject.com', 'Robert', 'Brown', 'Compliance', 'Compliance Officer', crypt('TempPass123!', gen_salt('bf')));

-- Assign roles to users
DO $$
DECLARE
    user_role_mappings RECORD;
BEGIN
    FOR user_role_mappings IN 
        VALUES 
            ('jdoe', 'Claims Processor'),
            ('ssmith', 'Member Services'),
            ('mwilson', 'Provider Relations'),
            ('ljohnson', 'Finance Manager'),
            ('rbrown', 'Compliance Officer')
    LOOP
        INSERT INTO user_roles (user_id, role_id, granted_by)
        SELECT 
            u.user_id, 
            r.role_id,
            (SELECT user_id FROM app_users WHERE username = 'admin')
        FROM app_users u, roles r
        WHERE u.username = user_role_mappings.column1 
        AND r.role_name = user_role_mappings.column2;
    END LOOP;
END $$;

-- =====================================================
-- SAMPLE AUDIT DATA
-- =====================================================

-- Generate some sample audit log entries
INSERT INTO audit_log (user_id, username, action_type, resource_type, resource_id, table_name, contains_phi)
SELECT 
    u.user_id,
    u.username,
    CASE (random() * 4)::int
        WHEN 0 THEN 'SELECT'
        WHEN 1 THEN 'UPDATE'
        WHEN 2 THEN 'INSERT'
        ELSE 'DELETE'
    END,
    CASE (random() * 3)::int
        WHEN 0 THEN 'MEMBER'
        WHEN 1 THEN 'CLAIM'
        ELSE 'PROVIDER'
    END,
    gen_random_uuid()::text,
    CASE (random() * 3)::int
        WHEN 0 THEN 'members'
        WHEN 1 THEN 'claims'
        ELSE 'providers'
    END,
    TRUE
FROM app_users u
WHERE u.username != 'admin'
ORDER BY random()
LIMIT 50;

-- =====================================================
-- PERFORMANCE SETUP
-- =====================================================

-- Update statistics for better query performance
ANALYZE members;
ANALYZE claims; 
ANALYZE claim_lines;
ANALYZE providers;
ANALYZE health_plans;

-- Refresh materialized views
SELECT refresh_analytics_views();

-- =====================================================
-- COMPLETION SUMMARY
-- =====================================================

DO $$
DECLARE
    member_count INTEGER;
    claim_count INTEGER;
    provider_count INTEGER;
    plan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO member_count FROM members;
    SELECT COUNT(*) INTO claim_count FROM claims;
    SELECT COUNT(*) INTO provider_count FROM providers;
    SELECT COUNT(*) INTO plan_count FROM health_plans;
    
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'SAMPLE DATA LOADING COMPLETED';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Health Plans: %', plan_count;
    RAISE NOTICE 'Providers: %', provider_count;
    RAISE NOTICE 'Members: %', member_count;
    RAISE NOTICE 'Claims: %', claim_count;
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Sample users created (password: TempPass123!):';
    RAISE NOTICE '- admin (System Administrator)';
    RAISE NOTICE '- jdoe (Claims Processor)';
    RAISE NOTICE '- ssmith (Member Services)';
    RAISE NOTICE '- mwilson (Provider Relations)';
    RAISE NOTICE '- ljohnson (Finance Manager)';
    RAISE NOTICE '- rbrown (Compliance Officer)';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Ready for application testing and development!';
END $$;