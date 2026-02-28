import jwt from 'jsonwebtoken';
import { Users, ServiceCenter } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_change_me';

async function findUserByUsername(username) {
  if (!username) return null;
  try {
    // Try name lookup first
    let user = await Users.findOne({ where: { name: username } });
    if (user) {
      console.log(`✓ User found by name: ${username}`);
      return user;
    }

    // Try user_id lookup (if username is numeric)
    if (!isNaN(username)) {
      user = await Users.findOne({ where: { user_id: parseInt(username) } });
      if (user) {
        console.log(`✓ User found by user_id: ${username}`);
        return user;
      }
    }

    console.log(`✗ User not found: ${username}`);
    return null;
  } catch (err) {
    console.error('Error finding user:', err.message);
    return null;
  }
}

function createTokenForUser(user, role, serviceCenterId, branchId, rsmId = null) {
  const payload = {
    id: user.user_id,
    username: user.name,
    role: role || 'call_center',
    centerId: serviceCenterId || user.centerId || user.ServiceCenterId || null
  };
  if ((role || '').toLowerCase() === 'branch') {
    payload.branchId = branchId || user.branchId || user.BranchId || null;
  }
  // Add rsmId for RSM users - ONLY if it was found in database
  if ((role || '').toLowerCase() === 'rsm' && rsmId) {
    payload.rsmId = rsmId;
  }
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
  return token;
}

async function authenticateCredentials(username, password) {
  try {
    console.log(`\n🔐 Authentication attempt for: ${username}`);

    const user = await findUserByUsername(username);
    if (!user) {
      console.log(`✗ Authentication failed: User not found`);
      return { success: false, error: 'User not found' };
    }

    console.log(`Checking password for user: ${user.name} (ID: ${user.user_id})`);

    // Check password (plain text for now - should be hashed in production)
    if (user.password !== password) {
      console.log(`✗ Authentication failed: Invalid password for ${user.name}`);
      return { success: false, error: 'Invalid password' };
    }

    console.log(`✓ Authentication successful for: ${user.name}`);


    // Determine role by role_id using Roles table
    let role = 'call_center';
    let serviceCenterId = null;
    let branchId = null;
    let rsmId = null;  // ADD: Scope for RSM ID
    let roleName = null;
    try {
      // Dynamically import Roles model to avoid circular dependency
      const { Roles } = await import('../models/index.js');
      console.log(`Looking up role for user (role_id: ${user.role_id})...`);
      const userRole = await Roles.findOne({ where: { roles_id: user.role_id } });
      if (userRole) {
        roleName = (userRole.roles_name || '').toLowerCase();
        console.log(`✓ Found role: "${roleName}" for user ${user.name}`);
        if (roleName === 'admin') {
          role = 'admin';
        } else if (roleName === 'service_center' || roleName === 'service-center') {
          role = 'service_center';
          // Try to find service center association for asc_id
          try {
            // IMPORTANT: Query by user_id but return asc_id
            // asc_id is the actual Service Center ID (NOT user_id)
            const serviceCenter = await ServiceCenter.findOne({
              where: { user_id: user.user_id },
              attributes: ['asc_id', 'asc_name', 'asc_code']
            });
            if (serviceCenter) {
              // Store asc_id (NOT user_id or any other ID)
              serviceCenterId = serviceCenter.asc_id;
              console.log(`✓ Found service center (asc_id: ${serviceCenterId}, asc_name: ${serviceCenter.asc_name}) for user_id: ${user.user_id}`);
            } else {
              console.warn(`⚠ No service center found for user_id: ${user.user_id}`);
            }
          } catch (scErr) {
            console.warn('Could not check service center association:', scErr.message);
          }
        } else if (roleName === 'call_center' || roleName === 'call-center') {
          role = 'call_center';
        } else if (roleName === 'branch') {
          role = 'branch';
          // Fetch plant_id from plants table for branch users
          try {
            const { Plant } = await import('../models/index.js');
            const plant = await Plant.findOne({ where: { user_id: user.user_id } });
            if (plant && plant.plant_id) {
              branchId = plant.plant_id;
              console.log(`✓ Found plant_id (used as branchId): ${plant.plant_id} for user_id: ${user.user_id}`);
            } else {
              console.warn(`⚠ No plant found for user_id: ${user.user_id}`);
            }
          } catch (bErr) {
            console.warn('Could not check plant association:', bErr.message);
          }
        } else if (roleName === 'rsm' || roleName === 'regional sales manager') {
          role = 'rsm';
          // Fetch rsm_id from rsms table for RSM users
          try {
            const { sequelize } = await import('../db.js');
            const rsmResult = await sequelize.query(
              'SELECT TOP 1 rsm_id FROM rsms WHERE user_id = ?',
              { replacements: [user.user_id], type: sequelize.QueryTypes.SELECT }
            );
            if (rsmResult && rsmResult[0] && rsmResult[0].rsm_id) {
              rsmId = rsmResult[0].rsm_id;  // Assign to outer scope variable
              console.log(`✓ Found RSM ID: ${rsmId} for user_id: ${user.user_id}`);

              // Fetch a service center for this RSM's assigned plants
              try {
                const scResult = await sequelize.query(
                  `SELECT TOP 1 sc.asc_id, sc.asc_name
                   FROM ServiceCenter sc
                   INNER JOIN plants p ON sc.plant_id = p.plant_id
                   INNER JOIN rsm_state_mapping rsm ON p.state_id = rsm.state_id
                   WHERE rsm.rsm_user_id = ? AND rsm.is_active = 1
                   ORDER BY sc.asc_id ASC`,
                  { replacements: [rsmId], type: sequelize.QueryTypes.SELECT }
                );
                if (scResult && scResult[0] && scResult[0].asc_id) {
                  serviceCenterId = scResult[0].asc_id;
                  console.log(`✓ Found service center (asc_id: ${serviceCenterId}, name: ${scResult[0].asc_name}) for RSM ${rsmId}`);
                } else {
                  console.warn(`⚠ No service center found for RSM ${rsmId}. RSM may not be assigned to any states/plants with service centers`);
                }
              } catch (scErr) {
                console.warn('Could not lookup service center for RSM:', scErr.message);
              }
            } else {
              console.warn(`⚠ No RSM record found for user_id: ${user.user_id}`);
            }
          } catch (rsmErr) {
            console.warn('Could not lookup RSM ID:', rsmErr.message);
          }
        }
      } else {
        console.warn(`⚠ No role found in Roles table for role_id: ${user.role_id}. Defaulting to 'call_center'`);
      }
    } catch (roleErr) {
      console.warn('Could not determine user role from Roles table:', roleErr.message);
    }

    console.log(`✓ Final role for user ${user.name}: "${role}"`);

    // Create token with centerId for service center users, branchId for branch users, rsmId for RSM users
    const token = createTokenForUser({ ...user.toJSON(), role }, role, serviceCenterId, branchId, rsmId);

    const response = {
      success: true,
      user: {
        user_id: user.user_id,
        username: user.name,
        name: user.name,
        Role: role,
        centerId: serviceCenterId || null
      },
      token
    };

    // Log response for debugging
    console.log(`[authService] Login response for ${user.name}:`, {
      role,
      centerId: serviceCenterId,
      hasToken: !!token
    });

    return response;
  } catch (err) {
    console.error('Auth error:', err);
    return { success: false, error: 'Authentication failed' };
  }
}

export default {
  authenticateCredentials,
  findUserByUsername,
  createTokenForUser
};
