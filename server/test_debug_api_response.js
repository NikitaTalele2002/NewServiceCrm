/**
 * Debug the actual API response to see what's happening
 */

import jwt from 'jsonwebtoken';
import sql from 'mssql';

const JWT_SECRET = 'supersecret_jwt_key_change_me';
const BASE_URL = 'http://localhost:5000';

function generateToken(userRole = 'admin', ascId = 4) {
  const payload = {
    id: 1,
    username: userRole === 'service_center' ? 'test_asc_user' : 'test_admin',
    role: userRole,
    centerId: ascId,
    service_center_id: ascId
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const dbConfig = {
  server: 'localhost',
  user: 'crm_user',
  password: 'StrongPassword123!',
  database: 'ServiceCrm',
  options: {
    instanceName: 'SQLEXPRESS',
    encrypt: false,
    trustServerCertificate: true,
    enableKeepAlive: true,
  }
};

async function testAPI() {
  const requestId = 24;
  const ascId = 4;
  const spareId = 0;
  const transferQty = 2;

  // Get DN document
  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();

  const docResult = await pool.request().query(
    `SELECT document_number FROM logistics_documents 
     WHERE document_type = 'DN' AND reference_id = ${requestId} AND reference_type = 'SPARE_REQUEST'`
  );

  const dnNumber = docResult.recordset[0].document_number;
  await pool.close();

  console.log('📤 Sending API Request with full details:\n');
  
  const token = generateToken('service_center', ascId);
  console.log('Token payload:');
  console.log('  id: 1');
  console.log('  role: service_center');
  console.log('  centerId: ' + ascId);
  console.log('  service_center_id: ' + ascId);
  console.log('\nRequest body:');
  
  const requestBody = {
    requestId: requestId,
    documentType: 'DN',
    documentNumber: dnNumber,
    items: [{
      spare_id: spareId,
      qty: transferQty,
      carton_number: `CTN-DEBUG-${Date.now()}`,
      condition: 'good'
    }]
  };
  
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('\n---\n');

  try {
    console.log('⏳ Calling /api/logistics/receive-delivery...\n');
    const response = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`Response Status: ${response.status}`);
    console.log(`Response Headers:`, {
      'content-type': response.headers.get('content-type'),
      'content-length': response.headers.get('content-length')
    });
    
    const data = await response.json();
    console.log('\nFull API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n\nExtracted Fields:');
    console.log('data.ok:', data.ok);
    console.log('data.data:', typeof data.data);
    if (data.data) {
      console.log('data.data keys:', Object.keys(data.data));
      console.log('data.data.inventory:', data.data.inventory);
      console.log('data.data.movement:', data.data.movement ? 'EXISTS' : 'MISSING');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testAPI();
