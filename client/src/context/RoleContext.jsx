import React, { createContext, useContext, useState, useEffect } from "react";

const RoleContext = createContext();

export function RoleProvider({ children }) {
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedRole = localStorage.getItem('role');
    const savedUser = localStorage.getItem('user');
    const savedServiceCenterId = localStorage.getItem('serviceCenterId');
    
    let finalRole = savedRole ? String(savedRole).toLowerCase() : null;
    
    // If no saved role but token exists, try to decode it
    if (!finalRole && token) {
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          if (payload.role) {
            finalRole = String(payload.role).toLowerCase();
            console.log('✓ Decoded role from JWT token:', finalRole);
          }
        }
      } catch (err) {
        console.warn('Could not decode JWT token:', err);
      }
    }
    
    if (token && finalRole) {
      setRole(finalRole);
      setIsAuthenticated(true);
      let userData = null;
      if (savedUser) {
        try {
          userData = JSON.parse(savedUser);
        } catch (e) {
          userData = null;
        }
      }
      // Include serviceCenterId in user data
      if (userData && savedServiceCenterId) {
        userData.serviceCenterId = savedServiceCenterId;
      } else if (savedServiceCenterId) {
        userData = { serviceCenterId: savedServiceCenterId };
      }
      setUser(userData);
    }
    setIsLoading(false);
  }, []);

  const login = (userRole, userData = null) => {
    const normalized = userRole ? String(userRole).toLowerCase() : userRole;
    setRole(normalized);
    // Include serviceCenterId from localStorage if available
    const serviceCenterId = localStorage.getItem('serviceCenterId');
    if (serviceCenterId && userData) {
      userData.serviceCenterId = serviceCenterId;
    } else if (serviceCenterId) {
      userData = { serviceCenterId };
    }
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('role', normalized);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  };

  const logout = () => {
    setRole(null);
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('serviceCenterId');
  };

  return (
    <RoleContext.Provider value={{ role, isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}

export { RoleContext };
