const path = require('path');
const models = require(path.join(__dirname, '..', 'models', 'index.js'));

async function seed() {
  try {
    const { sequelize, ServiceCentre, Customer, Product, Technician, ComplaintRegistration } = models;

    console.log('Seeding test data...');

    // Ensure DB sync (no force)
    await sequelize.sync();

    // Service centers
    const centers = [
      { CenterName: 'Pune Service Centre', Address: 'Shop 1, Main Road', City: 'Pune', State: 'Maharashtra', PinCode: '411057', Phone: '020-111111' },
      { CenterName: 'Mumbai Service Centre', Address: 'Unit 4, Market Street', City: 'Mumbai', State: 'Maharashtra', PinCode: '400001', Phone: '022-222222' },
      { CenterName: 'Bengaluru Service Centre', Address: 'No.7, Tech Park', City: 'Bengaluru', State: 'Karnataka', PinCode: '560001', Phone: '080-333333' },
      { CenterName: 'Pune East Service Centre', Address: 'Plot 5, East Avenue', City: 'Pune', State: 'Maharashtra', PinCode: '411044', Phone: '020-444444' },
    ];

    const createdCenters = [];
    for (const c of centers) {
      const [row] = await ServiceCentre.findOrCreate({ where: { CenterName: c.CenterName }, defaults: c });
      createdCenters.push(row);
    }

    // Customers
    const customers = [
      { Name: 'Alice Kumar', MobileNo: '9000000001', Address: '1 A Street', City: 'Pune', State: 'Maharashtra', PinCode: '411057', CustomerCode: 'CUST001' },
      { Name: 'Bhushan Rao', MobileNo: '9000000002', Address: '2 B Street', City: 'Mumbai', State: 'Maharashtra', PinCode: '400001', CustomerCode: 'CUST002' },
      { Name: 'Chitra N', MobileNo: '9000000003', Address: '3 C Street', City: 'Bengaluru', State: 'Karnataka', PinCode: '560001', CustomerCode: 'CUST003' },
    ];

    const createdCustomers = [];
    for (const c of customers) {
      const [row] = await Customer.findOrCreate({ where: { MobileNo: c.MobileNo }, defaults: c });
      createdCustomers.push(row);
    }

    // Products (linked to customers)
    const products = [
      { Brand: 'FINOLEX', ProductGroup: 'Fans', ProductName: 'Exhaust Fan', Model: 'EX-100', ProductSerialNo: 'SN-EX-100-1', CustomerID: createdCustomers[0].Id },
      { Brand: 'FINOLEX', ProductGroup: 'Switches', ProductName: 'Switch Board', Model: 'SW-200', ProductSerialNo: 'SN-SW-200-1', CustomerID: createdCustomers[1].Id },
      { Brand: 'FINOLEX', ProductGroup: 'Wires', ProductName: 'Copper Wire', Model: 'CW-300', ProductSerialNo: 'SN-CW-300-1', CustomerID: createdCustomers[2].Id },
    ];

    for (const p of products) {
      await Product.findOrCreate({ where: { ProductSerialNo: p.ProductSerialNo }, defaults: p });
    }

    // Technicians - attach to centers
    const techs = [
      { TechnicianName: 'Rajesh', MobileNo: '9876500001', City: 'Pune', ServiceCentreId: createdCenters[0].Id },
      { TechnicianName: 'Suresh', MobileNo: '9876500002', City: 'Mumbai', ServiceCentreId: createdCenters[1].Id },
      { TechnicianName: 'Manoj', MobileNo: '9876500003', City: 'Bengaluru', ServiceCentreId: createdCenters[2].Id },
    ];

    for (const t of techs) {
      await Technician.findOrCreate({ where: { TechnicianName: t.TechnicianName }, defaults: t });
    }

    // Skip complaint seeding - table may have schema differences
    console.log('Seeding complete (service centers, customers, products, technicians added).');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
