import { useState, useEffect } from 'react';
import { productService } from '../services/productService';

/**
 * Initial product form state
 * @type {Object}
 */
const initialState = {
  CustomerPhone: '',
  Brand: 'Finolex',
  ProductGroup: '',
  ProductID: '',
  ProductName: '',
  ModelID: '',
  ModelDescription: '',
  ProductSerialNo: '',
  PurchaseDate: '',
  DealerName: '',
  WarrantyStatus: '',
  PreviousCalls: 0,
  CallStatus: '',
};

/**
 * Custom hook for product management with cascading selection
 * 
 * Manages product-related state including:
 * - Product group selection
 * - Product selection within group
 * - Model selection within product
 * - Automatic cascade updates
 * 
 * Automatically loads and updates data as selections change
 * Prevents invalid combinations (e.g., model from different product)
 * 
 * @returns {Object} Product hook interface
 * @returns {Object} .product - Current product form state
 * @returns {Array} .productGroups - Available product groups
 * @returns {Array} .products - Products in selected group
 * @returns {Array} .models - Models in selected product
 * @returns {boolean} .loading - Loading state for async operations
 * @returns {string|null} .error - Error message if operation fails
 * @returns {Function} .updateProduct - Update single product field
 * @returns {Function} .setProductGroup - Set product group with cascade reset
 * @returns {Function} .setProductId - Set product with cascade reset
 * @returns {Function} .setModelId - Set product model
 * @returns {Function} .resetProduct - Reset to initial state
 * 
 * @example
 * const { product, productGroups, products, models, updateProduct, setProductGroup } = useProduct();
 * 
 * const handleGroupChange = (groupId) => {
 *   setProductGroup(groupId); // Automatically resets products and models
 * };
 */
export const useProduct = () => {
  const [product, setProduct] = useState(initialState);
  const [productGroups, setProductGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load product groups on component mount
   * Executes once when hook is first used
   */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const groups = await productService.getProductGroups();
        setProductGroups(groups);
      } catch (err) {
        setError(err.message || 'Failed to load product groups');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Load products when product group changes
   * Automatically triggered when ProductGroup field updates
   * Resets products and models when group is cleared
   */
  useEffect(() => {
    (async () => {
      if (!product.ProductGroup) {
        setProducts([]);
        setModels([]);
        return;
      }
      setLoading(true);
      try {
        const prods = await productService.getProductsByGroup(product.ProductGroup);
        setProducts(prods);
        setModels([]);
      } catch (err) {
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    })();
  }, [product.ProductGroup]);

  /**
   * Load models when product changes
   * Automatically triggered when ProductID field updates
   * Resets models when product is cleared
   */
  useEffect(() => {
    (async () => {
      if (!product.ProductID) {
        setModels([]);
        return;
      }
      setLoading(true);
      try {
        const mdls = await productService.getModelsByProduct(product.ProductID);
        setModels(mdls);
      } catch (err) {
        setError(err.message || 'Failed to load models');
      } finally {
        setLoading(false);
      }
    })();
  }, [product.ProductID]);

  /**
   * Update single product field value
   * 
   * @param {string} field - Field name to update
   * @param {*} value - New field value
   */
  const updateProduct = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Set product group with automatic cascade reset
   * Resets ProductID and ModelID to empty when group changes
   * 
   * @param {string|number} groupId - Product group ID to select
   */
  const setProductGroup = (groupId) => {
    setProduct((prev) => ({
      ...prev,
      ProductGroup: groupId,
      ProductID: '',
      ModelID: '',
    }));
  };

  /**
   * Set product with automatic cascade reset
   * Resets ModelID to empty when product changes
   * 
   * @param {string|number} productId - Product ID to select
   * @param {string} [productName=''] - Product name for display
   */
  const setProductId = (productId, productName = '') => {
    setProduct((prev) => ({
      ...prev,
      ProductID: productId,
      ProductName: productName,
      ModelID: '',
    }));
  };

  /**
   * Set product model
   * 
   * @param {string|number} modelId - Model ID to select
   * @param {string} [modelDescription=''] - Model description for display
   */
  const setModelId = (modelId, modelDescription = '') => {
    setProduct((prev) => ({
      ...prev,
      ModelID: modelId,
      ModelDescription: modelDescription,
    }));
  };

  /**
   * Reset product form to initial state
   */
  const resetProduct = () => {
    setProduct(initialState);
    setError(null);
  };

  /**
   * Submit product registration
   * Validates and submits product data to service
   * 
   * @async
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const submitProduct = async () => {
    try {
      const payload = {
        ...product,
        PreviousCalls: parseInt(product.PreviousCalls) || 0,
        PurchaseDate: product.PurchaseDate || null,
      };

      const result = await productService.registerProduct(payload);
      if (result.success) {
        setProduct(initialState);
        setError(null);
      } else {
        setError(result.error || 'Failed to register product');
      }
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Product registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  
  return {
    product,
    updateProduct,
    setProductGroup,
    setProductId,
    setModelId,
    submitProduct,
    resetProduct,
    productGroups,
    products,
    models,
    loading,
    error,
  };
};
