import authService from '../services/authService.js';

async function login(req, res){
  try{
    const { username, password } = req.body;
    console.log('\n📝 Login Request Received:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    
    if(!username || !password) {
      console.log('   ✗ Missing credentials');
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await authService.authenticateCredentials(username, password);
    
    if(!result.success) {
      console.log(`   ✗ Auth failed: ${result.error}`);
      return res.status(401).json({ error: result.error || 'Invalid credentials' });
    }

    console.log(`   ✓ Auth successful`);
    const response = { 
      success: true, 
      token: result.token,
      user: result.user,  // Return full user object with centerId
      user_id: result.user.user_id,
      role: result.user.Role,
      username: result.user.username || username,
      id: result.user.user_id || result.user.id
    };
    if(result.serviceCenterId) response.serviceCenterId = result.serviceCenterId;
    if(result.serviceCenter) response.serviceCenter = result.serviceCenter;

    // Print the JWT token to the console for debugging
    console.log('\n[LOGIN] JWT Token:', result.token);

    return res.json(response);
  }catch(err){
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
}

function logout(req, res){
  return res.json({ success: true, message: 'Logged out' });
}

export default {
  login,
  logout
};
