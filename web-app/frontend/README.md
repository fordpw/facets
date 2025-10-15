# Healthcare Management System - Frontend

A comprehensive React frontend application for healthcare management, built with modern web technologies.

## Features

### 🏥 Complete Healthcare Management
- **Member Management** - Full CRUD operations for healthcare members
- **Provider Management** - Healthcare provider administration (placeholder)
- **Claims Processing** - Insurance claims management (placeholder)
- **Plan Management** - Insurance plan administration (placeholder)
- **Employer Management** - Group coverage sponsor management (placeholder)
- **Reports & Analytics** - Comprehensive reporting system (placeholder)
- **Dashboard** - Executive and operational dashboards with real-time metrics

### 🔐 Security & Authentication
- JWT-based authentication
- Protected routes with automatic redirects
- Token-based API communication
- Secure logout functionality

### 💻 Modern UI/UX
- Responsive design with Tailwind CSS
- Professional sidebar navigation
- Interactive charts and visualizations
- Toast notifications for user feedback
- Loading states and error handling
- Mobile-friendly responsive layout

## Technology Stack

- **React 18** - Modern React with hooks
- **React Router v6** - Client-side routing
- **React Query** - Data fetching and caching
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js** - Data visualization
- **React Toastify** - Notification system
- **Axios** - HTTP client

## Project Structure

```
src/
├── components/
│   ├── common/           # Reusable UI components
│   │   ├── Button.js
│   │   ├── Input.js
│   │   ├── Card.js
│   │   ├── Table.js
│   │   ├── Modal.js
│   │   ├── Pagination.js
│   │   └── index.js
│   └── Layout.js         # Main layout with navigation
├── pages/
│   ├── auth/
│   │   └── LoginPage.js
│   ├── members/          # Member management
│   │   ├── MembersPage.js
│   │   ├── MemberDetailsPage.js
│   │   └── MemberFormPage.js
│   ├── providers/        # Provider management (placeholder)
│   ├── claims/          # Claims management (placeholder)
│   ├── plans/           # Plan management (placeholder)
│   ├── employers/       # Employer management (placeholder)
│   ├── reports/         # Reports & analytics (placeholder)
│   └── Dashboard.js     # Main dashboard
├── utils/
│   └── api.js           # API client with auth
├── styles/
│   └── index.css        # Global styles
├── App.js               # Main app with routing
└── index.js             # React entry point
```

## Key Features Implemented

### ✅ Fully Implemented
1. **Authentication System**
   - Login page with form validation
   - JWT token management
   - Protected routes
   - Auto-redirect logic

2. **Layout & Navigation**
   - Responsive sidebar navigation
   - Header with user menu
   - Mobile-friendly design
   - Search functionality

3. **Dashboard**
   - Key metrics display
   - Interactive charts (claims trends, status distribution)
   - Activity summary
   - Quick action buttons
   - Alert system

4. **Member Management**
   - Member listing with pagination, sorting, filtering
   - Add/edit member forms
   - Member details view
   - Delete with confirmation
   - Comprehensive member data handling

### 📋 Placeholder Components Ready
- **Providers Management** - Healthcare provider administration
- **Claims Processing** - Insurance claims workflow
- **Plan Management** - Insurance plan configuration
- **Employer Management** - Group sponsor administration
- **Reports & Analytics** - Advanced reporting system

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
```bash
cd web-app/frontend
npm install
```

### Development
```bash
npm start
```
This runs the app in development mode at http://localhost:3000

### Build for Production
```bash
npm run build
```

## API Integration

The frontend is configured to work with the backend API endpoints:

- **Base URL**: `http://localhost:3001/api`
- **Authentication**: JWT tokens in Authorization header
- **Error Handling**: Centralized error handling with user notifications
- **Request/Response Interceptors**: Automatic token attachment and error processing

### Configured Endpoints
- `POST /auth/login` - User authentication
- `GET /members` - Member listing with pagination/filtering
- `GET /members/:id` - Member details
- `POST /members` - Create member
- `PUT /members/:id` - Update member
- `DELETE /members/:id` - Delete member
- `GET /dashboard/executive` - Executive dashboard data
- `GET /dashboard/operational` - Operational dashboard data

## Responsive Design

The application is fully responsive with:
- Mobile-first design approach
- Collapsible sidebar on mobile devices
- Responsive tables with horizontal scrolling
- Touch-friendly interface elements
- Optimized for tablets and desktops

## State Management

- **React Query** for server state management
- **Local State** with React hooks for UI state
- **localStorage** for authentication persistence
- **Form State** management with controlled components

## Error Handling

- Global error boundary for React errors
- API error handling with user-friendly messages
- Form validation with real-time feedback
- Network error handling with retry options

## Performance Optimizations

- Code splitting with React Router
- Lazy loading for route components
- React Query caching for API calls
- Optimized re-renders with proper dependencies
- Image optimization and compression

## Future Enhancements

### Planned Features
1. **Advanced Claims Processing**
   - Claims workflow management
   - Approval/rejection system
   - Claims history tracking

2. **Provider Network Management**
   - Provider directory
   - Credentialing tracking
   - Performance metrics

3. **Advanced Reporting**
   - Custom report builder
   - Scheduled reports
   - Data export functionality

4. **Enhanced Dashboard**
   - Customizable widgets
   - Real-time notifications
   - Advanced analytics

## Demo Credentials

For testing purposes:
- **Email**: admin@example.com
- **Password**: password123

## Support

For technical support or questions about the frontend application, please refer to the backend API documentation and ensure all endpoints are properly configured.

## Contributing

1. Follow the existing code structure and patterns
2. Use TypeScript-style prop validation where applicable
3. Maintain responsive design principles
4. Include proper error handling
5. Write meaningful commit messages

---

**Built with ❤️ for Healthcare Management**