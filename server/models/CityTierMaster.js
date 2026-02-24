/**
 * CityTierMaster Model
 * Defines city tier levels (T1, T2, T3) for location classification
 */

export default (sequelize, DataTypes) => {
  const CityTierMaster = sequelize.define(
    'CityTierMaster',
    {
      city_tier_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      tier_code: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true,
        comment: 'T1, T2, T3'
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Tier 1 - Metropolitan, Tier 2 - Major, Tier 3 - Secondary'
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
      tableName: 'city_tier_master',
      timestamps: false,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );

  // Define associations
  CityTierMaster.associate = (models) => {
    if (models.SparePartMSL) {
      CityTierMaster.hasMany(models.SparePartMSL, {
        foreignKey: 'city_tier_id',
        as: 'mslConfigurations',
        constraints: false
      });
    }
    if (models.City) {
      CityTierMaster.hasMany(models.City, {
        foreignKey: 'city_tier_id',
        as: 'cities',
        constraints: false
      });
    }
  };

  return CityTierMaster;
};
