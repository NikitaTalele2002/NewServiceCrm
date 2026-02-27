/**
 * SERVER STATUS CHECK & STARTUP
 */

import axios from 'axios';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function checkServerAndStart() {
  console.log('\n' + '='.repeat(100));
  console.log('🔍 SERVER STATUS CHECK');
  console.log('='.repeat(100) + '\n');
  
  // Try to ping the server
  try {
    const response = await axios.get('http://localhost:3000/api/test', {
      timeout: 5000
    });
    
    console.log('✅ SERVER IS RUNNING!');
    console.log(`   Response:`, response.data);
    console.log('\n✅ API is accessible and responding correctly');
    return;
  } catch(err) {
    console.log('❌ SERVER NOT RESPONDING');
    console.log(`   Error: ${err.message}`);
    
    console.log('\n⏳ Attempting to start server...\n');
    
    // Try to start the server
    try {
      const server = spawn('npm', ['start'], {
        cwd: 'c:\\Crm_dashboard',
        stdio: 'inherit',
        shell: true
      });
      
      console.log('⏳ Server starting in background...');
      console.log('⏳ Waiting 10 seconds for startup...\n');
      
      // Wait for server to start
      await setTimeout(10000);
      
      // Try to ping again
      try {
        const response = await axios.get('http://localhost:3000/api/test', {
          timeout: 5000
        });
        
        console.log('✅ SERVER IS NOW RUNNING!');
        console.log(`   Response:`, response.data);
        console.log('\n📌 NOTE: Server is running in the background.');
        console.log('   You can now run API tests.');
        
      } catch(secondErr) {
        console.log('⚠️  Server started but not responding yet');
        console.log(`   Error: ${secondErr.message}`);
        console.log('\n💡 Server may need more time to start. Please run this command in terminal:');
        console.log('   npm start');
      }
    } catch(startErr) {
      console.log('⚠️  Could not start server automatically');
      console.log(`   Error: ${startErr.message}`);
      console.log('\n💡 Please start the server manually with:');
      console.log('   cd c:\\Crm_dashboard');
      console.log('   npm start');
    }
  }
  
  console.log('\n' + '='.repeat(100) + '\n');
  process.exit(0);
}

checkServerAndStart();
