// Test what master-data API returns for product groups and products
const token = localStorage.getItem('token');

console.log('Fetching product groups...');
fetch('http://localhost:5173/api/admin/master-data?type=productgroup', {
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(r => r.json())
  .then(data => {
    console.log('Product groups response:', data);
    const groups = data.rows || data.data || data;
    if (groups && groups.length > 0) {
      console.log('First group object:', JSON.stringify(groups[0], null, 2));
      
      // Try to get products for first group
      const groupId = groups[0].Id || groups[0].VALUE;
      console.log('\nFetching products for group ID:', groupId);
      
      return fetch(`http://localhost:5173/api/admin/master-data?type=product`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
  })
  .then(r => r?.json())
  .then(data => {
    if (data) {
      console.log('Products response length:', data.rows?.length || data.length);
      const products = data.rows || data.data || data;
      if (products && products.length > 5) {
        console.log('First 3 products:');
        for (let i = 0; i < 3; i++) {
          console.log(`  Product ${i}:`, JSON.stringify(products[i], null, 2));
        }
      }
    }
  })
  .catch(e => console.error('Error:', e));
