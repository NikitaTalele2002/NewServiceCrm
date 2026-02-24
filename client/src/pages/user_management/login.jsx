import React, { useState } from "react";
import { useRole } from "../../context/RoleContext";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import FormInput from "../../components/common/FormInput";
import Button from "../../components/common/Button";
import ErrorMessage from "../../components/common/ErrorMessage";

export default function Login() {
  const { login: authLogin, loading: authLoading, error } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const { login, isAuthenticated, isLoading, role } = useRole();
  const navigate = useNavigate();

  // If already authenticated, redirect to appropriate dashboard
  if (!isLoading && isAuthenticated) {
    if (role === 'admin') {
      return <Navigate to="/admin/master-upload" replace />;
    } else if (role === 'service_center') {
      return <Navigate to="/service-center" replace />;
    } else if (role === 'call_center') {
      return <Navigate to="/call-centre/search" replace />;
    } else if (role === 'branch') {
      return <Navigate to="/branch" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Show loading while restoring session
  if (isLoading) {
    return <div className="min-w-screen flex justify-center items-center h-screen"><div className="text-center"><p>Loading session...</p></div></div>;
  }

const handleLogin = (e) => {
  e.preventDefault();
  setErrorMessage('');

  // Call backend auth endpoint (use explicit backend origin to avoid dev-server routing issues)
  fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
    .then(async (res) => {
      const text = await res.text();
      let js = null;
      try { js = text ? JSON.parse(text) : null; } catch (e) { js = null; }
      if (!res.ok) {
        const msg = js && js.message ? js.message : (text || 'Login failed');
        throw new Error(msg);
      }
      return js;
    })
    .then((js) => {
      if (js && js.token) {
        localStorage.setItem('token', js.token);
        
        // Extract serviceCenterId from server response (in user object)
        // NOTE: centerId is the asc_id from ServiceCenter table (NOT user_id)
        if (js.user && js.user.centerId) {
          const centerId = String(js.user.centerId);
          localStorage.setItem('serviceCenterId', centerId);
          console.log('[LOGIN] ✓ Service Center asc_id stored in localStorage:', centerId);
          console.log('[LOGIN]   This is the asc_id from ServiceCenter table, used for fetching complaints');
        } else if (js.user) {
          console.warn('[LOGIN] ⚠ No centerId (asc_id) in user object:', js.user);
          console.warn('[LOGIN]   Expected to find asc_id for service center user');
        }

        // Determine role from server response - use role_id lookup instead of defaulting to admin
        let roleFromServer = null;
        
        // First, try to get role from the user object returned by server
        if (js.user && js.user.Role) {
          roleFromServer = String(js.user.Role).toLowerCase().replace(/\s+/g, '_');
        } else {
          // Fallback: Decode the JWT to get the role from the token
          try {
            const tokenParts = js.token.split('.');
            if (tokenParts.length === 3) {
              // Decode the payload (second part)
              const payload = JSON.parse(atob(tokenParts[1]));
              if (payload.role) {
                roleFromServer = String(payload.role).toLowerCase().replace(/\s+/g, '_');
              }
            }
          } catch (decodeErr) {
            console.warn('Could not decode JWT token:', decodeErr);
          }
        }
        
        // If still no role found, log error (do NOT default to admin)
        if (!roleFromServer) {
          console.error('ERROR: Could not determine user role from server response. User object:', js.user, 'Token:', js.token?.substring(0, 50) + '...');
          setErrorMessage('Error: Could not determine user role. Please contact support.');
          return;
        }

        const userData = {
          username: js.user ? js.user.username : js.username,
          centerName: js.user ? js.user.name : (js.centerName || 'Admin'),
          id: js.user && js.user.centerId ? js.user.centerId : (js.id || null),
          serviceCenterId: js.user && js.user.centerId ? js.user.centerId : (js.serviceCenterId || null)
        };
        login(roleFromServer, userData);
        // Redirect based on normalized role
        if (roleFromServer === 'admin') {
          navigate('/admin/master-upload');
        } else if (roleFromServer === 'service_center' || roleFromServer === 'service-center') {
          navigate('/service-center');
        } else if (roleFromServer === 'call_center') {
          navigate('/call-centre/search');
        } else if (roleFromServer === 'branch') {
          navigate('/branch');
        } else {
          navigate('/');
        }
      } else {
        setErrorMessage(js && js.message ? js.message : 'Invalid credentials');
      }
    })
    .catch((err) => {
      console.error('Login error', err && err.message ? err.message : err);
      setErrorMessage(err && err.message ? err.message : 'Login failed');
    });
};




  return (
    <div className="min-w-screen flex flex-col justify-center items-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded shadow-md w-96">
        <h2 className="text-xl font-bold mb-4 text-center">Login</h2>
        {errorMessage && <ErrorMessage message={errorMessage} />}
        <FormInput
          label="Username"
          name="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <FormInput
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="flex justify-between mt-4 mb-4 text-sm">
            <a onClick={() => window.location.href = '/forgot_pwd'} className="text-blue-500 hover:underline cursor-pointer">Forgot Password?</a>
            <a onClick={() => window.location.href = '/signup'} className="text-blue-500 hover:underline cursor-pointer">Sign Up</a>
        </div>
        <Button
          type="submit"
          variant="primary"
          className="w-full">
          Login
        </Button>
      </form>
    </div>
  );
}



