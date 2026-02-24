import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const SAPDocuments = sequelize.define(
    'SAPDocuments',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      sap_doc_type: {
        type: DataTypes.ENUM('CN', 'DN', 'INVOICE', 'TAX_INVOICE'),
        allowNull: false,
        field: 'sap_doc_type',
      },
      sap_doc_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'sap_doc_number',
      },
      module_type: {
        type: DataTypes.ENUM('spare_request', 'stock_movement', 'claim', 'replacement'),
        allowNull: false,
        field: 'module_type',
      },
      reference_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'reference_id',
      },
      asc_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'asc_id',
        references: {
          model: 'service_centers',
          key: 'asc_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: 'amount',
      },
      status: {
        type: DataTypes.ENUM('Created', 'Cancelled', 'Posted', 'Reversed'),
        defaultValue: 'Created',
        field: 'status',
      },
      sap_created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'sap_created_at',
      },
      synced_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'synced_at',
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
      tableName: 'sap_documents',
      timestamps: false,
    }
  );

  return SAPDocuments;
};
