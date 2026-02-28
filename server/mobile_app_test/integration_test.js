import { sequelize } from '../db.js';
import authService from '../services/mobileAuthService.js';

/**
 * Mobile App Integration Test Suite
 * This folder is dedicated to testing app-specific functionality without polluting core files.
 */

async function runTests() {
    console.log('--- Starting Mobile App Integration Tests ---');

    try {
        // 1. Database Connection Check
        await sequelize.authenticate();
        console.log('✅ Database reachable.');

        // 2. Mobile Login Test
        const testMobile = '9999999991';
        console.log(`\nTesting login for: ${testMobile}`);
        const loginResult = await authService.technicianMobileLogin(testMobile);

        if (loginResult.success) {
            console.log('✅ Mobile Login verified successfully.');
            console.log('User:', loginResult.user.name);
        } else {
            console.log('❌ Mobile Login failed:', loginResult.error);
        }

    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
    }
}

runTests();
