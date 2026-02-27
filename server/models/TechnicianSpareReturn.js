import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const TechnicianSpareReturn = sequelize.define(
    'TechnicianSpareReturn',
    {
      return_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'return_id',
      },
      call_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'call_id',
        comment: 'Optional call ID if return is associated with a specific call',
      },
      technician_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'technician_id',
        references: {
          model: 'technicians',
          key: 'technician_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      service_center_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'service_center_id',
        references: {
          model: 'service_centers',
          key: 'asc_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      return_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'return_number',
        comment: 'Unique return request number (e.g., TSR-20260225-001)',
      },
      return_status: {
        type: DataTypes.ENUM(
          'draft',          // Initial state - can be modified
          'submitted',      // Submitted by technician - awaiting SC review
          'received',       // Received at service center
          'verified',       // Verified and inventoried
          'cancelled'       // Cancelled by technician or SC
        ),
        defaultValue: 'draft',
        field: 'return_status',
      },
      return_date: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'return_date',
        comment: 'Date when spare parts are scheduled to be returned',
      },
      received_date: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'received_date',
        comment: 'Date when return was received at service center',
      },
      verified_date: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'verified_date',
        comment: 'Date when return was verified and inventoried',
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'remarks',
        comment: 'Additional remarks from technician',
      },
      received_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'received_remarks',
        comment: 'Remarks from service center on receiving',
      },
      verified_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'verified_remarks',
        comment: 'Remarks from service center on verification',
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'created_by',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      },
      received_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'received_by',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      },
      verified_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'verified_by',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
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
      tableName: 'technician_spare_returns',
      timestamps: false,
      freezeTableName: true,
      underscored: true,
      paranoid: false,
    }
  );

  return TechnicianSpareReturn;
};
