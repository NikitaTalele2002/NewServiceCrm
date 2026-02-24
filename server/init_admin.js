const models = require('./models');

(async () => {
  try {
    console.log('Syncing Admin model with database...');
    
    // Sync Admin table (create if not exists)
    await models.Admin.sync({ alter: false });
    
    console.log('Admin table synced successfully');
    
    // Check if any admin exists
    const adminCount = await models.Admin.count();
    console.log(`Total admins in database: ${adminCount}`);
    
    if (adminCount === 0) {
      console.log('\n No admins found. Creating first super_admin...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('SuperAdmin@123', 10);
      
      const admin = await models.Admin.create({
        Name: 'Super Admin',
        Email: 'superadmin@finolexcrm.com',
        MobileNo: '9999999999',
        Password: hashedPassword,
        Role: 'super_admin',
        IsActive: true,
      });
      
      console.log('Super Admin created successfully!');
      console.log('\nLogin Credentials:');
      console.log('Email:', admin.Email);
      console.log('Password: SuperAdmin@123');
      console.log('Role:', admin.Role);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
