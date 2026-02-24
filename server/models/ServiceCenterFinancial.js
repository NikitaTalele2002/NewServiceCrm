import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ServiceCenterFinancial = sequelize.define(
    'ServiceCenterFinancial',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      asc_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: 'asc_id',
        // FK removed - added via ALTER TABLE
      },
      security_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'security_amount',
      },
      credit_limit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: 'credit_limit',
      },
      current_outstanding: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'current_outstanding',
      },
      last_updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'last_updated_at',
      },
      last_updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'last_updated_by',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
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
      tableName: 'service_center_financial',
      timestamps: false,
    }
  );

  return ServiceCenterFinancial;
};
