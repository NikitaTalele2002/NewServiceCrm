import authService from '../services/authService.js';
import mobileAuthService from '../services/mobileAuthService.js';

async function login(req, res) {
  try {
    const { username, password } = req.body;
    console.log('\n📝 Login Request Received:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);

    if (!username || !password) {
      console.log('   ✗ Missing credentials');
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await authService.authenticateCredentials(username, password);

    if (!result.success) {
      console.log(`   ✗ Auth failed: ${result.error}`);
      return res.status(401).json({ error: result.error || 'Invalid credentials' });
    }

    console.log(`   ✓ Auth successful`);
    const response = {
      success: true,
      token: result.token,
      user: {
        user_id: result.user.user_id,
        username: result.user.username || username,
        Role: result.user.Role,
        service_center_id: result.user.service_center_id || result.centerId,
        centerId: result.user.centerId || result.centerId
      },
      user_id: result.user.user_id,
      role: (result.user.Role || '').toLowerCase(),
      username: result.user.username || username,
      id: result.user.user_id || result.user.id,
      serviceCenterId: result.user.centerId || result.centerId
    };
    if (result.serviceCenter) response.serviceCenter = result.serviceCenter;

    // Print the JWT token to the console for debugging
    console.log('\n[LOGIN] JWT Token:', result.token);

    return res.json(response);
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
}

async function mobileLogin(req, res) {
  try {
    const { mobile_no } = req.body;
    console.log('\n📱 Mobile Login Request Received:');
    console.log(`   Mobile No: ${mobile_no}`);

    if (!mobile_no) {
      console.log('   ✗ Missing mobile number');
      return res.status(400).json({ error: 'Mobile number required' });
    }

    const result = await mobileAuthService.technicianMobileLogin(mobile_no);

    if (!result.success) {
      console.log(`   ✗ Mobile auth failed: ${result.error}`);
      return res.status(401).json({ error: result.error || 'Invalid mobile number' });
    }

    console.log(`   ✓ Mobile auth successful`);
    const response = {
      success: true,
      token: result.token,
      user: {
        user_id: result.user.user_id,
        username: result.user.username,
        Role: result.user.Role,
        service_center_id: result.user.centerId,
        centerId: result.user.centerId
      },
      user_id: result.user.user_id,
      role: (result.user.Role || '').toLowerCase(),
      username: result.user.username,
      id: result.user.user_id,
      serviceCenterId: result.user.centerId
    };

    return res.json(response);
  } catch (err) {
    console.error('Mobile login error:', err);
    return res.status(500).json({ error: 'Mobile login failed' });
  }
}

function logout(req, res) {
  return res.json({ success: true, message: 'Logged out' });
}

export default {
  login,
  mobileLogin,
  logout
};
