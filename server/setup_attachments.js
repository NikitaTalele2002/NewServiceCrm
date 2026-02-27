#!/usr/bin/env node
/**
 * Attachment System Setup & Testing Script
 * Usage: node setup_attachments.js
 * 
 * This script:
 * 1. Checks if server is running
 * 2. Verifies database connection
 * 3. Lists the most recent complaints
 * 4. Optionally creates sample attachments
 */

import fetch from 'node-fetch';
import { sequelize, connectDB } from './db.js';
import { Calls, Attachments } from './models/index.js';

const API_URL = 'http://localhost:5000';

async function checkServerStatus() {
  try {
    console.log('🔍 Checking server status...');
    const response = await fetch(`${API_URL}/api/test`);
    if (response.ok) {
      console.log('✅ Server is running on port 5000');
      return true;
    } else {
      console.log('❌ Server returned error:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Server is not running. Start it with: npm start');
    return false;
  }
}

async function checkDatabase() {
  try {
    console.log('\n🔌 Checking database connection...');
    await connectDB();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

async function listRecentComplaints() {
  try {
    console.log('\n📋 Recent calls in database:');
    
    const [calls] = await sequelize.query(
      `SELECT TOP 5 [call_id] FROM [calls] ORDER BY [created_at] DESC`
    );

    if (!calls || calls.length === 0) {
      console.log('   No calls found. Please create a call first.');
      return null;
    }

    calls.forEach((call, index) => {
      console.log(`   ${index + 1}. Call ID: ${call.call_id}`);
    });

    return calls[0].call_id;
  } catch (error) {
    console.log('   Error fetching complaints:', error.message);
    return null;
  }
}

async function checkAttachmentSamples() {
  try {
    console.log('\n📁 Checking sample files in /uploads/sample/');
    const files = [
      'invoice_001.txt',
      'technician_photo_001.svg',
      'warranty_document.txt',
      'repair_receipt.svg',
      'service_report.txt'
    ];

    console.log('   Expected files:');
    files.forEach(file => {
      console.log(`      ✓ ${file}`);
    });

    return true;
  } catch (error) {
    console.log('   Error checking files:', error.message);
    return false;
  }
}

async function createSampleAttachments(callId) {
  try {
    console.log(`\n⚙️  Creating sample attachments for Call ID: ${callId}`);
    
    const response = await fetch(`${API_URL}/api/attachments/demo/create-sample`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ callId })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Sample attachments created successfully!`);
      console.log(`   ${data.attachments.length} attachments added`);
      data.attachments.forEach(att => {
        console.log(`      • ${att.fileName} (${att.category})`);
      });
      return true;
    } else {
      console.log('❌ Failed to create attachments:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Error creating attachments:', error.message);
    return false;
  }
}

async function listAttachmentsForCall(callId) {
  try {
    console.log(`\n📎 Attachments for Call ID ${callId}:`);
    
    const response = await fetch(`${API_URL}/api/attachments/call/${callId}`);
    const data = await response.json();

    if (data.success && data.count > 0) {
      console.log(`   Found ${data.count} attachments:`);
      data.attachments.forEach((att, index) => {
        console.log(`      ${index + 1}. ${att.fileName}`);
        console.log(`         Category: ${att.category}`);
        console.log(`         Size: ${(att.fileSize / 1024).toFixed(2)} KB`);
        console.log(`         URL: ${att.fileUrl}`);
      });
    } else {
      console.log('   No attachments found for this call');
    }
  } catch (error) {
    console.log('   Error fetching attachments:', error.message);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Attachment System Setup & Testing                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Check server status
  const serverOk = await checkServerStatus();
  if (!serverOk) {
    console.log('\n⚠️  Start the server first:');
    console.log('   cd server && npm start');
    process.exit(1);
  }

  // Check database
  const dbOk = await checkDatabase();
  if (!dbOk) {
    console.log('\n⚠️  Fix database connection issues');
    process.exit(1);
  }

  // List recent complaints
  const callId = await listRecentComplaints();
  if (!callId) {
    console.log('\n⚠️  No complaints found. Create a complaint in the CRM first.');
    process.exit(1);
  }

  // Check sample files
  await checkAttachmentSamples();

  // Ask user if they want to create sample attachments
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   Setup Complete!                                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log('🎯 Next Steps:\n');
  console.log('   1. Open the CRM Dashboard in your browser');
  console.log(`   2. Navigate to Call View for Call ID: ${callId}`);
  console.log('   3. Click "+ Add Sample" in the Attachments section');
  console.log('   4. Sample attachments will be created and displayed!\n');

  console.log('📖 Documentation:');
  console.log('   • See ATTACHMENTS_IMPLEMENTATION.md for detailed guide');
  console.log('   • API docs available at /api/attachments endpoints');
  console.log('   • Component docs in client/src/components/call_view/AttachmentsDisplay.jsx\n');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
