import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Plant = sequelize.define(
    'Plant',
    {
      plant_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'plant_id',
      },
      zone_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'zone_id',
        references: {
          model: 'zones',
          key: 'zone_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      plant_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'plant_code',
      },
      gst_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'gst_number',
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
      user_id: {
  type: DataTypes.INTEGER,
  allowNull: true,
  field: 'user_id',
  references: {
    model: 'users',
    key: 'user_id',
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
      tableName: 'plants',
      timestamps: false,
    }
  );
  

  return Plant;
};
