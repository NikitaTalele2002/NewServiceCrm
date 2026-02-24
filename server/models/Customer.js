import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Customer = sequelize.define(
    'Customer',
    {
      customer_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'customer_id',
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        field: 'name',
      },
      mobile_no: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        field: 'mobile_no',
      },
      alt_mob_no: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'alt_mob_no',
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        field: 'email',
      },
      house_no: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'house_no',
      },
      street_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'street_name',
      },
      building_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'building_name',
      },
      area: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'area',
      },
      landmark: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'landmark',
      },
      city_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'city_id',
        // FK removed - added via ALTER TABLE
      },
      state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'state_id',
        // FK removed - added via ALTER TABLE
      },
      pincode: {
        type: DataTypes.STRING(10),
        allowNull: true,
        field: 'pincode',
        // FK removed - added via ALTER TABLE
      },
      customer_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
        field: 'customer_code',
      },
      customer_priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'vip'),
        defaultValue: 'medium',
        field: 'customer_priority',
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'created_by',
        // FK removed - added via ALTER TABLE
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
      tableName: 'customers',
      timestamps: false,
    }
  );

  return Customer;
};
