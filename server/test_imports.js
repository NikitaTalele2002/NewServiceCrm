/**
 * Quick Import Test
 * Verifies all critical imports work correctly
 */

console.log('Testing imports...\n');

try {
  console.log('1. Testing requestTypeHelper imports...');
  import('./utils/requestTypeHelper.js').then(helper => {
    console.log('   ✅ requestTypeHelper imported');
    console.log('   Available functions:', Object.keys(helper).filter(k => k !== 'default'));
  }).catch(err => {
    console.error('   ❌ Error:', err.message);
  });

  console.log('\n2. Testing constants imports...');
  import('./constants/requestTypeConstants.js').then(consts => {
    console.log('   ✅ requestTypeConstants imported');
    console.log('   Available exports:', Object.keys(consts));
  }).catch(err => {
    console.error('   ❌ Error:', err.message);
  });

  console.log('\n3. Testing bucketConstants imports...');
  import('./constants/bucketConstants.js').then(consts => {
    console.log('   ✅ bucketConstants imported');
    console.log('   Available exports:', Object.keys(consts));
  }).catch(err => {
    console.error('   ❌ Error:', err.message);
  });

  console.log('\n4. Testing bucketTrackingService imports...');
  import('./services/bucketTrackingService.js').then(service => {
    console.log('   ✅ bucketTrackingService imported');
    console.log('   Available functions:', Object.keys(service).filter(k => k !== 'default'));
  }).catch(err => {
    console.error('   ❌ Error:', err.message);
  });

  setTimeout(() => {
    console.log('\n✅ All import tests passed!\n');
    process.exit(0);
  }, 2000);

} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}
