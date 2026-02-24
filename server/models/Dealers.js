import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Dealers = sequelize.define(
    "Dealers",
    {
      dealers_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "dealers_id",
      },
      dealers_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        field: "dealers_name",
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        field: "email",
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: "phone_number",
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "address",
      },
      state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "state_id",
        references: {
          model: 'States',
          key: 'Id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      city_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "city_id",
        references: {
          model: 'Cities',
          key: 'Id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      pincode_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "pincode_id",
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
        field: "created_at",
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
      },
    },
    {
      tableName: "dealers",
      timestamps: false,
    }
  );

  return Dealers;
};
