import { determineRequestType, getRequestTypeDescription } from './utils/requestTypeHelper.js';

/**
 * Examples of how request types are auto-determined based on source and destination
 */

console.log('SpareRequest Type Determination Examples:\n');

// Example 1: Technician returning spare to service center
const type1 = determineRequestType('technician', 'service_center');
console.log(`✓ Technician → Service Center: ${type1}`);
console.log(`  Description: ${getRequestTypeDescription(type1)}\n`);

// Example 2: Service center issuing spare to technician
const type2 = determineRequestType('service_center', 'technician');
console.log(`✓ Service Center → Technician: ${type2}`);
console.log(`  Description: ${getRequestTypeDescription(type2)}\n`);

// Example 3: Service center returning consignment to branch
const type3 = determineRequestType('service_center', 'branch');
console.log(`✓ Service Center → Branch: ${type3}`);
console.log(`  Description: ${getRequestTypeDescription(type3)}\n`);

// Example 4: Branch filling stock to service center
const type4 = determineRequestType('branch', 'service_center');
console.log(`✓ Branch → Service Center: ${type4}`);
console.log(`  Description: ${getRequestTypeDescription(type4)}\n`);

// Example 5: Other combinations default to 'normal'
const type5 = determineRequestType('warehouse', 'service_center');
console.log(`✓ Warehouse → Service Center: ${type5}`);
console.log(`  Description: ${getRequestTypeDescription(type5)}\n`);

console.log('All mappings:');
console.log('  1. technician → service_center = tech_consignment_return');
console.log('  2. service_center → technician = tech_consignment_issue');
console.log('  3. service_center → branch = consignment_return');
console.log('  4. branch → service_center = consignment_fillup');
console.log('  5. all others = normal (default)');
