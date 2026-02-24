import { determineRequestType, getRequestTypeDescription } from './utils/requestTypeHelper.js';
import { LOCATION_TYPES, REQUEST_TYPES } from './constants/requestTypeConstants.js';

console.log('✅ CORRECTED SpareRequest Type Logic\n');
console.log('Request type represents the ACTUAL MOVEMENT OF GOODS, not request direction\n');

const testCases = [
  {
    scenario: 'ASC creates request FROM branch',
    source: LOCATION_TYPES.SERVICE_CENTER,
    dest: LOCATION_TYPES.PLANT,
    actualMovement: 'branch → service_center',
    expectedType: REQUEST_TYPES.CONSIGNMENT_FILLUP,
    description: 'Branch fills ASC stock (consignment fill-up)'
  },
  {
    scenario: 'Branch creates request FROM ASC',
    source: LOCATION_TYPES.PLANT,
    dest: LOCATION_TYPES.SERVICE_CENTER,
    actualMovement: 'service_center → branch',
    expectedType: REQUEST_TYPES.CONSIGNMENT_RETURN,
    description: 'ASC returns spares to branch (consignment return)'
  },
  {
    scenario: 'Technician creates request FROM ASC',
    source: LOCATION_TYPES.TECHNICIAN,
    dest: LOCATION_TYPES.SERVICE_CENTER,
    actualMovement: 'service_center → technician',
    expectedType: REQUEST_TYPES.TECH_CONSIGNMENT_ISSUE,
    description: 'ASC issues spares to technician (tech consignment issue)'
  },
  {
    scenario: 'ASC creates request FROM technician',
    source: LOCATION_TYPES.SERVICE_CENTER,
    dest: LOCATION_TYPES.TECHNICIAN,
    actualMovement: 'technician → service_center',
    expectedType: REQUEST_TYPES.TECH_CONSIGNMENT_RETURN,
    description: 'Technician returns spares to ASC (tech consignment return)'
  }
];

let allPassed = true;

testCases.forEach((test, idx) => {
  const result = determineRequestType(test.source, test.dest);
  const passed = result === test.expectedType;
  const status = passed ? '✅' : '❌';
  
  console.log(`${idx + 1}. ${test.scenario}`);
  console.log(`   Request source: ${test.source} | Request dest: ${test.dest}`);
  console.log(`   Actual goods movement: ${test.actualMovement}`);
  console.log(`   Expected type: ${test.expectedType}`);
  console.log(`   Result type: ${result}`);
  console.log(`   Status: ${status} ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`   Description: ${getRequestTypeDescription(result)}\n`);
  
  if (!passed) allPassed = false;
});

if (allPassed) {
  console.log('✅ ALL TESTS PASSED!');
  console.log('\nCorrect mappings for production:');
  console.log('  1. service_center → branch = consignment_fillup (branch fills ASC)');
  console.log('  2. branch → service_center = consignment_return (ASC returns to branch)');
  console.log('  3. technician → service_center = tech_consignment_issue (ASC issues to tech)');
  console.log('  4. service_center → technician = tech_consignment_return (tech returns to ASC)');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED!');
  process.exit(1);
}
