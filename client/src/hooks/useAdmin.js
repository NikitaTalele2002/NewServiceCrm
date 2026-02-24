import { useState, useCallback } from 'react';
import {
  adminLoginApi,
  adminRegisterApi,
  getAdminProfileApi,
  getAllAdminsApi,
  getServiceCentersApi,
  createServiceCenterApi,
  searchMasterDataApi
} from '../services/adminService';

/**
 * Custom hook for admin operations
 * 
 * Manages admin-specific functionality including:
 * - Admin authentication (login, register)
 * - Admin profile management
 * - Service center management
 * - Admin listing and management
 * 
 * @returns {Object} Admin hook interface
 * @returns {Array} .admins - List of all admin users
 * @returns {Array} .serviceCenters - List of service centers
 * @returns {Object|null} .profile - Current admin profile
 * @returns {boolean} .loading - Loading state for async operations
 * @returns {string|null} .error - Error message if operation fails
 * @returns {Function} .adminLogin - Authenticate admin user
 * @returns {Function} .adminRegister - Register new admin user
 * @returns {Function} .getAdminProfile - Fetch admin profile
 * @returns {Function} .getAllAdmins - Fetch all admins list
 * @returns {Function} .getServiceCenters - Fetch all service centers
 * @returns {Function} .createServiceCenter - Create new service center
 */
export const useAdmin = () => {
  const [admins, setAdmins] = useState([]);
  const [serviceCenters, setServiceCenters] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Authenticate admin user with credentials
   * 
   * @async
   * @param {Object} loginData - Admin login credentials
   * @param {string} loginData.username - Admin username
   * @param {string} loginData.password - Admin password
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const adminLogin = useCallback(async (loginData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminLoginApi(loginData);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Admin login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Register new admin user account
   * 
   * @async
   * @param {Object} registerData - Admin registration details
   * @param {string} registerData.username - Desired username
   * @param {string} registerData.password - Account password
   * @param {string} registerData.email - Admin email address
   * @param {string} [registerData.name] - Admin full name
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const adminRegister = useCallback(async (registerData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminRegisterApi(registerData);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Admin registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch current admin profile information
   * 
   * @async
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const getAdminProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminProfileApi();
      setProfile(result);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch admin profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch list of all admin users
   * 
   * @async
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  const getAllAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAllAdminsApi();
      setAdmins(result);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch admins';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch list of all service centers
   * 
   * @async
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  const getServiceCenters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getServiceCentersApi();
      setServiceCenters(result);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch service centers';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new service center
   * 
   * @async
   * @param {Object} serviceCenterData - Service center details
   * @param {string} serviceCenterData.centerName - Service center name
   * @param {string} serviceCenterData.address - Service center address
   * @param {string} serviceCenterData.city - City location
   * @param {string} serviceCenterData.phone - Contact phone number
   * @param {string} [serviceCenterData.email] - Contact email
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const createServiceCenter = useCallback(async (serviceCenterData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createServiceCenterApi(serviceCenterData);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Failed to create service center';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const searchMasterData = useCallback(async (type, query) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchMasterDataApi(type, query);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Search failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    admins,
    serviceCenters,
    profile,
    loading,
    error,
    adminLogin,
    adminRegister,
    getAdminProfile,
    getAllAdmins,
    getServiceCenters,
    createServiceCenter,
    searchMasterData
  };
};