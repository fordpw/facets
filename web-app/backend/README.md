# Healthcare API Backend

A comprehensive Node.js + TypeScript backend API for healthcare data management, designed to integrate with Trizetto Facets and other healthcare systems.

## 🏥 Features

- **Member Management**: Complete CRUD operations for healthcare members
- **Provider Management**: Provider directory with claims tracking and statistics
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **HIPAA Compliance**: Comprehensive audit logging and PHI protection
- **Data Validation**: Healthcare-specific validation (SSN, NPI, ICD-10, CPT codes)
- **Rate Limiting**: Configurable rate limits per endpoint type
- **Error Handling**: Centralized error handling with database logging
- **Security**: Helmet, CORS, input sanitization, SQL injection prevention
- **Monitoring**: Winston logging with audit trails

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+ database
- Git

### Installation

1. **Clone and navigate to backend:**
   ```bash
   cd web-app/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment setup:**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=healthcare_db
   DB_USER=your_username
   DB_PASSWORD=your_password
   
   # Application
   NODE_ENV=development
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   
   # Security
   JWT_SECRET=your_super_secure_jwt_secret_key_here
   JWT_EXPIRE=7d
   BCRYPT_ROUNDS=12
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   
   # Logging
   LOG_LEVEL=info
   LOG_FILE_PATH=./logs/app.log
   ```

4. **Database setup:**
   ```bash
   # Run the database setup scripts from the root directory
   cd ../../database
   psql -U your_username -d your_database -f scripts/setup_database.sql
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

## 🗃️ Database Schema

The API works with these main entities:

- **Members**: Healthcare plan members with demographics and coverage
- **Providers**: Healthcare providers with credentials and contracts  
- **Claims**: Medical claims with procedures, diagnoses, and payments
- **Insurance Plans**: Coverage plans with benefits and deductibles
- **Employers**: Group coverage sponsors
- **Audit Logs**: HIPAA-compliant activity tracking

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Member Endpoints

#### Get Members
```http
GET /api/members?page=1&limit=20&status=ACTIVE
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `memberId` (string): Search by member ID
- `firstName` (string): Search by first name
- `lastName` (string): Search by last name
- `planId` (number): Filter by insurance plan
- `status` (string): ACTIVE, TERMINATED, SUSPENDED

**Response:**
```json
{
  "success": true,
  "data": {
    "members": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### Get Single Member
```http
GET /api/members/:id
```

#### Create Member
```http
POST /api/members
Content-Type: application/json

{
  "memberId": "MBR001234",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1985-06-15",
  "gender": "M",
  "ssn": "123-45-6789",
  "email": "john.doe@example.com",
  "phone": "555-123-4567",
  "address": {
    "street1": "123 Main St",
    "street2": "Apt 4B",
    "city": "Anytown",
    "state": "NY",
    "zipCode": "12345"
  },
  "effectiveDate": "2024-01-01",
  "planId": 1,
  "relationshipCode": "SELF"
}
```

#### Update Member
```http
PUT /api/members/:id
```

#### Delete Member (Soft Delete)
```http
DELETE /api/members/:id
```

#### Get Member Claims
```http
GET /api/members/:id/claims?page=1&limit=20
```

### Provider Endpoints

#### Get Providers
```http
GET /api/providers?page=1&limit=20&status=ACTIVE
```

**Query Parameters:**
- Standard pagination parameters
- `providerId` (string): Search by provider ID
- `npi` (string): Search by NPI number
- `name` (string): Search by provider name
- `providerType` (string): INDIVIDUAL, ORGANIZATION
- `specialty` (string): Medical specialty
- `state` (string): State abbreviation
- `zipCode` (string): ZIP code

#### Get Single Provider
```http
GET /api/providers/:id
```

#### Create Provider
```http
POST /api/providers
Content-Type: application/json

{
  "providerId": "PRV001234",
  "npi": "1234567890",
  "firstName": "Jane",
  "lastName": "Smith",
  "providerType": "INDIVIDUAL",
  "specialty": "Family Medicine",
  "email": "jane.smith@example.com",
  "phone": "555-987-6543",
  "address": {
    "street1": "456 Medical Dr",
    "city": "Healthcare City",
    "state": "CA",
    "zipCode": "90210"
  },
  "licenseNumber": "MD123456",
  "licenseState": "CA",
  "contractEffectiveDate": "2024-01-01"
}
```

#### Update Provider
```http
PUT /api/providers/:id
```

#### Delete Provider
```http
DELETE /api/providers/:id
```

#### Get Provider Claims
```http
GET /api/providers/:id/claims?status=PAID&dateFrom=2024-01-01
```

#### Get Provider Statistics
```http
GET /api/providers/:id/statistics?months=12
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (ADMIN, USER, ANALYST, PROVIDER)
- Secure password hashing with bcrypt
- Token expiration and refresh

### HIPAA Compliance
- Comprehensive audit logging for all PHI access
- Request/response sanitization
- Secure error messages (no sensitive data exposure)
- Activity tracking with user, IP, and timestamp

### Input Validation
- Healthcare-specific validations:
  - SSN format and validity checking
  - NPI number validation with checksum
  - ICD-10 and CPT code format validation
  - Phone number, email, and address validation
- SQL injection prevention with parameterized queries
- Request size limits and rate limiting

### Data Protection
- Sensitive field redaction in logs
- Environment variable protection
- CORS configuration for healthcare applications
- Helmet security headers

## 🛠️ Development

### Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests (when implemented)
```

### Project Structure
```
src/
├── config/          # Database and app configuration
├── controllers/     # Request handlers
├── middleware/      # Authentication, validation, logging
├── routes/          # API route definitions
├── utils/           # Utilities and helpers
├── types/           # TypeScript type definitions
└── server.ts        # Main application entry point
```

### Adding New Endpoints

1. **Create Controller**: Add business logic in `src/controllers/`
2. **Define Routes**: Add route handlers in `src/routes/`
3. **Add Validation**: Create validation schemas in `src/utils/validation.ts`
4. **Update Server**: Register routes in `src/server.ts`

### Database Migrations
```bash
# Create migration
npm run migration:create add_new_table

# Run migrations
npm run migration:up

# Rollback migration
npm run migration:down
```

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors:**
- Verify PostgreSQL is running
- Check connection credentials in `.env`
- Ensure database exists and schema is loaded

**Authentication Errors:**
- Verify JWT_SECRET is set
- Check token expiration
- Ensure user has proper role permissions

**Validation Errors:**
- Check request payload format
- Verify required fields are provided
- Ensure data formats match validation rules

### Logging
Logs are available in:
- Console output (development)
- `logs/app.log` (file logging)
- Database `system_errors` table (error tracking)
- Database `audit_logs` table (PHI access tracking)

### Health Check
```http
GET /api/health
```

Returns server status, version, and database connectivity.

## 🚀 Production Deployment

### Environment Variables
Ensure all production environment variables are properly set:
- Strong JWT secret (32+ characters)
- Production database credentials
- Proper CORS origins
- Log level set to 'error' or 'warn'

### Security Checklist
- [ ] All default passwords changed
- [ ] SSL/TLS certificates configured
- [ ] Database connections encrypted
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Error logging to external service
- [ ] Health monitoring setup

### Performance Optimization
- Database connection pooling configured
- Query optimization and indexing
- Redis caching (if implemented)
- Load balancing (if applicable)
- CDN for static assets

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## 📞 Support

For questions or issues, please contact the development team or create an issue in the repository.