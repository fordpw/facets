import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layout Components
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';

// Main Pages
import Dashboard from './pages/Dashboard';
import MembersPage from './pages/members/MembersPage';
import MemberDetailsPage from './pages/members/MemberDetailsPage';
import MemberFormPage from './pages/members/MemberFormPage';
import ProvidersPage from './pages/providers/ProvidersPage';
import ProviderDetailsPage from './pages/providers/ProviderDetailsPage';
import ProviderFormPage from './pages/providers/ProviderFormPage';
import ClaimsPage from './pages/claims/ClaimsPage';
import ClaimDetailsPage from './pages/claims/ClaimDetailsPage';
import ClaimFormPage from './pages/claims/ClaimFormPage';
import PlansPage from './pages/plans/PlansPage';
import PlanDetailsPage from './pages/plans/PlanDetailsPage';
import PlanFormPage from './pages/plans/PlanFormPage';
import EmployersPage from './pages/employers/EmployersPage';
import EmployerDetailsPage from './pages/employers/EmployerDetailsPage';
import EmployerFormPage from './pages/employers/EmployerFormPage';
import ReportsPage from './pages/reports/ReportsPage';
import { ErrorBoundary } from './components/common';

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router>
          <div className="App min-h-screen bg-gray-50">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                {/* Dashboard */}
                <Route index element={<Dashboard />} />
                
                {/* Members */}
                <Route path="members" element={<MembersPage />} />
                <Route path="members/new" element={<MemberFormPage />} />
                <Route path="members/:id" element={<MemberDetailsPage />} />
                <Route path="members/:id/edit" element={<MemberFormPage />} />
                
                {/* Providers */}
                <Route path="providers" element={<ProvidersPage />} />
                <Route path="providers/new" element={<ProviderFormPage />} />
                <Route path="providers/:id" element={<ProviderDetailsPage />} />
                <Route path="providers/:id/edit" element={<ProviderFormPage />} />
                
                {/* Claims */}
                <Route path="claims" element={<ClaimsPage />} />
                <Route path="claims/new" element={<ClaimFormPage />} />
                <Route path="claims/:id" element={<ClaimDetailsPage />} />
                <Route path="claims/:id/edit" element={<ClaimFormPage />} />
                
                {/* Plans */}
                <Route path="plans" element={<PlansPage />} />
                <Route path="plans/new" element={<PlanFormPage />} />
                <Route path="plans/:id" element={<PlanDetailsPage />} />
                <Route path="plans/:id/edit" element={<PlanFormPage />} />
                
                {/* Employers */}
                <Route path="employers" element={<EmployersPage />} />
                <Route path="employers/new" element={<EmployerFormPage />} />
                <Route path="employers/:id" element={<EmployerDetailsPage />} />
                <Route path="employers/:id/edit" element={<EmployerFormPage />} />
                
                {/* Reports */}
                <Route path="reports" element={<ReportsPage />} />
                <Route path="reports/:reportType" element={<ReportsPage />} />
              </Route>
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            
            {/* Toast Container for notifications */}
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              className="mt-16"
            />
          </div>
        </Router>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;