# Healthcare Database System

A comprehensive, enterprise-grade database system designed for healthcare applications working with Trizetto Facets. This system provides complete schemas for claims processing, member management, provider networks, analytics, API management, and HIPAA compliance.

## 🏗️ Architecture Overview

### Core Components
- **Healthcare Entities** (`01_core_entities.sql`) - Members, providers, claims, health plans
- **Analytics & Reporting** (`02_analytics_schema.sql`) - Business intelligence, fraud detection, reporting views
- **API Management** (`03_api_integration_schema.sql`) - API clients, rate limiting, system monitoring
- **Audit & Compliance** (`04_audit_compliance_schema.sql`) - HIPAA logging, security monitoring, user management

### Key Features
- ✅ **HIPAA Compliant** - Comprehensive audit logging and PHI protection
- ✅ **Enterprise Scale** - Designed for 1M+ claims per day processing
- ✅ **High Performance** - Optimized indexes and partitioning strategies
- ✅ **Real-time Analytics** - Fraud detection and business intelligence
- ✅ **API Integration** - Full API management and monitoring
- ✅ **Migration Support** - Version-controlled schema changes
- ✅ **Sample Data** - Realistic test data for development

## 🚀 Quick Start

### Prerequisites
- PostgreSQL 13+ (primary) or SQL Server 2019+ (secondary support)
- 16GB+ RAM recommended for production
- SSD storage for optimal performance

### Installation

#### 1. Database Setup
```powershell
# Create database
createdb healthcare_db

# Set environment variables (optional)
$env:APP_ENVIRONMENT = "dev"
$env:APP_ENCRYPTION_KEY = "your-encryption-key-here"
```

#### 2. Initialize Schema
```powershell
# Run complete initialization
psql -d healthcare_db -f database/scripts/init_database.sql

# Or step by step:
psql -d healthcare_db -f database/migrations/000_create_migrations_table.sql
psql -d healthcare_db -f database/schemas/01_core_entities.sql
psql -d healthcare_db -f database/schemas/02_analytics_schema.sql
psql -d healthcare_db -f database/schemas/03_api_integration_schema.sql
psql -d healthcare_db -f database/schemas/04_audit_compliance_schema.sql
```

#### 3. Load Sample Data (Development Only)
```powershell
psql -d healthcare_db -f database/seeds/sample_data.sql
```

### Verification
```sql
-- Check installation
SELECT * FROM v_migration_status;

-- View sample data
SELECT COUNT(*) as members FROM members;
SELECT COUNT(*) as claims FROM claims;
SELECT COUNT(*) as providers FROM providers;

-- Test views
SELECT * FROM v_claims_dashboard LIMIT 5;
SELECT * FROM v_provider_performance LIMIT 5;
```

## 📊 Database Schema

### Core Healthcare Entities

#### Members
```sql
members                    -- Core member demographics
member_enrollments        -- Health plan enrollment history  
member_pcp_assignments    -- Primary care provider assignments
```

#### Providers  
```sql
providers                 -- Individual healthcare providers
provider_organizations    -- Hospitals, clinics, groups
provider_networks        -- Network participation by health plan
medical_specialties      -- Provider specialty reference data
```

#### Claims
```sql
claims                   -- Healthcare claims header data
claim_lines             -- Individual claim line items (procedures)
claim_status_codes      -- Status reference data
```

#### Health Plans
```sql
health_plans            -- Insurance plans/payers
product_lines          -- Product offerings within plans
plan_types             -- HMO, PPO, EPO reference data
```

### Analytics & Reporting

#### Fact Tables
```sql
fact_claims_daily           -- Daily aggregated claims metrics
fact_member_utilization    -- Monthly member utilization patterns
fact_provider_performance  -- Monthly provider performance metrics
```

#### Fraud Detection
```sql
fraud_detection_rules      -- Configurable fraud detection rules
fraud_alerts              -- Generated alerts requiring investigation  
provider_risk_scores      -- Provider fraud risk assessments
```

#### Business Intelligence Views
```sql
v_claims_dashboard        -- Real-time claims processing metrics
v_provider_performance    -- 90-day provider performance summary
v_member_costs           -- 12-month member cost analysis
v_high_cost_claims       -- Claims exceeding $25,000
```

### API Management & Monitoring

#### API Infrastructure
```sql
api_clients              -- API consumer applications
api_endpoints           -- Available API endpoints and configurations
api_client_permissions  -- Endpoint access permissions
api_requests           -- High-volume API request logging
api_rate_limits        -- Rate limiting tracking and enforcement
```

#### System Monitoring
```sql
integrations              -- External system integrations
integration_health_checks -- Health monitoring for integrations
sync_jobs                -- Data synchronization job management
system_metrics           -- System performance metrics
system_errors           -- Error and exception tracking
```

### Audit & Compliance

#### User Management
```sql
app_users               -- Application users
roles                   -- Role-based access control
user_roles             -- User role assignments
permissions            -- Fine-grained permissions
role_permissions       -- Role permission mappings
```

#### Audit Logging
```sql
audit_log              -- Comprehensive audit trail
login_audit           -- Login/logout tracking
phi_access_log        -- PHI access tracking (HIPAA)
data_exports          -- Data export/download tracking
```

#### Security & Compliance
```sql
security_events        -- Security incidents and monitoring
hipaa_violations      -- HIPAA compliance violation tracking
data_retention_log    -- Data retention policy compliance
failed_login_attempts -- Security monitoring
```

## 🔧 Configuration

### Environment Variables
```bash
# Database connection
DATABASE_URL=postgresql://user:pass@host:5432/healthcare_db

# Application settings
APP_ENVIRONMENT=dev|test|staging|prod
APP_ENCRYPTION_KEY=your-secure-encryption-key

# Performance settings
DB_POOL_SIZE=100
DB_MAX_CONNECTIONS=1000
```

### PostgreSQL Configuration
See `database/docs/performance_optimization.md` for detailed configuration:

```sql
-- Memory settings (32GB RAM server)
shared_buffers = 8GB
work_mem = 256MB  
maintenance_work_mem = 2GB
effective_cache_size = 24GB

-- Performance settings
random_page_cost = 1.1
default_statistics_target = 1000
constraint_exclusion = partition
```

## 🚀 Performance Features

### Indexing Strategy
- **Composite indexes** for multi-column queries
- **Partial indexes** for active records only  
- **Covering indexes** to avoid table lookups
- **Expression indexes** for computed values
- **Full-text search** for provider/member lookups

### Partitioning
- **Monthly partitions** for claims and audit logs
- **Automatic partition creation** functions
- **Partition pruning** for query optimization
- **Vertical partitioning** for PHI data separation

### Query Optimization
- **Materialized views** for complex aggregations
- **Query plan analysis** tools and views
- **Performance monitoring** functions
- **Automated maintenance** procedures

## 📈 Monitoring & Maintenance

### Performance Monitoring
```sql
-- Database health
SELECT * FROM v_database_performance;

-- Index usage statistics  
SELECT * FROM v_index_usage WHERE usage_level = 'Unused';

-- Slow queries
SELECT * FROM v_slow_queries LIMIT 10;

-- System health
SELECT * FROM v_system_health;
```

### Automated Maintenance
```sql
-- Daily maintenance (run via cron)
SELECT daily_maintenance();

-- Performance alerts
SELECT check_performance_alerts();

-- Migration status
SELECT * FROM get_migration_status_summary();
```

### Backup & Recovery
```bash
# Daily backup
pg_dump healthcare_db > backup_$(date +%Y%m%d).sql

# Point-in-time recovery setup
archive_mode = on
archive_command = 'cp %p /backup/archive/%f'
wal_level = replica
```

## 🔐 Security & Compliance

### HIPAA Compliance
- **PHI Access Logging** - All PHI access automatically logged
- **Audit Trail** - Complete audit trail for all data changes
- **Encryption** - SSN and sensitive data encrypted at rest
- **User Management** - Role-based access control
- **Data Retention** - Automated compliance with retention policies

### Security Features
- **Failed Login Monitoring** - Automatic account lockout
- **Security Event Tracking** - Comprehensive incident monitoring
- **API Security** - Rate limiting and authentication tracking
- **Data Export Monitoring** - All exports logged and authorized

### Default Users (Development Only)
```
Username: admin          Password: TempPassword123!
Username: jdoe           Password: TempPass123!
Username: ssmith         Password: TempPass123!
Username: mwilson        Password: TempPass123!
```

## 📋 Migration Management

### Creating Migrations
```bash
# Copy template
cp database/migrations/migration_template.sql database/migrations/001_add_new_feature.sql

# Edit migration details
# Run migration
psql -d healthcare_db -f database/migrations/001_add_new_feature.sql
```

### Migration Status
```sql
-- View all migrations
SELECT * FROM v_migration_status;

-- Check for pending migrations  
SELECT * FROM get_pending_migrations();
```

## 🧪 Testing

### Sample Data
The sample data includes:
- **3 Health Plans** (Acme PPO, Beta HMO, Gamma Medicare)
- **8 Providers** across different specialties
- **10 Members** with varied demographics
- **50+ Claims** with realistic amounts and procedures
- **Sample Users** with different roles

### Load Testing
```sql
-- Simulate member lookups
DO $$ ... END $$; -- See performance_optimization.md

-- Simulate claims processing
-- Load testing queries provided in documentation
```

## 📚 API Integration

### Common Endpoints
```
GET /api/v1/members          -- List members
GET /api/v1/members/{id}     -- Get specific member  
GET /api/v1/claims           -- List claims
POST /api/v1/claims          -- Submit new claim
GET /api/v1/providers        -- List providers
POST /api/v1/eligibility     -- Verify eligibility
```

### API Monitoring
- **Request/Response Logging** - All API calls tracked
- **Rate Limiting** - Configurable per client/endpoint
- **Performance Metrics** - Response times and error rates
- **Client Management** - API key management and permissions

## 🔄 Integration Points

### Trizetto Facets
- **Member Data Sync** - Real-time member updates
- **Claims Processing** - Bi-directional claims flow
- **Provider Network** - Provider participation updates
- **Eligibility Verification** - Real-time eligibility checks

### External Systems
- **EDI Clearinghouses** - 837/835/834/270/271 transactions
- **Government Systems** - CMS, state agencies
- **Provider Portals** - Provider self-service
- **Member Applications** - Mobile and web apps

## 📝 Development Guide

### Adding New Features
1. Design schema changes
2. Create migration using template
3. Update relevant views and indexes
4. Add performance optimizations
5. Update documentation
6. Test with sample data

### Best Practices
- Always use migrations for schema changes
- Include performance considerations from the start
- Follow HIPAA compliance patterns
- Add comprehensive audit logging
- Document all changes

## 🆘 Support & Troubleshooting

### Common Issues
- **Slow Queries** - Check `v_slow_queries` and add indexes
- **High Memory Usage** - Adjust `work_mem` and `shared_buffers`
- **Lock Contention** - Review concurrent operations
- **Disk Space** - Archive old partitions and audit logs

### Performance Tuning
See `database/docs/performance_optimization.md` for:
- Index optimization strategies
- Query performance tuning
- Memory configuration
- Partitioning approaches
- Scale-out strategies

### Getting Help
1. Check performance monitoring views
2. Review audit logs for issues
3. Analyze slow queries
4. Check system metrics
5. Review migration status

---

## 📋 Quick Reference

### Key Commands
```bash
# Initialize database
psql -d healthcare_db -f database/scripts/init_database.sql

# Load sample data  
psql -d healthcare_db -f database/seeds/sample_data.sql

# Check status
psql -d healthcare_db -c "SELECT * FROM v_migration_status;"

# Performance check
psql -d healthcare_db -c "SELECT check_performance_alerts();"
```

### Important Views
- `v_migration_status` - Migration status
- `v_claims_dashboard` - Claims metrics
- `v_system_health` - System status
- `v_api_usage_summary` - API usage
- `v_phi_access_summary` - PHI access compliance

This database system provides a robust foundation for healthcare applications with enterprise-scale performance, comprehensive compliance features, and extensive monitoring capabilities.