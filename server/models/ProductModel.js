// models/ProductModel.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const ProductModel = sequelize.define(
    "ProductModel",
    {
      Id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        startingValue: 1,
        field: "Id",
      },

      BRAND: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: "BRAND",
      },

      MODEL_CODE: {
        type: DataTypes.STRING(200),
        allowNull: false,
        unique: true,
        field: "MODEL_CODE",
      },

      MODEL_DESCRIPTION: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "MODEL_DESCRIPTION",
      },

      PRICE: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
        field: "PRICE",
      },

      SERIALIZED_FLAG: {
        type: DataTypes.STRING(10),
        allowNull: true,
        field: "SERIALIZED_FLAG",
      },

      WARRANTY_IN_MONTHS: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "WARRANTY_IN_MONTHS",
      },

      VALID_FROM: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "VALID_FROM",
      },

      ProductID: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "ProductID",
        references: {
          model: "ProductMaster",
          key: "ID",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
    },
    {
      tableName: "ProductModels",
      timestamps: false,
    }
  );

  return ProductModel;
};
