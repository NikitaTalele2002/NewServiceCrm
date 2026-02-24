import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const SAPDocumentItems = sequelize.define(
    'SAPDocumentItems',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      sap_doc_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'sap_doc_id',
        references: {
          model: 'sap_documents',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      spare_part_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'spare_part_id',
        references: {
          model: 'spare_parts',
          key: 'Id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      },
      qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'qty',
      },
      unit_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'unit_price',
      },
      gst: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'gst',
      },
      hsn: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'hsn',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      },
    },
    {
      tableName: 'sap_document_items',
      timestamps: false,
    }
  );

  return SAPDocumentItems;
};
