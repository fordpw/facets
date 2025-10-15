import axios from 'axios';
import { toast } from 'react-toastify';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);

    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          toast.error('Session expired. Please login again.');
          break;
        case 403:
          toast.error('Access denied. Insufficient permissions.');
          break;
        case 404:
          toast.error('Resource not found.');
          break;
        case 422:
          // Validation errors
          if (data.errors) {
            Object.values(data.errors).forEach(error => {
              toast.error(error);
            });
          } else {
            toast.error(data.message || 'Validation failed');
          }
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(data.message || 'An error occurred');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);

// API methods
export const healthcareAPI = {
  // Authentication
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    logout: () => api.post('/auth/logout'),
    getProfile: () => api.get('/auth/profile'),
    updateProfile: (data) => api.put('/auth/profile', data),
    changePassword: (data) => api.post('/auth/change-password', data),
  },

  // Members
  members: {
    getAll: (params) => api.get('/members', { params }),
    getById: (id) => api.get(`/members/${id}`),
    create: (data) => api.post('/members', data),
    update: (id, data) => api.put(`/members/${id}`, data),
    delete: (id) => api.delete(`/members/${id}`),
    getClaims: (id, params) => api.get(`/members/${id}/claims`, { params }),
  },

  // Providers
  providers: {
    getAll: (params) => api.get('/providers', { params }),
    getById: (id) => api.get(`/providers/${id}`),
    create: (data) => api.post('/providers', data),
    update: (id, data) => api.put(`/providers/${id}`, data),
    delete: (id) => api.delete(`/providers/${id}`),
    getClaims: (id, params) => api.get(`/providers/${id}/claims`, { params }),
    getStatistics: (id, params) => api.get(`/providers/${id}/statistics`, { params }),
  },

  // Claims
  claims: {
    getAll: (params) => api.get('/claims', { params }),
    getById: (id) => api.get(`/claims/${id}`),
    create: (data) => api.post('/claims', data),
    update: (id, data) => api.put(`/claims/${id}`, data),
    process: (id, data) => api.post(`/claims/${id}/process`, data),
    getStatistics: (params) => api.get('/claims/statistics', { params }),
  },

  // Insurance Plans
  plans: {
    getAll: (params) => api.get('/plans', { params }),
    getById: (id) => api.get(`/plans/${id}`),
    create: (data) => api.post('/plans', data),
    update: (id, data) => api.put(`/plans/${id}`, data),
    getMembers: (id, params) => api.get(`/plans/${id}/members`, { params }),
    getStatistics: (id, params) => api.get(`/plans/${id}/statistics`, { params }),
  },

  // Employers
  employers: {
    getAll: (params) => api.get('/employers', { params }),
    getById: (id) => api.get(`/employers/${id}`),
    create: (data) => api.post('/employers', data),
    update: (id, data) => api.put(`/employers/${id}`, data),
    getMembers: (id, params) => api.get(`/employers/${id}/members`, { params }),
  },

  // Reports
  reports: {
    claimsSummary: (params) => api.get('/reports/claims-summary', { params }),
    providerPerformance: (params) => api.get('/reports/provider-performance', { params }),
    memberEnrollment: (params) => api.get('/reports/member-enrollment', { params }),
    financialSummary: (params) => api.get('/reports/financial-summary', { params }),
    utilization: (params) => api.get('/reports/utilization', { params }),
  },

  // Dashboards
  dashboard: {
    executive: (params) => api.get('/reports/dashboard/executive', { params }),
    operational: (params) => api.get('/reports/dashboard/operational', { params }),
    financial: (params) => api.get('/reports/dashboard/financial', { params }),
  },

  // Health check
  health: () => api.get('/health'),
};

// Helper functions for common operations
export const apiHelpers = {
  // Format API errors for display
  formatError: (error) => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.errors) {
      return Object.values(error.response.data.errors).join(', ');
    }
    return error.message || 'An unexpected error occurred';
  },

  // Build query params
  buildParams: (filters, pagination, sorting) => {
    const params = {};
    
    // Add filters
    Object.keys(filters || {}).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params[key] = filters[key];
      }
    });

    // Add pagination
    if (pagination) {
      if (pagination.page) params.page = pagination.page;
      if (pagination.limit) params.limit = pagination.limit;
    }

    // Add sorting
    if (sorting) {
      if (sorting.sortBy) params.sortBy = sorting.sortBy;
      if (sorting.sortOrder) params.sortOrder = sorting.sortOrder;
    }

    return params;
  },

  // Format currency values
  formatCurrency: (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  },

  // Format dates
  formatDate: (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US');
  },

  // Format date and time
  formatDateTime: (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-US');
  },

  // Get status badge color
  getStatusColor: (status) => {
    const statusColors = {
      ACTIVE: 'success',
      INACTIVE: 'gray',
      TERMINATED: 'danger',
      PAID: 'success',
      DENIED: 'danger',
      PENDING: 'warning',
      PROCESSING: 'info',
      RECEIVED: 'info',
      PENDED: 'warning',
    };
    return statusColors[status] || 'gray';
  },

  // Debounce function for search inputs
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Download file from API response
  downloadFile: (response, filename) => {
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default api;