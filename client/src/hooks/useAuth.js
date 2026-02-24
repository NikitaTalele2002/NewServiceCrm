import { useState, useCallback } from 'react';
import { loginApi, signupApi, forgotPasswordApi, resetPasswordApi } from '../services/authService';

/**
 * Custom hook for authentication operations
 * 
 * Manages user authentication state including login, signup, password reset
 * and token management. Integrates with auth service API.
 * 
 * @returns {Object} Authentication hook interface with methods and state
 * @returns {Object} .user - Currently authenticated user object
 * @returns {boolean} .loading - Loading state for async operations
 * @returns {string|null} .error - Error message if operation fails
 * @returns {Function} .login - Authenticate user with credentials
 * @returns {Function} .signup - Register new user account
 * @returns {Function} .forgotPassword - Initiate password reset flow
 * @returns {Function} .resetPassword - Complete password reset
 * @returns {Function} .logout - Clear user session and token
 * 
 * @example
 * const { user, loading, error, login, logout } = useAuth();
 * 
 * const handleLogin = async (username, password) => {
 *   const result = await login({ username, password });
 *   if (result.success) {
 *     // User logged in successfully
 *   }
 * };
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Authenticate user with username and password
   * 
   * @async
   * @param {Object} loginData - Login credentials
   * @param {string} loginData.username - User username
   * @param {string} loginData.password - User password
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const login = useCallback(async (loginData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await loginApi(loginData);
      console.log('[useAuth] Login result received:', result);
      setUser(result.user);
      localStorage.setItem('token', result.token);
      // Store serviceCenterId if user is a service center user
      if (result.user && result.user.centerId) {
        const centerId = String(result.user.centerId);
        localStorage.setItem('serviceCenterId', centerId);
        console.log('[useAuth] ✓ Stored serviceCenterId:', centerId);
      } else {
        console.warn('[useAuth] ⚠ No centerId in user object');
      }
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Register new user account
   * 
   * @async
   * @param {Object} signupData - User registration data
   * @param {string} signupData.username - Desired username
   * @param {string} signupData.password - Account password
   * @param {string} signupData.email - User email address
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const signup = useCallback(async (signupData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await signupApi(signupData);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Signup failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initiate password reset process
   * 
   * @async
   * @param {string} email - User email address
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const forgotPassword = useCallback(async (email) => {
    setLoading(true);
    setError(null);
    try {
      const result = await forgotPasswordApi(email);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Password reset request failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Complete password reset with new password
   * 
   * @async
   * @param {Object} resetData - Password reset information
   * @param {string} resetData.token - Reset token from email
   * @param {string} resetData.newPassword - New password
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const resetPassword = useCallback(async (resetData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await resetPasswordApi(resetData);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Password reset failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear user session and remove authentication token
   * Called on user logout
   */
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('serviceCenterId');
    setError(null);
  }, []);

  return {
    user,
    loading,
    error,
    login,
    signup,
    forgotPassword,
    resetPassword,
    logout
  };
};