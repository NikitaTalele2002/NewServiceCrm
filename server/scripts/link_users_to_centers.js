const { poolPromise, sql } = require('../db');

(async () => {
  try {
    const pool = await poolPromise;
    console.log('Linking service center users to ServiceCenters...');

    // Check if Users table has ServiceCenterId column
    const colCheck = await pool.request()
      .query("SELECT COL_LENGTH('dbo.Users', 'ServiceCenterId') AS colExists");
    
    const hasServiceCenterId = !!(colCheck.recordset && colCheck.recordset[0] && colCheck.recordset[0].colExists);

    if (!hasServiceCenterId) {
      console.log('Adding ServiceCenterId column to Users table...');
      await pool.request().query(`
        ALTER TABLE Users ADD ServiceCenterId INT NULL;
      `);
      console.log('ServiceCenterId column added');
    } else {
      console.log('ServiceCenterId column already exists');
    }

    // Get ServiceCenters
    const centerRes = await pool.request().query(`
      SELECT Id, CenterName, City FROM ServiceCenters ORDER BY Id
    `);
    const centers = centerRes.recordset || [];
    console.log('\nServiceCenters found:');
    centers.forEach(c => console.log(`  [${c.Id}] ${c.CenterName} - ${c.City}`));

    // Link thane_service user to a Thane service center if exists, otherwise to first center
    // Link pune_service user to Pune service center
    const thaneCenter = centers.find(c => c.City && c.City.toLowerCase().includes('thane')) || centers[0];
    const puneCenter = centers.find(c => c.City && c.City.toLowerCase().includes('pune')) || centers[0];

    console.log('\nLinking users:');
    if (thaneCenter) {
      await pool.request()
        .input('username', sql.NVarChar, 'thane_service')
        .input('centerId', sql.Int, thaneCenter.Id)
        .query(`UPDATE Users SET ServiceCenterId = @centerId WHERE Username = @username`);
      console.log(`thane_service linked to ${thaneCenter.CenterName} (Id=${thaneCenter.Id})`);
    }

    if (puneCenter) {
      await pool.request()
        .input('username', sql.NVarChar, 'pune_service')
        .input('centerId', sql.Int, puneCenter.Id)
        .query(`UPDATE Users SET ServiceCenterId = @centerId WHERE Username = @username`);
      console.log(`pune_service linked to ${puneCenter.CenterName} (Id=${puneCenter.Id})`);
    }

    // Display updated users
    const usersRes = await pool.request().query(`
      SELECT UserID, Username, Role, ServiceCenterId FROM Users WHERE Role LIKE '%service%'
    `);
    console.log('\nUpdated Users:');
    (usersRes.recordset || []).forEach(u => {
      console.log(`  [${u.UserID}] ${u.Username} -> ServiceCenterId=${u.ServiceCenterId}`);
    });

    console.log('\Done');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
