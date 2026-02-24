import { Product, Customer } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../db.js';

async function getAllProducts(){
  const products = await Product.findAll({
    include: [{ model: Customer, attributes: ['Id','Name','MobileNo'], required: false }],
    order: [['ProductID','DESC']]
  });
  return products;
}

async function getProductsByPhone(phone){
  const customer = await Customer.findOne({ where: { MobileNo: phone } });
  if(!customer) return [];
  const products = await Product.findAll({ where: { CustomerID: customer.Id }, include: [{ model: Customer, attributes: ['Id','Name','MobileNo'], required: false }], order: [['ProductID','DESC']] });
  return products;
}

async function addProduct(payload){
  const { CustomerPhone, PurchaseDate, PreviousCalls, ...rest } = payload;
  let customerId = null;
  if(CustomerPhone){
    const customer = await Customer.findOne({ where: { MobileNo: CustomerPhone } });
    if(customer) customerId = customer.Id;
  }
  const newProduct = await Product.create({
    ...rest,
    PurchaseDate: PurchaseDate || null,
    PreviousCalls: PreviousCalls || 0,
    CustomerID: customerId
  });
  return newProduct;
}

async function searchProducts(criteria){
  const { Brand, ProductGroup, ProductName, Model, ProductSerialNo } = criteria || {};
  const where = {};
  if(Brand) where.Brand = { [Op.like]: `%${Brand}%` };
  if(ProductGroup) where.ProductGroup = { [Op.like]: `%${ProductGroup}%` };
  if(ProductName) where.ProductName = { [Op.like]: `%${ProductName}%` };
  if(Model) where.Model = { [Op.like]: `%${Model}%` };
  if(ProductSerialNo) where.ProductSerialNo = ProductSerialNo;
  const rows = await Product.findAll({ where, include: [{ model: Customer, attributes: ['Id','Name','MobileNo'], required: false }], order: [['ProductID','DESC']] });
  return rows;
}

async function getGroups(){
  const { ProductGroup } = await import('../models/index.js');
  const groups = await ProductGroup.findAll({ order: [['VALUE','ASC']] });
  return groups;
}

async function getProductsForGroup(groupId){
  const { ProductMaster } = await import('../models/index.js');
  const products = await ProductMaster.findAll({ where: { ProductGroupID: groupId }, order: [['VALUE','ASC']] });
  return products;
}

async function getModelsForProduct(productId){
  const { ProductModel } = await import('../models/index.js');
  const models = await ProductModel.findAll({ where: { ProductID: productId }, order: [['MODEL_CODE','ASC']] });
  return models;
}

async function getSparesForGroup(groupId, user){
  const scId = user?.branchId || user?.centerId || user?.id;
  const spares = await sequelize.query(`
    SELECT sp.* FROM SpareParts sp
    WHERE sp.MAPPED_MODEL IN (
      SELECT pm.MODEL_CODE FROM ProductModels pm
      INNER JOIN ProductMaster p ON pm.Product = p.ID
      WHERE p.Product_group_ID = ?
    )
  `, { replacements: [groupId], type: sequelize.QueryTypes.SELECT });
  return spares;
}

async function getSparesForProduct(productId){
  const spares = await sequelize.query(`
    SELECT sp.* FROM SpareParts sp
    WHERE sp.MAPPED_MODEL IN (
      SELECT pm.MODEL_CODE FROM ProductModels pm
      WHERE pm.Product = ?
    )
  `, { replacements: [productId], type: sequelize.QueryTypes.SELECT });
  return spares;
}

async function getInventory(sku){
  if(!sku){
    const inventory = await sequelize.query(`
      SELECT 
        sri.Sku AS SKU,
        sri.SpareName AS 'Spare Name',
        sri.ApprovedQty AS 'Good Qty',
        0 AS 'Defective Qty',
        sri.ApprovedQty AS Total,
        sr.ApprovedBy AS 'Approved By',
        sr.ApprovedAt AS 'Approved At'
      FROM SpareRequestItems sri
      JOIN SpareRequests sr ON sri.RequestId = sr.Id
      WHERE sr.Status = 'approved'
      ORDER BY sr.ApprovedAt DESC
    `, { type: sequelize.QueryTypes.SELECT });
    return inventory;
  } else {
    const inventory = await sequelize.query(`
      SELECT sr.RequestNumber AS 'Invoice Number', sr.CreatedAt AS 'Invoice Date', sri.Sku AS 'SKU/Part Code', sri.SpareName AS 'Part Name', sri.RequestedQty AS 'Invoice Quantity'
      FROM SpareRequestItems sri
      JOIN SpareRequests sr ON sri.RequestId = sr.Id
      WHERE sri.Sku = ?
      ORDER BY sr.CreatedAt DESC
    `, { replacements: [sku], type: sequelize.QueryTypes.SELECT });
    return inventory;
  }
}

export default {
  getAllProducts,
  getProductsByPhone,
  addProduct,
  searchProducts,
  getGroups,
  getProductsForGroup,
  getModelsForProduct,
  getSparesForGroup,
  getSparesForProduct,
  getInventory
};
