/**
 * Script to create sample attachment records in the database
 * Usage: node add_sample_attachments.js
 */

import { sequelize, connectDB } from './db.js';

const createSampleAttachments = async () => {
  const conn = sequelize;

  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');

    // Use raw query to get the most recent call
    console.log('\n📋 Searching for recent calls...');
    const [calls] = await conn.query(
      `SELECT TOP 1 [call_id] FROM [calls] ORDER BY [created_at] DESC`
    );

    if (!calls || calls.length === 0) {
      console.log('⚠️  No calls found in database. Please create a call first.');
      console.log('    Navigate to Call Update, create a new call, and try again.');
      process.exit(0);
    }

    const callId = calls[0].call_id;
    console.log(`✅ Found call ID: ${callId}`);

    console.log(`\n📋 Creating sample attachments for Call ID: ${callId}`);

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

    // Insert attachments using raw SQL
    for (const attachment of sampleAttachments) {
      await conn.query(
        `INSERT INTO [attachments] 
         ([entity_type], [entity_id], [file_url], [file_type], [file_name], [file_category], [file_size], [remarks], [uploaded_at], [created_at], [updated_at])
         VALUES (:entity_type, :entity_id, :file_url, :file_type, :file_name, :file_category, :file_size, :remarks, GETDATE(), GETDATE(), GETDATE())`,
        {
          replacements: attachment,
          type: 'INSERT'
        }
      );
    }

    console.log(`\n✅ Successfully created ${sampleAttachments.length} sample attachments:`);
    sampleAttachments.forEach(att => {
      console.log(`   📄 ${att.file_name} (${att.file_category})`);
    });

    console.log(`\n📝 These attachments are linked to Call ID: ${callId}`);
    console.log('💡 When viewing this call in the frontend, you will now see sample attachments.');
    console.log('📲 In production, technician app will upload real images/documents here.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sample attachments:');
    console.error('   ', error.message);
    if (error.sql) {
      console.error('\n📌 SQL Query:', error.sql);
    }
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Make sure you have created at least one call in the database');
    console.error('   2. Check if the calls table exists and has data');
    console.error('   3. Verify database connection is working');
    process.exit(1);
  }
};

createSampleAttachments();
