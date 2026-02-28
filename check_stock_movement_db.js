// Direct database check for stock movement source location
import { sequelize } from './server/db.js';
import { StockMovement, SpareRequest } from './server/models/index.js';

async function checkStockMovementSourceLocation() {
  try {
    console.log('='.repeat(70));
    console.log('DATABASE CHECK: Stock Movement Source Location');
    console.log('='.repeat(70));

    // Get recent stock movements
    const recentMovements = await StockMovement.findAll({
      limit: 10,
      order: [['created_at', 'DESC']],
      raw: true
    });

    if (recentMovements.length === 0) {
      console.log('\n❌ No stock movements found in database');
      return;
    }

    console.log(`\nFound ${recentMovements.length} recent stock movements:\n`);
    
    let correctCount = 0;
    let incorrectCount = 0;

    for (const movement of recentMovements) {
      const refNo = movement.reference_no || 'N/A';
      const sourceType = movement.source_location_type || 'NULL';
      const sourceId = movement.source_location_id || 'NULL';
      const destType = movement.destination_location_type || 'NULL';
      const destId = movement.destination_location_id || 'NULL';

      const isCorrect = sourceType === 'plant';
      
      if (isCorrect) {
        console.log(`✅ ${refNo}`);
        correctCount++;
      } else {
        console.log(`❌ ${refNo}`);
        incorrectCount++;
      }

      console.log(`   Source: ${sourceType} (ID: ${sourceId})`);
      console.log(`   Destination: ${destType} (ID: ${destId})`);
      console.log(`   Type: ${movement.stock_movement_type}, Status: ${movement.status}`);
      console.log('');
    }

    console.log('='.repeat(70));
    console.log(`Summary: ${correctCount} CORRECT, ${incorrectCount} INCORRECT`);
    
    if (incorrectCount === 0 && correctCount > 0) {
      console.log('✅✅✅ ALL STOCK MOVEMENTS HAVE CORRECT SOURCE LOCATION ✅✅✅');
    } else if (incorrectCount > 0) {
      console.log('❌ SOME STOCK MOVEMENTS STILL HAVE WRONG SOURCE LOCATION');
    }
    console.log('='.repeat(70));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkStockMovementSourceLocation();
