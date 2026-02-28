import authService from './authService.js';
import { Technicians } from '../models/index.js';

/**
 * Mobile-specific authentication logic to keep the main authService clean.
 */

async function technicianMobileLogin(mobileNo) {
    try {
        console.log(`\n📱 Mobile Login attempt for technician: ${mobileNo}`);

        const technician = await Technicians.findOne({
            where: {
                mobile_no: mobileNo,
                status: 'active'
            }
        });

        if (!technician) {
            console.log(`✗ Mobile login failed: Technician not found or inactive`);
            return { success: false, error: 'Technician not found or inactive' };
        }

        console.log(`✓ Technician found: ${technician.name} (ID: ${technician.technician_id})`);

        // Determine role and IDs
        const role = 'technician';
        const serviceCenterId = technician.service_center_id;

        // Use the core token generation logic from the main authService
        const token = authService.createTokenForUser({
            user_id: technician.technician_id,
            name: technician.name
        }, role, serviceCenterId, null);

        const response = {
            success: true,
            user: {
                user_id: technician.technician_id,
                username: technician.name,
                name: technician.name,
                Role: role,
                centerId: serviceCenterId || null
            },
            token
        };

        console.log(`[mobileAuthService] Technician Mobile Login success for ${technician.name}`);

        return response;
    } catch (err) {
        console.error('Technician Mobile Auth error:', err);
        return { success: false, error: 'Authentication failed', details: err.message };
    }
}

export default {
    technicianMobileLogin
};
