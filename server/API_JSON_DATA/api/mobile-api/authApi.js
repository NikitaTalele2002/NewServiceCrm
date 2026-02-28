import express from 'express';
const router = express.Router();
import authService from '../../../services/authService.js';
import mobileAuthService from '../../../services/mobileAuthService.js';

/**
 * Mobile Login Router
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password, mobile_no } = req.body;

        if (!username && !password && !mobile_no) {
            return res.status(400).json({ success: false, error: 'Credentials or mobile number are required' });
        }

        let result;
        if (mobile_no) {
            // New mobile number based login
            result = await mobileAuthService.technicianMobileLogin(mobile_no);
        } else if (username && password) {
            // Legacy username/password login
            result = await authService.authenticateCredentials(username, password);
        } else {
            return res.status(400).json({ success: false, error: 'Invalid login attempt. Provide mobile number or username/password.' });
        }

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

router.post('/logout', (req, res) => res.json({ success: true, message: 'Logged out' }));

export default router;
