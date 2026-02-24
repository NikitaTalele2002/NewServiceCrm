import React, { useState, useEffect } from 'react';
import './AdminManagement.css';
import { useAdmin } from '../../hooks/useAdmin';
import FormInput from '../../components/common/FormInput';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';

export default function AdminManagement() {
  const {
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
    createServiceCenter
  } = useAdmin();
  
  const [activeTab, setActiveTab] = useState('login');
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [adminUser, setAdminUser] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', mobileNo: '', password: '' });
  const [serviceCenterForm, setServiceCenterForm] = useState({
    CenterName: '',
    Address: '',
    City: '',
    State: '',
    PinCode: '',
    Phone: '',
    ContactPerson: '',
  });

  // Generic form change handler
  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterForm({ ...registerForm, [e.target.name]: e.target.value });
  };

  const handleServiceCenterChange = (e) => {
    setServiceCenterForm({ ...serviceCenterForm, [e.target.name]: e.target.value });
  };

  // Handle Admin Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const result = await adminLogin(loginForm);
    if (result.success) {
      setToken(result.data.token);
      localStorage.setItem('adminToken', result.data.token);
      setAdminUser(result.data.user);
      setActiveTab('manage');
      setLoginForm({ email: '', password: '' });
      setSuccessMessage('Login successful!');
      await getAdminProfile();
      await getAllAdmins();
      await getServiceCenters();
    } else {
      setErrorMessage(result.error || 'Login failed');
    }
  };

  // Handle Admin Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const result = await adminRegister(registerForm);
    if (result.success) {
      setSuccessMessage('Admin registered successfully! Please login.');
      setRegisterForm({ name: '', email: '', mobileNo: '', password: '' });
      setTimeout(() => setActiveTab('login'), 1500);
    } else {
      setErrorMessage(result.error || 'Registration failed');
    }
  };

  // Load admin data when token changes
  useEffect(() => {
    if (token) {
      setAdminUser(profile);
    }
  }, [profile, token]);

  // Handle Service Center Creation
  const handleCreateServiceCenter = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const result = await createServiceCenter(serviceCenterForm);
    if (result.success) {
      setSuccessMessage('Service center created successfully!');
      setServiceCenterForm({
        CenterName: '',
        Address: '',
        City: '',
        State: '',
        PinCode: '',
        Phone: '',
        ContactPerson: '',
      });
      await getServiceCenters();
    } else {
      setErrorMessage(result.error || 'Failed to create service center');
    }
  };

  // Logout
  const handleLogout = () => {
    setToken('');
    setAdminUser(null);
    localStorage.removeItem('adminToken');
    setActiveTab('login');
  };

  return (
    <div className="admin-management">
      <div className="admin-header">
        <h1>Admin Management Portal</h1>
        {adminUser && (
          <div className="admin-info">
            <span>Welcome, {adminUser.Name} ({adminUser.Role})</span>
            <Button variant="secondary" onClick={handleLogout}>Logout</Button>
          </div>
        )}
      </div>

      {!token ? (
        <div className="auth-container">
          <div className="tabs">
            <Button 
              variant={activeTab === 'login' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('login')}
            >
              Login
            </Button>
            <Button 
              variant={activeTab === 'register' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('register')}
            >
              Register
            </Button>
          </div>

          {errorMessage && <ErrorMessage message={errorMessage} />}
          {successMessage && <div className="text-green-600 mb-4 p-3 bg-green-50 rounded">{successMessage}</div>}

          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="form-container">
              <h2>Admin Login</h2>
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={loginForm.email}
                onChange={handleLoginChange}
                required
              />
              <FormInput
                label="Password"
                name="password"
                type="password"
                value={loginForm.password}
                onChange={handleLoginChange}
                required
              />
              <Button type="submit" variant="primary" loading={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          )}

          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="form-container">
              <h2>Admin Registration</h2>
              <FormInput
                label="Full Name"
                name="name"
                type="text"
                value={registerForm.name}
                onChange={handleRegisterChange}
                required
              />
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={registerForm.email}
                onChange={handleRegisterChange}
                required
              />
              <FormInput
                label="Mobile Number"
                name="mobileNo"
                type="tel"
                value={registerForm.mobileNo}
                onChange={handleRegisterChange}
                required
              />
              <FormInput
                label="Password"
                name="password"
                type="password"
                value={registerForm.password}
                onChange={handleRegisterChange}
                required
              />
              <Button type="submit" variant="primary" loading={loading}>
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </form>
          )}
        </div>
      ) : (
        <div className="dashboard-container">
          <div className="tabs">
            <Button
              variant={activeTab === 'manage' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('manage')}
            >
              Manage Admins
            </Button>
            <Button
              variant={activeTab === 'service-centres' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('service-centres')}
            >
              Service Centers
            </Button>
          </div>

          {errorMessage && <ErrorMessage message={errorMessage} />}

          {activeTab === 'manage' && adminUser?.Role === 'super_admin' && (
            <div className="content-section">
              <h2>Manage Admins</h2>
              <div className="admins-list">
                {admins.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th>Role</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((admin) => (
                        <tr key={admin.Id}>
                          <td>{admin.Id}</td>
                          <td>{admin.Name}</td>
                          <td>{admin.Email}</td>
                          <td>{admin.MobileNo}</td>
                          <td>{admin.Role}</td>
                          <td>{admin.IsActive ? 'Active' : 'Inactive'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No admins found</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'service-centres' && (
            <div className="content-section">
              <h2>Service Centers</h2>

              <form onSubmit={handleCreateServiceCenter} className="form-container">
                <h3>Add New Service Center</h3>
                <FormInput
                  label="Center Name"
                  name="CenterName"
                  type="text"
                  value={serviceCenterForm.CenterName}
                  onChange={handleServiceCenterChange}
                  required
                />
                <FormInput
                  label="Address"
                  name="Address"
                  type="text"
                  value={serviceCenterForm.Address}
                  onChange={handleServiceCenterChange}
                />
                <FormInput
                  label="City"
                  name="City"
                  type="text"
                  value={serviceCenterForm.City}
                  onChange={handleServiceCenterChange}
                  required
                />
                <FormInput
                  label="State"
                  name="State"
                  type="text"
                  value={serviceCenterForm.State}
                  onChange={handleServiceCenterChange}
                  required
                />
                <FormInput
                  label="Pin Code"
                  name="PinCode"
                  type="text"
                  value={serviceCenterForm.PinCode}
                  onChange={handleServiceCenterChange}
                  required
                />
                <FormInput
                  label="Phone"
                  name="Phone"
                  type="tel"
                  value={serviceCenterForm.Phone}
                  onChange={handleServiceCenterChange}
                />
                <FormInput
                  label="Contact Person"
                  name="ContactPerson"
                  type="text"
                  value={serviceCenterForm.ContactPerson}
                  onChange={handleServiceCenterChange}
                />
                <Button type="submit" variant="primary" loading={loading}>
                  {loading ? 'Creating...' : 'Create Service Center'}
                </Button>
              </form>

              <div className="service-centers-list">
                <h3>All Service Centers</h3>
                {serviceCenters.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>City</th>
                        <th>State</th>
                        <th>Pin Code</th>
                        <th>Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceCenters.map((center) => (
                        <tr key={center.Id}>
                          <td>{center.Id}</td>
                          <td>{center.CenterName}</td>
                          <td>{center.City}</td>
                          <td>{center.State}</td>
                          <td>{center.PinCode}</td>
                          <td>{center.Phone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No service centers found</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
