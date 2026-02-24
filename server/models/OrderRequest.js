import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const OrderRequest = sequelize.define(
    'OrderRequest',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      request_id: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        field: 'request_id',
        comment: 'Unique request identifier (REQ-XXXX-timestamp)',
      },
      service_center_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'service_center_id',
        references: {
          model: 'service_centers',
          key: 'asc_id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      },
      product_group_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'product_group_id',
        references: {
          model: 'ProductGroups',
          key: 'Id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      },
      product_master_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'product_master_id',
        references: {
          model: 'ProductMasters',
          key: 'ID',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      },
      product_model_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'product_model_id',
        references: {
          model: 'ProductModels',
          key: 'Id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      },
      spare_part_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'spare_part_id',
        references: {
          model: 'SpareParts',
          key: 'Id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'quantity',
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        field: 'status',
      },
      order_type: {
        type: DataTypes.STRING,
        defaultValue: 'MSL',
        field: 'order_type',
        comment: 'Order type: MSL, Bulk, Emergency, etc.',
      },
      requested_by_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'requested_by_id',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      approved_by_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'approved_by_id',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'remarks',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW,
        field: 'updated_at',
      },
    },
    {
      tableName: 'order_requests',
      timestamps: false,
      freezeTableName: true,
    }
  );

  return OrderRequest;
};
