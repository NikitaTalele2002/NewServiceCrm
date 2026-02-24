import productService from '../services/productService.js';

async function listProducts(req, res){
  try{
    const products = await productService.getAllProducts();
    return res.json(products);
  }catch(err){
    console.error('Error fetching products:', err && err.message);
    return res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
}

async function productsByPhone(req, res){
  try{
    const { phone } = req.params;
    const products = await productService.getProductsByPhone(phone);
    return res.json(products);
  }catch(err){
    console.error('Error fetching products by phone:', err && err.message);
    return res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
}

async function addProduct(req, res){
  try{
    const product = await productService.addProduct(req.body);
    return res.status(201).json({ message: 'Product added successfully', product });
  }catch(err){
    console.error('Error adding product:', err);
    if(err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'ProductSerialNo must be unique' });
    return res.status(500).json({ error: 'Failed to add product', details: err.message });
  }
}

async function searchProducts(req, res){
  try{
    const rows = await productService.searchProducts(req.body);
    return res.json({ rows });
  }catch(err){
    console.error('Search product error:', err);
    return res.status(500).json({ error: 'Product search failed', details: err.message });
  }
}

async function getGroups(req, res){
  try{
    const groups = await productService.getGroups();
    return res.json(groups);
  }catch(err){
    console.error('Error fetching product groups:', err);
    return res.status(500).json({ error: 'Failed to fetch product groups' });
  }
}

async function getProductsForGroup(req, res){
  try{
    const products = await productService.getProductsForGroup(req.params.groupId);
    return res.json(products);
  }catch(err){
    console.error('Error fetching products for group:', err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}

async function getModelsForProduct(req, res){
  try{
    const models = await productService.getModelsForProduct(req.params.productId);
    return res.json(models);
  }catch(err){
    console.error('Error fetching models for product:', err);
    return res.status(500).json({ error: 'Failed to fetch models' });
  }
}

async function getSparesForGroup(req, res){
  try{
    const spares = await productService.getSparesForGroup(req.params.groupId, req.user);
    return res.json(spares);
  }catch(err){
    console.error('Error fetching spares for group:', err);
    return res.status(500).json({ error: 'Failed to fetch spares for group' });
  }
}

async function getSparesForProduct(req, res){
  try{
    const spares = await productService.getSparesForProduct(req.params.productId);
    return res.json(spares);
  }catch(err){
    console.error('Error fetching spares for product:', err);
    return res.status(500).json({ error: 'Failed to fetch spares for product' });
  }
}

async function getInventory(req, res){
  try{
    const { sku } = req.query;
    const inventory = await productService.getInventory(sku);
    return res.json(inventory);
  }catch(err){
    console.error('Error fetching inventory:', err);
    return res.status(500).json({ error: 'Failed to fetch inventory' });
  }
}

export default {
  listProducts,
  productsByPhone,
  addProduct,
  searchProducts,
  getGroups,
  getProductsForGroup,
  getModelsForProduct,
  getSparesForGroup,
  getSparesForProduct,
  getInventory
};
