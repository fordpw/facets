# 🚀 Quick Setup Guide

Get your healthcare database system up and running in 5 minutes!

## Step 1: Install PostgreSQL

**Option A: Automated Installation (Recommended)**
```powershell
# Run as Administrator
.\database\scripts\windows_setup.ps1
```

**Option B: Manual Installation**
1. Download PostgreSQL 16 from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Remember your postgres user password
4. Add PostgreSQL to your PATH

## Step 2: Initialize Database

```powershell
# Initialize complete healthcare database system
.\database\scripts\initialize_database.ps1

# Or with custom settings:
.\database\scripts\initialize_database.ps1 -Password "yourpassword" -DatabaseName "healthcare_db"
```

## Step 3: Test Installation

```powershell
# Test database connection
$env:PGPASSWORD = "healthcare123!"
psql -U postgres -d healthcare_db -c "SELECT * FROM v_migration_status;"

# View sample data
psql -U postgres -d healthcare_db -c "SELECT * FROM v_claims_dashboard LIMIT 3;"
```

## What Gets Installed

✅ **Complete Healthcare Database** (80+ tables)
- Members, providers, claims, health plans
- Analytics and fraud detection
- API management and monitoring  
- HIPAA audit and compliance system

✅ **Sample Data for Testing**
- 10 members with realistic demographics
- 50+ claims with varied amounts and procedures
- 8 providers across different specialties
- 3 health plans (PPO, HMO, Medicare Advantage)

✅ **Business Intelligence Views**
- Claims processing dashboard
- Provider performance metrics
- Member cost analysis
- Fraud detection alerts

✅ **Enterprise Features**
- Performance optimization (indexes, partitioning)
- Migration system for schema changes
- Comprehensive monitoring and alerting
- HIPAA-compliant audit logging

## Default Credentials

**Database:**
- Host: localhost
- Port: 5432
- Database: healthcare_db
- Username: postgres
- Password: healthcare123!

**Application Admin:**
- Username: admin
- Password: TempPassword123!

**Sample Users:**
- jdoe / TempPass123! (Claims Processor)
- ssmith / TempPass123! (Member Services)
- mwilson / TempPass123! (Provider Relations)

## Next Steps

1. **Choose a Product Opportunity**
   - Claims Analytics Dashboard ($10K-100K+ annual revenue)
   - API Integration Platform ($50-500/month per client)
   - Provider Portal Enhancement ($25K-200K+ implementation)

2. **Set Up Development Environment**
   - Choose your tech stack (Node.js, .NET, Python, etc.)
   - Set up API framework
   - Connect to the database

3. **Build Your MVP**
   - Use the existing views and data for quick demos
   - Implement core functionality
   - Test with sample data

## Troubleshooting

**"psql command not found"**
```powershell
# Add PostgreSQL to PATH manually
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"
```

**Connection failed**
```powershell
# Check if PostgreSQL service is running
Get-Service postgresql*
```

**Permission denied**
```powershell
# Run PowerShell as Administrator
Start-Process powershell -Verb runAs
```

## Database Schema Overview

```sql
-- Core entities
members (10 sample records)
claims (50+ sample records) 
providers (8 sample records)
health_plans (3 sample plans)

-- Analytics tables
fact_claims_daily
fact_member_utilization  
fact_provider_performance

-- API management
api_clients
api_requests
api_rate_limits

-- Audit & compliance  
audit_log
phi_access_log
security_events
```

## Key Views to Explore

```sql
-- Business intelligence
SELECT * FROM v_claims_dashboard;
SELECT * FROM v_provider_performance;
SELECT * FROM v_member_costs;
SELECT * FROM v_high_cost_claims;

-- System monitoring
SELECT * FROM v_system_health;
SELECT * FROM v_api_usage_summary;

-- Compliance reporting  
SELECT * FROM v_phi_access_summary;
SELECT * FROM v_user_activity_summary;
```

You're now ready to build healthcare applications! 🏥✨