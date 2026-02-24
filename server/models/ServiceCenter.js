import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ServiceCenter = sequelize.define(
    'ServiceCenter',
    {
      asc_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'asc_id',
      },
      plant_id: {
  type: DataTypes.INTEGER,
  allowNull: true,
  field: 'plant_id',
  references: {
    model: 'plants',
    key: 'plant_id',
  },
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
},
      user_id: {
  type: DataTypes.INTEGER,
  allowNull: false,
  unique: true,
  field: 'user_id',
  references: {
    model: 'users',
    key: 'user_id',
  },
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
},

      asc_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: 'asc_name',
      },
      asc_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        field: 'asc_code',
      },
      owner_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'owner_name',
      },
      contact_person: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'contact_person',
      },
      mobile_no: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'mobile_no',
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'email',
      },
      address_line1: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'address_line1',
      },
      address_line2: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'address_line2',
      },
      area: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'area',
      },
      city_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'city_id',
        references: {
          model: 'Cities',
          key: 'Id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'state_id',
        references: {
          model: 'States',
          key: 'Id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      pincode_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'pincode_id',
        references: {
          model: 'Pincodes',
          key: 'Id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      pan_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'pan_number',
      },
      gst_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'gst_number',
      },
      asc_status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended', 'closed'),
        defaultValue: 'active',
        field: 'asc_status',
      },
      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'approved_by',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'approved_at',
      },
      asc_blacklisted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'asc_blacklisted',
      },
      blacklisted_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'blacklisted_reason',
      },
      sap_sync_status: {
        type: DataTypes.ENUM('pending', 'synced', 'failed', 'partial'),
        defaultValue: 'pending',
        field: 'sap_sync_status',
      },
      sap_sync_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'sap_sync_at',
      },
      sap_error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'sap_error_message',
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
      tableName: 'service_centers',
      timestamps: false,
    }
  );

  return ServiceCenter;
};
