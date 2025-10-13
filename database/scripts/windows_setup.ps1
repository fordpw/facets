# PostgreSQL Installation and Setup Script for Windows
# Run this script as Administrator

param(
    [string]$PostgreSQLVersion = "16",
    [string]$DatabaseName = "healthcare_db",
    [string]$Username = "postgres",
    [string]$Password = "healthcare123!"
)

Write-Host "🏥 Setting up PostgreSQL for Healthcare Database System" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Check if running as administrator
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script needs to be run as Administrator" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Check if Chocolatey is installed
try {
    choco --version | Out-Null
    Write-Host "✓ Chocolatey found" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing Chocolatey package manager..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    refreshenv
}

# Install PostgreSQL
Write-Host "🐘 Installing PostgreSQL $PostgreSQLVersion..." -ForegroundColor Yellow
try {
    choco install postgresql$PostgreSQLVersion --params "/Password:$Password" -y
    Write-Host "✓ PostgreSQL installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install PostgreSQL" -ForegroundColor Red
    Write-Host "Please install manually from https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Add PostgreSQL to PATH if not already there
$pgPath = "C:\Program Files\PostgreSQL\$PostgreSQLVersion\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$pgPath*") {
    Write-Host "🔧 Adding PostgreSQL to system PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$pgPath", "Machine")
    $env:Path += ";$pgPath"
}

# Wait for PostgreSQL service to start
Write-Host "⏳ Waiting for PostgreSQL service to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test PostgreSQL connection
Write-Host "🧪 Testing PostgreSQL connection..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = $Password
    psql -U $Username -d postgres -c "SELECT version();" | Out-Null
    Write-Host "✓ PostgreSQL connection successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to connect to PostgreSQL" -ForegroundColor Red
    Write-Host "Please check the installation and try again" -ForegroundColor Yellow
    exit 1
}

# Create healthcare database
Write-Host "🏥 Creating healthcare database..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = $Password
    createdb -U $Username $DatabaseName
    Write-Host "✓ Database '$DatabaseName' created successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Database may already exist or creation failed" -ForegroundColor Yellow
}

# Set up environment variables
Write-Host "🔧 Setting up environment variables..." -ForegroundColor Yellow
[Environment]::SetEnvironmentVariable("DATABASE_URL", "postgresql://${Username}:${Password}@localhost:5432/${DatabaseName}", "User")
[Environment]::SetEnvironmentVariable("APP_ENVIRONMENT", "dev", "User")
[Environment]::SetEnvironmentVariable("APP_ENCRYPTION_KEY", "healthcare-dev-key-$(Get-Random)", "User")

Write-Host ""
Write-Host "🎉 PostgreSQL setup complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Database: $DatabaseName" -ForegroundColor Cyan
Write-Host "Username: $Username" -ForegroundColor Cyan
Write-Host "Password: $Password" -ForegroundColor Cyan
Write-Host "Host: localhost" -ForegroundColor Cyan
Write-Host "Port: 5432" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your PowerShell session to load new environment variables" -ForegroundColor White
Write-Host "2. Run: .\database\scripts\initialize_database.ps1" -ForegroundColor White
Write-Host ""