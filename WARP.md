# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a healthcare payer platform project designed to work with **Trizetto Facets**, a comprehensive core administration system for health insurance organizations. The project handles sensitive healthcare data and must comply with HIPAA regulations.

### Key Domain Areas
- **Claims Processing**: Adjudication workflows, payment processing, denial management
- **Member Management**: Enrollment, eligibility verification, member communications
- **Provider Network**: Provider credentialing, contract management, payment processing  
- **Financial Management**: Revenue cycle, financial reporting, reconciliation
- **Regulatory Compliance**: HIPAA, ACA, state regulations, audit trails

## Architecture

The project follows a standard healthcare system architecture:

```
├── src/           # Source code (currently empty - ready for development)
├── docs/          # Documentation
├── scripts/       # Utility and deployment scripts
├── config/        # Environment configurations (excludes production configs)
├── tests/         # Test suites
```

**Note**: This repository appears to be newly initialized with directory structure in place but no source code yet. When development begins, the architecture will likely follow these patterns:

- **Data Layer**: Secure database interactions with audit logging
- **Business Logic**: Claims processing rules, eligibility verification, workflow engines  
- **Integration Layer**: APIs for external systems (clearinghouses, providers, government systems)
- **Security Layer**: Encryption, authentication, authorization, audit logging
- **Presentation Layer**: User interfaces for different user roles (claims processors, member services, etc.)

## Development Commands

### Documentation Analysis
```powershell
# Analyze Facets documentation for product opportunities
python tools/doc_analyzer.py <path-to-documentation>

# Analyze entire documentation directory
python tools/doc_analyzer.py docs/ --output docs/analysis

# Install PDF analysis dependencies
pip install PyPDF2 pdfplumber python-docx
```

### Research and Validation
```powershell
# Use market opportunity template for new product ideas
cp research/market-opportunity-template.md research/[product-name]-analysis.md

# Follow validation framework
# See research/validation-framework.md for systematic approach
```

### Development Environment
```powershell
# Set up development environment (when tech stack chosen)
# See docs/development-architecture.md for detailed setup

# Example Docker-based setup:
docker-compose up -d  # Start development services
docker-compose logs   # View service logs
docker-compose down   # Stop services
```

### Testing
```powershell
# Run all tests (command will depend on chosen framework)
# Example patterns:
# dotnet test                    # For .NET projects
# npm test                       # For Node.js projects  
# python -m pytest tests/       # For Python projects
# go test ./...                  # For Go projects
```

### Building
```powershell
# Build commands will vary by technology stack
# Ensure HIPAA compliance checks are integrated into build process
```

## Security and Compliance Requirements

### HIPAA Compliance
- All patient data must be encrypted at rest and in transit
- Implement comprehensive audit logging for all data access
- Ensure proper user authentication and authorization
- Follow minimum necessary principle for data access

### Development Practices
- Never include real PHI (Protected Health Information) in development/test environments
- Use synthetic or de-identified test data only
- All configuration files with sensitive data are git-ignored (see .gitignore)
- Production configurations are excluded from version control

### Data Security
- Sensitive files (*.key, *.pem, *.p12, *.pfx) are automatically excluded
- Environment variables for sensitive data should use .env files (git-ignored)
- Production configs (config/prod.*, config/production.*) are excluded

## Facets-Specific Considerations

### Integration Points
- **Facets APIs**: Core system integration for claims, members, providers
- **EDI Transactions**: 837 (claims), 835 (remittance), 834 (enrollment), 270/271 (eligibility)
- **Clearinghouses**: Claims submission and status inquiries
- **Government Systems**: CMS, state Medicaid systems, marketplace APIs

### Common Data Formats
- **X12 EDI**: Standard healthcare transaction formats
- **HL7**: Clinical data exchange (if applicable)
- **JSON/XML**: Modern API integrations
- **CSV**: Reporting and bulk data operations

### Workflow Patterns
- **Claims Lifecycle**: Submission → Validation → Adjudication → Payment/Denial
- **Member Lifecycle**: Enrollment → Eligibility → Services → Termination
- **Provider Management**: Credentialing → Contracting → Claims Processing → Payment

## File Patterns

### Ignored Files
The project excludes sensitive and temporary files:
- Facets-specific: `*.facets`, `facets_temp/`, `facets_backup/`
- Security credentials: `*.key`, `*.pem`, `*.p12`, `*.pfx`
- Production configs: `config/prod.*`, `config/production.*`
- Environment files: `.env*`

### Expected File Types
When development begins, expect these patterns:
- Configuration files for different environments (dev, test, staging)
- Database migration scripts with version control
- Integration mapping files for EDI transactions
- Business rules configuration files
- Audit logging configuration

## Product Development Framework

This repository includes a comprehensive framework for building products in the Facets ecosystem:

### Research and Analysis Tools
- **Documentation Analyzer**: `tools/doc_analyzer.py` - Extract insights from Facets documentation
- **Market Research Template**: `research/market-opportunity-template.md` - Systematic market analysis
- **Product Opportunities**: `research/product-opportunities.md` - Identified high-impact opportunities
- **Validation Framework**: `research/validation-framework.md` - Systematic product validation approach

### Development Architecture
- **Security-first design** with HIPAA compliance built-in
- **Healthcare integration patterns** for HL7, EDI, and API connectivity
- **Scalable architecture** supporting high-volume claims processing
- **Production deployment strategies** with zero-downtime releases

See `docs/development-architecture.md` for detailed technical guidance.

### High-Impact Product Opportunities
1. **Facets API Integration Platform** - Simplify complex API integrations
2. **Claims Analytics Dashboard** - ML-powered insights and fraud detection  
3. **Provider Portal Enhancement** - Modern UX for provider interactions
4. **EDI Processing Accelerator** - Visual EDI management and monitoring
5. **Member Engagement Platform** - Automated member communications

## Healthcare Industry Context

This project operates within the complex healthcare ecosystem requiring:
- **Regulatory compliance** with federal and state requirements
- **Interoperability** with diverse healthcare systems
- **High availability** for critical business operations
- **Data integrity** and comprehensive audit trails
- **Security** for sensitive healthcare information

When implementing new features, consider:
1. Regulatory compliance requirements
2. Integration with existing Facets workflows  
3. Audit trail and logging requirements
4. Data security and encryption needs
5. Performance impact on real-time claims processing
