import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Middleware/Guards
import { authMiddleware, roleMiddleware } from './Authmiddleware';

/**
 * Application Routes Configuration
 * 
 * Centralized routing configuration for the React application
 * Includes route protection, authentication checks, and role-based access control
 * 
 * Route Protection Levels:
 * - Public: Accessible to all users
 * - Protected: Requires authentication
 * - Admin: Requires admin role
 * - ServiceCenter: Requires service center assignment
 */

/**
 * Protected Route Wrapper Component
 * 
 * Validates user authentication before rendering protected content
 * Redirects unauthenticated users to login page
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Route component to render
 * @param {Array<string>} [props.roles] - Required roles for access
 * @returns {React.ReactElement} Protected route component
 */
const ProtectedRoute = ({ children, roles = [] }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

  // Check authentication
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

/**
 * Service Center Protected Route Wrapper
 * 
 * Ensures user has access to the service center being accessed
 * Used for service center-specific operations
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Route component to render
 * @returns {React.ReactElement} Service center protected route
 */
const ServiceCenterRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Only service center users can access
  if (!user.serviceCenterId && user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

/**
 * Routes Configuration Object
 * 
 * Define all application routes with their paths, components, and access requirements
 * Use this object to maintain route structure and hierarchy
 * 
 * @type {Object}
 */
export const routeConfig = {
  // Public Routes
  public: {
    login: '/login',
    signup: '/signup',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password/:token',
    notFound: '*',
  },

  // Authentication Routes
  auth: {
    logout: '/logout',
    profile: '/profile',
  },

  // Admin Routes
  admin: {
    dashboard: '/admin/dashboard',
    masterData: '/admin/master-data',
    users: '/admin/users',
    serviceCenters: '/admin/service-centers',
    reports: '/admin/reports',
  },

  // Service Center Routes
  serviceCenter: {
    dashboard: '/service-center/dashboard',
    complaints: '/service-center/complaints',
    technicians: '/service-center/technicians',
    inventory: '/service-center/inventory',
    reports: '/service-center/reports',
  },

  // Customer Routes
  customer: {
    dashboard: '/customer/dashboard',
    complaints: '/customer/complaints',
    products: '/customer/products',
    support: '/customer/support',
  },

  // Common Routes
  common: {
    home: '/',
    unauthorized: '/unauthorized',
    notFound: '/not-found',
  },
};

/**
 * Main Application Routes Component
 * 
 * Defines all application routes with their components and access controls
 * Provides central routing configuration for the entire application
 * 
 * @component
 * @returns {React.ReactElement} Routes configuration
 */
export const AppRoutes = () => {
  return (
    <Routes>
      {/* ============ PUBLIC ROUTES ============ */}
      
      {/* Login Route */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Signup Route */}
      <Route path="/signup" element={<SignupPage />} />
      
      {/* Password Recovery Routes */}
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      
      {/* Home Route */}
      <Route path="/" element={<HomePage />} />

      {/* ============ PROTECTED ROUTES ============ */}
      
      {/* User Profile */}
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } 
      />

      {/* ============ ADMIN ROUTES ============ */}
      
      {/* Admin Dashboard */}
      <Route 
        path="/admin/dashboard" 
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Master Data Management */}
      <Route 
        path="/admin/master-data" 
        element={
          <ProtectedRoute roles={['admin']}>
            <MasterDataPage />
          </ProtectedRoute>
        } 
      />
      
      {/* User Management */}
      <Route 
        path="/admin/users" 
        element={
          <ProtectedRoute roles={['admin']}>
            <UserManagementPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Service Center Management */}
      <Route 
        path="/admin/service-centers" 
        element={
          <ProtectedRoute roles={['admin']}>
            <ServiceCenterManagementPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Admin Reports */}
      <Route 
        path="/admin/reports" 
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminReportsPage />
          </ProtectedRoute>
        } 
      />

      {/* ============ SERVICE CENTER ROUTES ============ */}
      
      {/* Service Center Dashboard */}
      <Route 
        path="/service-center/dashboard" 
        element={
          <ServiceCenterRoute>
            <ServiceCenterDashboard />
          </ServiceCenterRoute>
        } 
      />
      
      {/* Complaints Management */}
      <Route 
        path="/service-center/complaints" 
        element={
          <ServiceCenterRoute>
            <ComplaintsPage />
          </ServiceCenterRoute>
        } 
      />
      
      {/* Technician Management */}
      <Route 
        path="/service-center/technicians" 
        element={
          <ServiceCenterRoute>
            <TechnicianPage />
          </ServiceCenterRoute>
        } 
      />
      
      {/* Inventory Management */}
      <Route 
        path="/service-center/inventory" 
        element={
          <ServiceCenterRoute>
            <InventoryPage />
          </ServiceCenterRoute>
        } 
      />
      
      {/* Service Center Reports */}
      <Route 
        path="/service-center/reports" 
        element={
          <ServiceCenterRoute>
            <ReportsPage />
          </ServiceCenterRoute>
        } 
      />

      {/* ============ ERROR ROUTES ============ */}
      
      {/* Unauthorized Access */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      
      {/* Not Found (404) - Should be last */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

/**
 * Main App Router Component
 * 
 * Wraps the entire application with React Router
 * Manages navigation and route rendering
 * 
 * @component
 * @returns {React.ReactElement} Router with all application routes
 */
export const AppRouter = () => {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
};

// ============ PLACEHOLDER COMPONENTS ============
// Replace with actual page components

const LoginPage = () => <div>Login Page</div>;
const SignupPage = () => <div>Signup Page</div>;
const ForgotPasswordPage = () => <div>Forgot Password Page</div>;
const ResetPasswordPage = () => <div>Reset Password Page</div>;
const HomePage = () => <div>Home Page</div>;
const ProfilePage = () => <div>Profile Page</div>;
const AdminDashboard = () => <div>Admin Dashboard</div>;
const MasterDataPage = () => <div>Master Data Page</div>;
const UserManagementPage = () => <div>User Management Page</div>;
const ServiceCenterManagementPage = () => <div>Service Center Management Page</div>;
const AdminReportsPage = () => <div>Admin Reports Page</div>;
const ServiceCenterDashboard = () => <div>Service Center Dashboard</div>;
const ComplaintsPage = () => <div>Complaints Page</div>;
const TechnicianPage = () => <div>Technician Page</div>;
const InventoryPage = () => <div>Inventory Page</div>;
const ReportsPage = () => <div>Reports Page</div>;
const UnauthorizedPage = () => <div>Unauthorized Page</div>;
const NotFoundPage = () => <div>Not Found Page</div>;

export default AppRouter;
