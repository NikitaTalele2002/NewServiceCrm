/**
 * Routes for Product Hierarchy: ProductGroup → ProductMaster → ProductModel → SparePart
 */

import express from 'express';
import { ProductGroup, ProductMaster, ProductModel, SparePart } from '../models/index.js';

const router = express.Router();

/**
 * GET /api/products/hierarchy
 * Get complete product hierarchy with ProductGroups, ProductMasters, and ProductModels
 * SpareParts are fetched separately to avoid timeout with large datasets
 * @returns {Array} List of ProductGroups with nested ProductMasters and ProductModels
 */
router.get('/hierarchy', async (req, res) => {
  try {
    const hierarchy = await ProductGroup.findAll({
      include: [
        {
          model: ProductMaster,
          as: 'productMasters',
          include: [
            {
              model: ProductModel,
              as: 'productModels',
              attributes: ['Id', 'MODEL_CODE', 'MODEL_DESCRIPTION', 'BRAND', 'PRICE', 'WARRANTY_IN_MONTHS']
            }
          ],
          attributes: ['ID', 'VALUE', 'DESCRIPTION']
        }
      ],
      attributes: ['Id', 'VALUE', 'DESCRIPTION']
    });

    res.json(hierarchy);
  } catch (err) {
    console.error('Error fetching product hierarchy:', err);
    res.status(500).json({ error: 'Failed to fetch product hierarchy', message: err.message });
  }
});

/**
 * GET /api/products/by-group/:groupId
 * Get all ProductMasters for a specific ProductGroup
 * @param {number} groupId - ProductGroup Id
 */
router.get('/by-group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await ProductGroup.findByPk(groupId, {
      include: [
        {
          model: ProductMaster,
          as: 'productMasters',
          attributes: ['ID', 'VALUE', 'DESCRIPTION']
        }
      ]
    });

    if (!group) {
      return res.status(404).json({ error: 'ProductGroup not found' });
    }

    res.json(group);
  } catch (err) {
    console.error('Error fetching ProductMasters by group:', err);
    res.status(500).json({ error: 'Failed to fetch ProductMasters', message: err.message });
  }
});

/**
 * GET /api/products/masters/:masterId/models
 * Get all ProductModels for a specific ProductMaster
 * @param {number} masterId - ProductMaster ID
 */
router.get('/masters/:masterId/models', async (req, res) => {
  try {
    const { masterId } = req.params;

    const master = await ProductMaster.findByPk(masterId, {
      include: [
        {
          model: ProductModel,
          as: 'productModels',
          attributes: ['Id', 'MODEL_CODE', 'MODEL_DESCRIPTION', 'BRAND', 'PRICE', 'WARRANTY_IN_MONTHS']
        }
      ]
    });

    if (!master) {
      return res.status(404).json({ error: 'ProductMaster not found' });
    }

    res.json(master);
  } catch (err) {
    console.error('Error fetching ProductModels by master:', err);
    res.status(500).json({ error: 'Failed to fetch ProductModels', message: err.message });
  }
});

/**
 * GET /api/products/models/:modelId/spares
 * Get all SpareParts for a specific ProductModel
 * @param {number} modelId - ProductModel Id
 */
router.get('/models/:modelId/spares', async (req, res) => {
  try {
    const { modelId } = req.params;

    const model = await ProductModel.findByPk(modelId, {
      include: [
        {
          model: SparePart,
          as: 'spareParts',
          attributes: ['Id', 'PART', 'DESCRIPTION', 'BRAND', 'MODEL_DESCRIPTION', 'MAX_USED_QTY', 'SERVICE_LEVEL', 'STATUS']
        }
      ]
    });

    if (!model) {
      return res.status(404).json({ error: 'ProductModel not found' });
    }

    // Return the spares array directly
    res.json(model.spareParts || []);
  } catch (err) {
    console.error('Error fetching SpareParts by model:', err);
    res.status(500).json({ error: 'Failed to fetch SpareParts', message: err.message });
  }
});

/**
 * GET /api/products/hierarchy/cascade
 * Get complete cascading hierarchy: GroupId → MasterId → ModelId → PartId
 * Query params: ?groupId=1&masterId=1&modelId=1
 */
router.get('/hierarchy/cascade', async (req, res) => {
  try {
    const { groupId, masterId, modelId } = req.query;

    let query = ProductGroup.findAll({
      include: [
        {
          model: ProductMaster,
          as: 'productMasters',
          required: false,
          include: [
            {
              model: ProductModel,
              as: 'productModels',
              required: false,
              include: [
                {
                  model: SparePart,
                  as: 'spareParts',
                  required: false,
                  attributes: ['Id', 'PART', 'BRAND', 'MODEL_DESCRIPTION', 'MAX_USED_QTY', 'STATUS']
                }
              ],
              attributes: ['Id', 'MODEL_CODE', 'MODEL_DESCRIPTION', 'BRAND', 'PRICE']
            }
          ],
          attributes: ['ID', 'VALUE', 'DESCRIPTION']
        }
      ],
      attributes: ['Id', 'VALUE', 'DESCRIPTION']
    });

    // Apply filters if provided
    if (groupId) {
      query = await ProductGroup.findByPk(groupId, {
        include: [
          {
            model: ProductMaster,
            as: 'productMasters',
            include: [
              {
                model: ProductModel,
                as: 'productModels',
                include: [
                  {
                    model: SparePart,
                    as: 'spareParts',
                    attributes: ['Id', 'PART', 'BRAND', 'MODEL_DESCRIPTION', 'MAX_USED_QTY', 'STATUS']
                  }
                ],
                attributes: ['Id', 'MODEL_CODE', 'MODEL_DESCRIPTION', 'BRAND', 'PRICE']
              }
            ],
            attributes: ['ID', 'VALUE', 'DESCRIPTION']
          }
        ]
      });

      if (!query) {
        return res.status(404).json({ error: 'ProductGroup not found' });
      }

      // Filter by masterId if provided
      if (masterId && query.productMasters) {
        query.productMasters = query.productMasters.filter(pm => pm.ID === parseInt(masterId));

        // Filter by modelId if provided
        if (modelId && query.productMasters.length > 0) {
          query.productMasters.forEach(pm => {
            pm.productModels = pm.productModels.filter(pmod => pmod.Id === parseInt(modelId));
          });
        }
      }

      return res.json(query);
    }

    const result = await query;
    res.json(result);
  } catch (err) {
    console.error('Error fetching cascading hierarchy:', err);
    res.status(500).json({ error: 'Failed to fetch hierarchy', message: err.message });
  }
});

export default router;
