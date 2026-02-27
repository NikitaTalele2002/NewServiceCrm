import { Attachments } from '../models/index.js';

/**
 * Get all attachments for a specific entity (Complaint/Call)
 * GET /api/attachments/:entityType/:entityId
 */
export const getAttachmentsByEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    console.log(`[Attachments] Fetching attachments for ${entityType}:${entityId}`);

    const attachments = await Attachments.findAll({
      where: {
        entity_type: entityType,
        entity_id: entityId,
        is_deleted: false
      },
      attributes: [
        'attachment_id',
        'entity_type',
        'entity_id',
        'file_url',
        'file_type',
        'file_name',
        'file_category',
        'file_size',
        'uploaded_at',
        'remarks'
      ],
      order: [['uploaded_at', 'DESC']]
    });

    console.log(`[Attachments] Found ${attachments.length} attachments`);

    res.status(200).json({
      success: true,
      count: attachments.length,
      attachments: attachments.map(att => ({
        id: att.attachment_id,
        entityType: att.entity_type,
        entityId: att.entity_id,
        fileUrl: att.file_url,
        fileType: att.file_type,
        fileName: att.file_name,
        category: att.file_category,
        fileSize: att.file_size,
        uploadedAt: att.uploaded_at,
        remarks: att.remarks
      }))
    });
  } catch (error) {
    console.error('[Attachments] Error fetching attachments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attachments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a single attachment by ID
 * GET /api/attachments/:attachmentId
 */
export const getAttachmentById = async (req, res) => {
  try {
    const { attachmentId } = req.params;

    const attachment = await Attachments.findByPk(attachmentId, {
      attributes: [
        'attachment_id',
        'entity_type',
        'entity_id',
        'file_url',
        'file_type',
        'file_name',
        'file_category',
        'file_size',
        'uploaded_at',
        'remarks'
      ]
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found'
      });
    }

    res.status(200).json({
      success: true,
      attachment: {
        id: attachment.attachment_id,
        entityType: attachment.entity_type,
        entityId: attachment.entity_id,
        fileUrl: attachment.file_url,
        fileType: attachment.file_type,
        fileName: attachment.file_name,
        category: attachment.file_category,
        fileSize: attachment.file_size,
        uploadedAt: attachment.uploaded_at,
        remarks: attachment.remarks
      }
    });
  } catch (error) {
    console.error('[Attachments] Error fetching attachment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attachment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create sample attachments (for testing/demo purposes)
 * This will populate the database with sample attachment records
 * POST /api/attachments/demo/create-sample
 */
export const createSampleAttachments = async (req, res) => {
  try {
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({
        success: false,
        error: 'callId is required'
      });
    }

    // Sample attachment data
    const sampleAttachments = [
      {
        entity_type: 'call',
        entity_id: callId,
        file_url: '/uploads/sample/invoice_001.txt',
        file_type: 'txt',
        file_name: 'Invoice_001.txt',
        file_category: 'invoice',
        file_size: 524288,
        remarks: 'Service invoice for complaint registration'
      },
      {
        entity_type: 'call',
        entity_id: callId,
        file_url: '/uploads/sample/technician_photo_001.svg',
        file_type: 'svg',
        file_name: 'Technician_Photo_001.svg',
        file_category: 'image',
        file_size: 2097152,
        remarks: 'Technician visit photo - before repair'
      },
      {
        entity_type: 'call',
        entity_id: callId,
        file_url: '/uploads/sample/warranty_document.txt',
        file_type: 'txt',
        file_name: 'Warranty_Document.txt',
        file_category: 'warranty',
        file_size: 1048576,
        remarks: 'Original warranty document'
      },
      {
        entity_type: 'call',
        entity_id: callId,
        file_url: '/uploads/sample/repair_receipt.svg',
        file_type: 'svg',
        file_name: 'Repair_Receipt.svg',
        file_category: 'receipt',
        file_size: 1572864,
        remarks: 'Repair completion receipt'
      },
      {
        entity_type: 'call',
        entity_id: callId,
        file_url: '/uploads/sample/service_report.txt',
        file_type: 'txt',
        file_name: 'Service_Report.txt',
        file_category: 'document',
        file_size: 800000,
        remarks: 'Detailed service report'
      }
    ];

    const created = await Attachments.bulkCreate(sampleAttachments);

    res.status(201).json({
      success: true,
      message: `Created ${created.length} sample attachments for call ${callId}`,
      attachments: created.map(att => ({
        id: att.attachment_id,
        fileName: att.file_name,
        category: att.file_category
      }))
    });
  } catch (error) {
    console.error('[Attachments] Error creating sample attachments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create sample attachments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
