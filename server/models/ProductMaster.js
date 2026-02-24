// models/productMaster.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const ProductMaster = sequelize.define(
    "ProductMaster",
    {
      ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "ID",
      },
      VALUE: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: "VALUE",
      },
      DESCRIPTION: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "DESCRIPTION",
      },
      ProductGroupID: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "Product_group_ID",
        references: {
          model: 'ProductGroups',
          key: 'Id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },

      CreatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
        field: "CreatedAt",
      },

      UpdatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
        field: "UpdatedAt",
      },
    },
    {
      tableName: "ProductMaster", // **note** separate table name to avoid conflict with Products
      timestamps: false,
      underscored: false,
    }
  );

  return ProductMaster;
};

