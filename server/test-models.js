// Quick test to see which model fails to load
console.log('Testing model loading...\n');

try {
  console.log('1. Requiring db.js...');
  const { sequelize } = require('./db');
  console.log('✓ db.js loaded\n');

  console.log('2. Requiring Customer factory...');
  const CustomerFactory = require('./models/Customer');
  console.log('   Type:', typeof CustomerFactory);
  if (typeof CustomerFactory === 'function') {
    const Customer = CustomerFactory(sequelize);
    console.log('   ✓ Customer factory works, model:', !!Customer, '\n');
  } else {
    console.log('   ✗ Customer is not a function!\n');
  }

  console.log('3. Requiring Product factory...');
  const ProductFactory = require('./models/Product');
  console.log('   Type:', typeof ProductFactory);
  if (typeof ProductFactory === 'function') {
    const Product = ProductFactory(sequelize);
    console.log('   ✓ Product factory works, model:', !!Product, '\n');
  } else {
    console.log('   ✗ Product is not a function!\n');
  }

  console.log('4. Requiring Technician factory...');
  const TechnicianFactory = require('./models/Technician');
  console.log('   Type:', typeof TechnicianFactory);
  if (typeof TechnicianFactory === 'function') {
    const Technician = TechnicianFactory(sequelize);
    console.log('   ✓ Technician factory works, model:', !!Technician, '\n');
  } else {
    console.log('   ✗ Technician is not a function!\n');
  }

  console.log('5. Requiring ServiceCentre factory...');
  const ServiceCentreFactory = require('./models/ServiceCentre');
  console.log('   Type:', typeof ServiceCentreFactory);
  if (typeof ServiceCentreFactory === 'function') {
    const ServiceCentre = ServiceCentreFactory(sequelize);
    console.log('   ✓ ServiceCentre factory works, model:', !!ServiceCentre, '\n');
  } else {
    console.log('   ✗ ServiceCentre is not a function!\n');
  }

  console.log('6. Requiring ComplaintRegistration factory...');
  const ComplaintRegistrationFactory = require('./models/ComplaintRegistration');
  console.log('   Type:', typeof ComplaintRegistrationFactory);
  if (typeof ComplaintRegistrationFactory === 'function') {
    const ComplaintRegistration = ComplaintRegistrationFactory(sequelize);
    console.log('   ✓ ComplaintRegistration factory works, model:', !!ComplaintRegistration, '\n');
  } else {
    console.log('   ✗ ComplaintRegistration is not a function!\n');
  }

  console.log('7. Requiring models/index.js...');
  const models = require('./models');
  console.log('   Customer:', !!models.Customer);
  console.log('   Product:', !!models.Product);
  console.log('   Technician:', !!models.Technician);
  console.log('   ServiceCentre:', !!models.ServiceCentre);
  console.log('   ComplaintRegistration:', !!models.ComplaintRegistration);

  console.log('\n✓ All models loaded successfully!');
  process.exit(0);

} catch (err) {
  console.error('\n✗ Error:', err && err.message ? err.message : err);
  if (err && err.stack) console.error(err.stack);
  process.exit(1);
}
