import express from 'express';
const router = express.Router();
import authService from '../../../services/authService.js';

/**
 * POST /api/mobile/auth/login
 * Standardized login for mobile app
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password are required' });
        }

        const result = await authService.authenticateCredentials(username, password);

        if (result.success) {
            res.json(result);
        } else {
            res.status(401).json(result);
        }
    } catch (err) {
        console.error('Mobile Auth Login Error:', err);
        res.status(500).json({ success: false, error: 'Authentication failed', details: err.message });
    }
});

/**
 * POST /api/mobile/auth/logout
 */
router.post('/logout', async (req, res) => {
    // Standard success response for logout
    res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
