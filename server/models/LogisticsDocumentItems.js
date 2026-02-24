import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const LogisticsDocumentItems = sequelize.define(
    'LogisticsDocumentItems',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      document_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'document_id',
        references: {
          model: 'logistics_documents',
          key: 'id',
        },
      },
      spare_part_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'spare_part_id',
        references: {
          model: 'spare_parts',
          key: 'Id',
        },
      },
      qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'qty',
      },
      uom: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'uom',
        comment: 'Unit of Measure (e.g., PCS, KG, BOX)',
      },
      hsn: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'hsn',
        comment: 'Harmonized System Nomenclature code',
      },
    },
    {
      tableName: 'logistics_document_items',
      timestamps: false,
    }
  );

  return LogisticsDocumentItems;
};
