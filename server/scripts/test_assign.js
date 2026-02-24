const { poolPromise } = require('../db');
const autoAssign = require('../routes/autoAssign');

async function run() {
  const pool = await poolPromise;

  console.log('--- ServiceCenters table ---');
  try {
    const res = await pool.request().query('SELECT Id, CenterName, PinCode, City, State FROM ServiceCenters');
    console.log('Total centers:', res.recordset.length);
    res.recordset.forEach(c => console.log(c));
  } catch (e) {
    console.error('Error querying ServiceCenters:', e && e.message ? e.message : e);
  }

  const tests = [
    { pincode: '411044', customer: { City: 'Pune', State: 'Maharashtra', PinCode: '411044' } },
    { pincode: '400001', customer: { City: 'Mumbai', State: 'Maharashtra', PinCode: '400001' } },
    { pincode: null, customer: { City: 'UnknownCity', State: 'Karnataka' } },
    { pincode: null, customer: null }
  ];

  for (const t of tests) {
    try {
      console.log('\nTest input:', JSON.stringify(t));
      const result = await autoAssign.findNearestCenter({ pincode: t.pincode, customerAddress: null, customer: t.customer });
      console.log('Result matchedBy:', result.matchedBy);
      console.log('Best center:', result.bestCenter);
    } catch (e) {
      console.error('Finder error for input', JSON.stringify(t), '->', e && e.message ? e.message : e);
    }
  }
}

run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
