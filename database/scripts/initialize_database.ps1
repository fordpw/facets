# Healthcare Database Initialization Script
# Initializes the complete healthcare database system

param(
    [string]$DatabaseName = "healthcare_db",
    [string]$Username = "postgres", 
    [string]$Password = "healthcare123!",
    [switch]$LoadSampleData = $true,
    [switch]$SkipConfirmation = $false
)

Write-Host "🏥 Initializing Healthcare Database System" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Set password for psql commands
$env:PGPASSWORD = $Password

# Test database connection
Write-Host "🔌 Testing database connection..." -ForegroundColor Yellow
try {
    psql -U $Username -d $DatabaseName -c "SELECT 1;" | Out-Null
    Write-Host "✓ Database connection successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to connect to database" -ForegroundColor Red
    Write-Host "Please ensure PostgreSQL is running and database exists" -ForegroundColor Yellow
    Write-Host "Run: .\database\scripts\windows_setup.ps1 first" -ForegroundColor Yellow
    exit 1
}

# Show what will be installed
Write-Host ""
Write-Host "This will install:" -ForegroundColor Cyan
Write-Host "✓ Migration tracking system" -ForegroundColor White
Write-Host "✓ Core healthcare entities (Members, Providers, Claims)" -ForegroundColor White  
Write-Host "✓ Analytics and reporting tables" -ForegroundColor White
Write-Host "✓ API integration and monitoring" -ForegroundColor White
Write-Host "✓ HIPAA audit and compliance system" -ForegroundColor White
Write-Host "✓ Performance optimization (indexes, views)" -ForegroundColor White
if ($LoadSampleData) {
    Write-Host "✓ Sample data (10 members, 50+ claims, 8 providers)" -ForegroundColor White
}
Write-Host ""

if (-not $SkipConfirmation) {
    $confirm = Read-Host "Proceed with installation? (y/N)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Host "Installation cancelled" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "🚀 Starting database initialization..." -ForegroundColor Green

# Step 1: Create migration tracking table
Write-Host ""
Write-Host "📋 Step 1: Creating migration tracking system..." -ForegroundColor Yellow
try {
    psql -U $Username -d $DatabaseName -f "database/migrations/000_create_migrations_table.sql"
    Write-Host "✓ Migration system initialized" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create migration system" -ForegroundColor Red
    exit 1
}

# Step 2: Core healthcare entities
Write-Host ""
Write-Host "🏥 Step 2: Creating core healthcare entities..." -ForegroundColor Yellow
try {
    psql -U $Username -d $DatabaseName -f "database/schemas/01_core_entities.sql"
    Write-Host "✓ Core entities created (Members, Providers, Claims, Plans)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create core entities" -ForegroundColor Red
    exit 1
}

# Step 3: Analytics schema
Write-Host ""
Write-Host "📊 Step 3: Creating analytics and reporting system..." -ForegroundColor Yellow  
try {
    psql -U $Username -d $DatabaseName -f "database/schemas/02_analytics_schema.sql"
    Write-Host "✓ Analytics system created (Fact tables, Views, Fraud detection)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create analytics schema" -ForegroundColor Red
    exit 1
}

# Step 4: API integration schema
Write-Host ""
Write-Host "🔌 Step 4: Creating API integration and monitoring..." -ForegroundColor Yellow
try {
    psql -U $Username -d $DatabaseName -f "database/schemas/03_api_integration_schema.sql"
    Write-Host "✓ API system created (Clients, Rate limiting, Monitoring)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create API integration schema" -ForegroundColor Red  
    exit 1
}

# Step 5: Audit and compliance schema
Write-Host ""
Write-Host "🔐 Step 5: Creating audit and compliance system..." -ForegroundColor Yellow
try {
    psql -U $Username -d $DatabaseName -f "database/schemas/04_audit_compliance_schema.sql"
    Write-Host "✓ Audit system created (HIPAA compliance, Security monitoring)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create audit and compliance schema" -ForegroundColor Red
    exit 1
}

# Step 6: Load sample data (optional)
if ($LoadSampleData) {
    Write-Host ""
    Write-Host "📚 Step 6: Loading sample data..." -ForegroundColor Yellow
    try {
        psql -U $Username -d $DatabaseName -f "database/seeds/sample_data.sql"
        Write-Host "✓ Sample data loaded successfully" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Failed to load sample data (schema still functional)" -ForegroundColor Yellow
    }
}

# Verify installation
Write-Host ""
Write-Host "🧪 Verifying installation..." -ForegroundColor Yellow

# Count tables
$tableCount = psql -U $Username -d $DatabaseName -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>$null
$tableCount = $tableCount.Trim()

# Count sample data
if ($LoadSampleData) {
    $memberCount = psql -U $Username -d $DatabaseName -t -c "SELECT COUNT(*) FROM members;" 2>$null
    $claimCount = psql -U $Username -d $DatabaseName -t -c "SELECT COUNT(*) FROM claims;" 2>$null
    $providerCount = psql -U $Username -d $DatabaseName -t -c "SELECT COUNT(*) FROM providers;" 2>$null
    
    $memberCount = $memberCount.Trim()
    $claimCount = $claimCount.Trim()  
    $providerCount = $providerCount.Trim()
}

# Check views
$viewCount = psql -U $Username -d $DatabaseName -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public';" 2>$null
$viewCount = $viewCount.Trim()

Write-Host ""
Write-Host "🎉 Database initialization complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host "Database: $DatabaseName" -ForegroundColor Cyan
Write-Host "Tables created: $tableCount" -ForegroundColor Cyan
Write-Host "Views created: $viewCount" -ForegroundColor Cyan

if ($LoadSampleData) {
    Write-Host ""
    Write-Host "Sample Data:" -ForegroundColor Cyan
    Write-Host "  Members: $memberCount" -ForegroundColor White
    Write-Host "  Claims: $claimCount" -ForegroundColor White  
    Write-Host "  Providers: $providerCount" -ForegroundColor White
}

Write-Host ""
Write-Host "Test the installation:" -ForegroundColor Yellow
Write-Host "  psql -U $Username -d $DatabaseName -c `"SELECT * FROM v_migration_status;`"" -ForegroundColor White

if ($LoadSampleData) {
    Write-Host "  psql -U $Username -d $DatabaseName -c `"SELECT * FROM v_claims_dashboard;`"" -ForegroundColor White
}

Write-Host ""
Write-Host "Default admin login (change password immediately):" -ForegroundColor Yellow  
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: TempPassword123!" -ForegroundColor White

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the database with the commands above" -ForegroundColor White
Write-Host "2. Choose a product opportunity to build" -ForegroundColor White  
Write-Host "3. Set up your development environment" -ForegroundColor White