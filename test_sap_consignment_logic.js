import { determineRequestType, getSAPConsignmentCode, getRequestTypeDescription } from './server/utils/requestTypeHelper.js';
import { createSpareRequestWithAutoType, getRequestTypeInfo } from './server/utils/createSpareRequestWithAutoType.js';
import { LOCATION_TYPES, REQUEST_REASONS } from './server/constants/requestTypeConstants.js';

console.log('✅ SAP CONSIGNMENT TYPE LOGIC - REASON-BASED\n');
console.log('Request type now AUTO-DETERMINES based on SOURCE + DESTINATION + REASON\n');

const testCases = [
  {
    scenario: 'ASC requests NEW STOCK from branch (Fill-up)',
    source: LOCATION_TYPES.SERVICE_CENTER,
    dest: LOCATION_TYPES.PLANT,
    reason: REQUEST_REASONS.MSL,
    expectedType: 'consignment_fillup',
    sapCode: 'CFS',
    movement: 'branch → service_center'
  },
  {
    scenario: 'ASC requests BULK stock from branch',
    source: LOCATION_TYPES.SERVICE_CENTER,
    dest: LOCATION_TYPES.PLANT,
    reason: REQUEST_REASONS.BULK,
    expectedType: 'consignment_fillup',
    sapCode: 'CFS',
    movement: 'branch → service_center'
  },
  {
    scenario: 'ASC returns DEFECTIVE stock to branch',
    source: LOCATION_TYPES.SERVICE_CENTER,
    dest: LOCATION_TYPES.PLANT,
    reason: REQUEST_REASONS.DEFECT,
    expectedType: 'consignment_return',
    sapCode: 'CR',
    movement: 'service_center → branch'
  },
  {
    scenario: 'ASC returns UNUSED stock to branch',
    source: LOCATION_TYPES.SERVICE_CENTER,
    dest: LOCATION_TYPES.PLANT,
    reason: REQUEST_REASONS.UNUSED,
    expectedType: 'consignment_return',
    sapCode: 'CR',
    movement: 'service_center → branch'
  },
  {
    scenario: 'Branch physically PICKS UP stock from ASC',
    source: LOCATION_TYPES.PLANT,
    dest: LOCATION_TYPES.SERVICE_CENTER,
    reason: REQUEST_REASONS.PICKUP,
    expectedType: 'consignment_pickup',
    sapCode: 'CFU',
    movement: 'branch → service_center'
  },
  {
    scenario: 'Technician RETURNS DEFECTIVE parts to ASC',
    source: LOCATION_TYPES.TECHNICIAN,
    dest: LOCATION_TYPES.SERVICE_CENTER,
    reason: REQUEST_REASONS.DEFECT,
    expectedType: 'tech_defective_return',
    sapCode: 'TDR',
    movement: 'technician → service_center'
  },
  {
    scenario: 'Technician RETURNS parts to ASC',
    source: LOCATION_TYPES.TECHNICIAN,
    dest: LOCATION_TYPES.SERVICE_CENTER,
    reason: REQUEST_REASONS.RETURN,
    expectedType: 'tech_defective_return',
    sapCode: 'TDR',
    movement: 'technician → service_center'
  }
];

let allPassed = true;

console.log('SCENARIO TESTING:\n');
testCases.forEach((test, idx) => {
  const result = determineRequestType(test.source, test.dest, test.reason);
  const sapCode = getSAPConsignmentCode(result);
  const passed = result === test.expectedType && sapCode === test.sapCode;
  const status = passed ? '✅' : '❌';
  
  console.log(`${idx + 1}. ${test.scenario}`);
  console.log(`   Source: ${test.source} | Dest: ${test.dest} | Reason: ${test.reason}`);
  console.log(`   Expected type: ${test.expectedType} [${test.sapCode}]`);
  console.log(`   Result type: ${result} [${sapCode}]`);
  console.log(`   Actual movement: ${test.movement}`);
  console.log(`   Status: ${status} ${passed ? 'PASS' : 'FAIL'}\n`);
  
  if (!passed) allPassed = false;
});

if (allPassed) {
  console.log('✅ ALL SCENARIO TESTS PASSED!\n');
  
  console.log('INFO EXTRACTION EXAMPLES:\n');
  
  // Show how to use getRequestTypeInfo
  const infoExamples = [
    { source: LOCATION_TYPES.SERVICE_CENTER, dest: LOCATION_TYPES.PLANT, reason: REQUEST_REASONS.MSL },
    { source: LOCATION_TYPES.SERVICE_CENTER, dest: LOCATION_TYPES.PLANT, reason: REQUEST_REASONS.DEFECT },
    { source: LOCATION_TYPES.PLANT, dest: LOCATION_TYPES.SERVICE_CENTER, reason: REQUEST_REASONS.PICKUP },
    { source: LOCATION_TYPES.TECHNICIAN, dest: LOCATION_TYPES.SERVICE_CENTER, reason: REQUEST_REASONS.DEFECT }
  ];
  
  infoExamples.forEach((example, idx) => {
    const info = getRequestTypeInfo(example.source, example.dest, example.reason);
    console.log(`${idx + 1}. ${info.source} → ${info.destination} (Reason: ${info.reason})`);
    console.log(`   Type: ${info.request_type}`);
    console.log(`   SAP Code: ${info.sap_code}`);
    console.log(`   Details: ${info.description}\n`);
  });
  
  console.log('✅ SYSTEM READY FOR SAP CONSIGNMENT TRACKING!');
  console.log('\nKey Features:');
  console.log('  ✓ Reason-based request type auto-determination');
  console.log('  ✓ SAP-compliant consignment codes (CFS, CR, CFU, TDR)');
  console.log('  ✓ Backward compatible with legacy code');
  console.log('  ✓ Generates detailed movement tracking data');
  
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED!');
  process.exit(1);
}
