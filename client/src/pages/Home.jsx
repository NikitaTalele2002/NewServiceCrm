import React from 'react';
import { useRole } from '../context/RoleContext';
import { Navigate } from 'react-router-dom';
import Loader from '../components/Loader';

export default function Home() {
  const { isAuthenticated, role, isLoading } = useRole();

  // Wait for session to load from localStorage
  if (isLoading) {
    return <Loader />;
  }

  // If not authenticated, go to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If admin, go to master upload
  if (role === 'admin') {
    return <Navigate to="/admin/master-upload" replace />;
  }

  // If service center, go to service center dashboard
  if (role === 'service_center') {
    return <Navigate to="/service-center" replace />;
  }

  // if technician, go to technician's dashboard 
  if(role === 'technician')
  {
    return <Navigate to="/technician" replace />;

  }
// If user, go to user dashboard 
  // Default to login
  return <Navigate to="/login" replace />;
}

