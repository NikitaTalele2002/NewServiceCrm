import { Sequelize, DataTypes } from 'sequelize';
import { sequelize } from './db.js';
import SpareRequestFactory from './models/SpareRequest.js';
import BranchFactory from './models/Branch.js';
import ServiceCentreFactory from './models/ServiceCentre.js';
import SpareRequestItemFactory from './models/SpareRequestItem.js';

const SpareRequest = SpareRequestFactory(sequelize);
const Branch = BranchFactory(sequelize);
const ServiceCentre = ServiceCentreFactory(sequelize, DataTypes);
const SpareRequestItem = SpareRequestItemFactory(sequelize);

// Define associations
SpareRequest.belongsTo(Branch, { foreignKey: 'BranchId', as: 'Branch' });
SpareRequest.belongsTo(ServiceCentre, { foreignKey: 'ServiceCenterId', as: 'ServiceCentre' });
SpareRequest.hasMany(SpareRequestItem, { foreignKey: 'RequestId', as: 'Items' });
SpareRequestItem.belongsTo(SpareRequest, { foreignKey: 'RequestId', as: 'Request' });

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const requests = await SpareRequest.findAll({
      where: { Id: [87, 88] },
      include: [
        { model: Branch, as: 'Branch' },
        { model: ServiceCentre, as: 'ServiceCentre' },
        { model: SpareRequestItem, as: 'Items' }
      ],
    });

    console.log('Request:', JSON.stringify(requests[0], null, 2));

    // Also check raw query
    const raw = await sequelize.query(`
      SELECT sr.*, b.BranchName, sc.CenterName, sri.Sku
      FROM SpareRequests sr
      LEFT JOIN Branches b ON sr.BranchId = b.Id
      LEFT JOIN ServiceCenters sc ON sr.ServiceCenterId = sc.Id
      LEFT JOIN SpareRequestItems sri ON sr.Id = sri.RequestId
      WHERE sr.Id = ${requests[0].Id}
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('Raw:', raw);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
})();