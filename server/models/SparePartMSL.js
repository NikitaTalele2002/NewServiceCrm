/**
 * SparePartMSL Model
 * Defines Minimum and Maximum Stock Levels for spare parts by city tier
 * Allows different MSL values for different geographic tiers (T1, T2, T3)
 */

export default (sequelize, DataTypes) => {
  const SparePartMSL = sequelize.define(
    'SparePartMSL',
    {
      msl_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      spare_part_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      city_tier_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      minimum_stock_level_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Minimum stock level for this spare part in this city tier'
      },
      maximum_stock_level_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Maximum stock level for this spare part in this city tier'
      },
      effective_from: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When this MSL becomes effective'
      },
      effective_to: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When this MSL expires (if null, still active)'
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this MSL configuration is currently active'
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW
      }
    },
    {
      tableName: 'spare_part_msl',
      timestamps: false,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          unique: true,
          fields: ['spare_part_id', 'city_tier_id'],
          name: 'UQ_spare_part_city_tier'
        },
        {
          fields: ['is_active'],
          name: 'idx_msl_active'
        }
      ]
    }
  );

  // Define associations
  SparePartMSL.associate = (models) => {
    if (models.SparePart) {
      SparePartMSL.belongsTo(models.SparePart, {
        foreignKey: 'spare_part_id',
        as: 'sparePart',
        constraints: false
      });
    }
    if (models.CityTierMaster) {
      SparePartMSL.belongsTo(models.CityTierMaster, {
        foreignKey: 'city_tier_id',
        as: 'cityTier',
        constraints: false
      });
    }
    if (models.Users) {
      SparePartMSL.belongsTo(models.Users, {
        foreignKey: 'created_by',
        as: 'creator',
        constraints: false
      });
    }
  };

  return SparePartMSL;
};
