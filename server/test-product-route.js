// Test if products route loads correctly
console.log('Testing products route loading...\n');

try {
  console.log('1. Requiring models/index.js...');
  const { Product, Customer } = require('./models');
  console.log('   Product:', typeof Product, !!Product);
  console.log('   Customer:', typeof Customer, !!Customer);
  
  if (!Product) {
    throw new Error('Product is undefined after require!');
  }
  if (!Customer) {
    throw new Error('Customer is undefined after require!');
  }

  console.log('\n2. Checking Product methods...');
  console.log('   Product.findAll:', typeof Product.findAll);
  console.log('   Product.create:', typeof Product.create);
  console.log('   Product.findOne:', typeof Product.findOne);

  if (typeof Product.create !== 'function') {
    throw new Error('Product.create is not a function!');
  }

  console.log('\n✓ Product model is valid and ready to use!');
  process.exit(0);

} catch (err) {
  console.error('\n✗ Error:', err && err.message ? err.message : err);
  if (err && err.stack) console.error(err.stack);
  process.exit(1);
}
