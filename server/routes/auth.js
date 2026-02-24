import express from 'express';
import jwt from 'jsonwebtoken';
import authController from '../controllers/authController.js';

const router = express.Router();
const JWT_SECRET = 'supersecret_jwt_key_change_me';

// Public routes
router.post('/login', authController.login);
router.post('/logout', authController.logout);

/**
 * TEST/DEVELOPMENT ENDPOINT: Generate JWT token for a service center
 * Usage: GET /api/auth/test-token?centerId=2 
 * Returns: {token: "...", payload: {...}}
 */
router.get('/test-token', (req, res) => {
  try {
    const { centerId = 2 } = req.query;
    const numericCenterId = parseInt(centerId);

    if (isNaN(numericCenterId)) {
      return res.status(400).json({ error: 'Invalid centerId - must be a number' });
    }

    const payload = {
      id: 1,
      username: `SC${numericCenterId}User`,
      centerId: numericCenterId,
      role: 'service_center'
    };

    const token = jwt.sign(payload, JWT_SECRET);

    console.log(`🔐 Generated test token for SC ${numericCenterId}`);

    // Return token in easy-to-use format
    res.json({
      success: true,
      message: `Generated test token for Service Center ${numericCenterId}`,
      token,
      payload,
      usage: {
        javascript: `localStorage.setItem('token', '${token}')`,
        curl: `curl -H "Authorization: Bearer ${token.substring(0, 20)}..." http://localhost:5000/api/...`
      }
    });
  } catch (error) {
    console.error('❌ Test token generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate test token' });
  }
});

export default router;
