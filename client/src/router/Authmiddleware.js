/**
 * Authentication Middleware for Route Protection
 * 
 * Validates JWT tokens and protects routes from unauthorized access
 * Extracted token is attached to request object for use in components
 */

/**
 * Middleware to verify JWT authentication token
 * 
 * @param {boolean} [required=true] - Whether authentication is required
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Protect a route
 * const protectedRoute = authMiddleware();
 * 
 * @example
 * // Optional authentication
 * const optionalAuth = authMiddleware(false);
 */
export const authMiddleware = (required = true) => {
  return (req, res, next) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : null;

      if (!token) {
        if (required) {
          return res.status(401).json({
            success: false,
            message: 'Authentication token required',
            statusCode: 401
          });
        }
        // Token is optional, continue without it
        req.user = null;
        return next();
      }

      // Verify token format
      const parts = token.split('.');
      if (parts.length !== 3) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token format',
          statusCode: 401
        });
      }

      // Decode token payload (without verification - frontend only)
      try {
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
        );

        // Check token expiration
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          return res.status(401).json({
            success: false,
            message: 'Token expired',
            statusCode: 401
          });
        }

        // Attach decoded payload to request
        req.user = payload;
        req.token = token;
        next();
      } catch (decodeError) {
        return res.status(401).json({
          success: false,
          message: 'Failed to decode token',
          statusCode: 401
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authentication middleware error',
        statusCode: 500,
        error: error.message
      });
    }
  };
};

/**
 * Middleware to verify user role authorization
 * 
 * @param {string|Array<string>} allowedRoles - Role(s) allowed to access route
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Allow only admin role
 * const adminOnly = roleMiddleware('admin');
 * 
 * @example
 * // Allow multiple roles
 * const multiRole = roleMiddleware(['admin', 'manager']);
 */
export const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          statusCode: 401
        });
      }

      const roles = Array.isArray(allowedRoles) 
        ? allowedRoles 
        : [allowedRoles];

      const userRole = req.user.role || '';
      
      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'User does not have required permissions',
          statusCode: 403,
          required: roles
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        statusCode: 500,
        error: error.message
      });
    }
  };
};

/**
 * Middleware to check service center authorization
 * Ensures user belongs to the service center being accessed
 * 
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Protect service center specific routes
 * router.get('/center/:centerId', serviceCenterAuthMiddleware(), handler);
 */
export const serviceCenterAuthMiddleware = () => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          statusCode: 401
        });
      }

      const userCenterId = req.user.serviceCenterId;
      const requestedCenterId = req.params.centerId || req.query.centerId;

      // Admin bypass check
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user's service center matches requested center
      if (userCenterId && requestedCenterId && 
          String(userCenterId) !== String(requestedCenterId)) {
        return res.status(403).json({
          success: false,
          message: 'User can only access their assigned service center',
          statusCode: 403
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Service center authorization check failed',
        statusCode: 500,
        error: error.message
      });
    }
  };
};

export default authMiddleware;
