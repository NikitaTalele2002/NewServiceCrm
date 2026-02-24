/**
 * Fix script: Map cities to correct states by matching state names
 * This script will:
 * 1. Get all states from the database
 * 2. Find all cities with NULL StateId
 * 3. Match cities to states by Parent_Description (state name)
 * 4. Update cities with correct StateIds
 */

import { State, City } from "../models/index.js";


async function fixCityStateMappings() {
  try {
    console.log("🔍 Fetching all states...");
    const states = await State.findAll({
      attributes: ["Id", "VALUE"],
      raw: true,
    });
    
    if (states.length === 0) {
      console.log("❌ No states found in database");
      return;
    }

    console.log(`✅ Found ${states.length} states`);
    
    // Create a map of state names to IDs (case-insensitive)
    const stateMap = {};
    states.forEach(state => {
      stateMap[state.VALUE.toLowerCase()] = state.Id;
    });

    console.log("\n🔍 Fetching all cities with NULL StateId...");
    const citiesWithoutState = await City.findAll({
      where: { StateId: null },
      attributes: ["Id", "Value", "StateName"],
      raw: true,
    });

    console.log(`✅ Found ${citiesWithoutState.length} cities with NULL StateId`);

    if (citiesWithoutState.length === 0) {
      console.log("✨ No cities to fix!");
      return;
    }

    // Track updates
    let updated = 0;
    let notFound = 0;
    const notFoundCities = [];

    console.log("\n📝 Updating cities...\n");

    for (const city of citiesWithoutState) {
      const stateName = city.StateName?.toLowerCase();
      
      if (!stateName) {
        console.log(`⚠️  City "${city.Value}" has no state name (StateName is null)`);
        notFoundCities.push({ cityId: city.Id, cityName: city.Value, issue: "No state name" });
        notFound++;
        continue;
      }

      const stateId = stateMap[stateName];

      if (stateId) {
        await City.update(
          { StateId: stateId },
          { where: { Id: city.Id } }
        );
        console.log(`✅ City "${city.Value}" → State "${stateName}" (StateId: ${stateId})`);
        updated++;
      } else {
        console.log(`❌ City "${city.Value}" → State "${stateName}" NOT FOUND in database`);
        notFoundCities.push({ cityId: city.Id, cityName: city.Value, stateName });
        notFound++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`📊 SUMMARY:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Not Found: ${notFound}`);
    console.log("=".repeat(60));

    if (notFoundCities.length > 0) {
      console.log("\n⚠️  Cities that could not be mapped:");
      console.table(notFoundCities);
    }

    // Verify the fix
    console.log("\n🔍 Verifying fix...");
    const fixedCities = await City.findAll({
      where: { StateId: null },
      raw: true,
    });

    if (fixedCities.length === 0) {
      console.log("✅ All cities now have StateId assigned!");
    } else {
      console.log(`⚠️  Still ${fixedCities.length} cities without StateId`);
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

// Run the fix
fixCityStateMappings();
