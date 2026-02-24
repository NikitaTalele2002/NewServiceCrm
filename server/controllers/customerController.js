import customerService from '../services/customerService.js';

async function createCustomer(req, res){
  try{
    const newCustomer = await customerService.createCustomer(req.body);
    return res.status(201).json({ success: true, customer: newCustomer });
  }catch(err){
    console.error('Create customer error:', err && err.stack ? err.stack : err);
    if(err.status === 400) return res.status(400).json({ error: err.message });
    if(err.status === 409) return res.status(409).json({ error: err.message, details: err.details || [] });
    const details = err && err.errors ? err.errors.map(e => e.message) : (err && err.message) || String(err);
    return res.status(500).json({ error: 'Customer creation failed', details });
  }
}

async function searchCustomer(req, res){
  try{
    console.log('=== Searching Customer ===');
    console.log('Search criteria:', req.body);
    
    const customer = await customerService.searchCustomer(req.body);
    
    if(!customer) {
      console.log('✗ No customer found');
      return res.json({ exists: false });
    }
    
    console.log('✓ Customer found:', customer.customer_id, customer.name);
    return res.json({ exists: true, customer });
  }catch(err){
    console.error('Search error:', err);
    return res.status(500).json({ error: 'Customer search failed', details: err.message });
  }
}

export default {
  createCustomer,
  searchCustomer
};
