import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const LogisticsDocuments = sequelize.define(
    'LogisticsDocuments',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      external_system: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'external_system',
      },
      document_type: {
        type: DataTypes.ENUM('SO', 'DN', 'CHALLAN'),
        allowNull: false,
        field: 'document_type',
      },
      external_doc_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'external_doc_type',
      },
      document_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'document_number',
      },
      reference_doc_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'reference_doc_number',
      },
      reference_type: {
        type: DataTypes.ENUM('SPARE_REQUEST', 'STOCK_MOVEMENT', 'CLAIM', 'REPLACEMENT'),
        allowNull: true,
        field: 'reference_type',
      },
      reference_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'reference_id',
      },
      from_entity_type: {
        type: DataTypes.ENUM('warehouse', 'branch', 'service_center', 'technician', 'supplier'),
        allowNull: true,
        field: 'from_entity_type',
      },
      from_entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'from_entity_id',
      },
      to_entity_type: {
        type: DataTypes.ENUM('warehouse', 'branch', 'service_center', 'technician', 'customer', 'supplier'),
        allowNull: true,
        field: 'to_entity_type',
      },
      to_entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'to_entity_id',
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: 'amount',
      },
      status: {
        type: DataTypes.ENUM('Created', 'Posted', 'Cancelled', 'Completed'),
        defaultValue: 'Created',
        field: 'status',
      },
      document_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'document_date',
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
      tableName: 'logistics_documents',
      timestamps: false,
    }
  );

  return LogisticsDocuments;
};
