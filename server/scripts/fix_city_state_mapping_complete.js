/**
 * Complete Fix: Map Cities to States
 * 
 * This script:
 * 1. Finds all cities without StateId
 * 2. Matches them to states using Parent_Description (state name)
 * 3. Updates the Parent_I column with correct StateId
 * 4. Verifies the fix
 */

import { sequelize, State, City } from "../models/index.js";

async function fixCityStateMappings() {
  try {
    console.log("\n========================================");
    console.log("🔧 FIXING CITY-STATE MAPPINGS");
    console.log("========================================\n");

    // Step 1: Get all states
    console.log("📍 Step 1: Fetching all states from database...");
    const states = await State.findAll({
      attributes: ["Id", "VALUE"],
      raw: true,
      order: [["Id", "ASC"]],
    });

    if (states.length === 0) {
      console.log("❌ ERROR: No states found in database");
      process.exit(1);
    }

    console.log(`✅ Found ${states.length} states\n`);

    // Create state mapping (name -> ID)
    const stateMap = {};
    states.forEach((state) => {
      const stateName = state.VALUE.toLowerCase().trim();
      stateMap[stateName] = state.Id;
    });

    // Step 2: Get all cities
    console.log("📍 Step 2: Fetching all cities from database...");
    const allCities = await City.findAll({
      attributes: ["Id", "Value", "Description", "StateId", "StateName"],
      raw: true,
      order: [["Id", "ASC"]],
    });

    console.log(`✅ Found ${allCities.length} total cities\n`);

    // Step 3: Identify cities needing fixes
    console.log("📍 Step 3: Analyzing which cities need StateId...\n");

    const citiesWithoutStateId = allCities.filter((c) => c.StateId === null);
    const citiesWithStateId = allCities.filter((c) => c.StateId !== null);

    console.log(`   ✅ ${citiesWithStateId.length} cities already have StateId`);
    console.log(`   ⚠️  ${citiesWithoutStateId.length} cities missing StateId\n`);

    if (citiesWithoutStateId.length === 0) {
      console.log("✨ All cities already have StateId! No fixes needed.\n");
      console.log("========================================");
      console.log("✅ FIX COMPLETE - All cities properly mapped");
      console.log("========================================\n");
      process.exit(0);
    }

    // Step 4: Try to auto-map using StateName
    console.log("📍 Step 4: Auto-mapping cities using StateName...\n");

    let mapped = 0;
    let notFound = 0;
    const unmappedCities = [];

    for (const city of citiesWithoutStateId) {
      if (city.StateName) {
        const stateName = city.StateName.toLowerCase().trim();
        const stateId = stateMap[stateName];

        if (stateId) {
          // Update the city with the correct StateId
          await City.update({ StateId: stateId }, { where: { Id: city.Id } });
          console.log(
            `   ✅ City: "${city.Value}" → State: "${city.StateName}" (StateId: ${stateId})`
          );
          mapped++;
        } else {
          unmappedCities.push({
            Id: city.Id,
            Value: city.Value,
            StateName: city.StateName,
            reason: "State not found",
          });
          console.log(
            `   ❌ City: "${city.Value}" → State: "${city.StateName}" (State NOT FOUND)`
          );
          notFound++;
        }
      } else {
        unmappedCities.push({
          Id: city.Id,
          Value: city.Value,
          StateName: null,
          reason: "No state name provided",
        });
        console.log(
          `   ❌ City: "${city.Value}" (No StateName - cannot auto-map)`
        );
        notFound++;
      }
    }

    console.log("\n");

    // Step 5: Verify the fix
    console.log("📍 Step 5: Verifying fix...\n");

    const verifyStates = await State.findAll({
      attributes: ["Id"],
      raw: true,
    });
    const verifyStateIds = verifyStates.map((s) => s.Id);

    const citiesNowWithState = await City.findAll({
      where: { StateId: { [sequelize.Sequelize.Op.in]: verifyStateIds } },
      attributes: ["Id", "Value", "StateId"],
      raw: true,
    });

    const citiesStillWithoutState = await City.findAll({
      where: { StateId: null },
      attributes: ["Id", "Value"],
      raw: true,
    });

    console.log(`   ✅ Cities with StateId: ${citiesNowWithState.length}`);
    console.log(`   ⚠️  Cities still without StateId: ${citiesStillWithoutState.length}\n`);

    // Step 6: Summary
    console.log("========================================");
    console.log("📊 SUMMARY");
    console.log("========================================");
    console.log(`✅ Successfully mapped: ${mapped} cities`);
    console.log(`❌ Could not map: ${notFound} cities`);
    console.log(`📍 Total states available: ${states.length}`);
    console.log(`📍 Total cities: ${allCities.length}\n`);

    if (unmappedCities.length > 0) {
      console.log("⚠️  UNMAPPED CITIES (Manual mapping required):\n");
      console.table(unmappedCities);
      console.log(
        "\nThese cities either have no state name or the state doesn't exist in database.\n"
      );
    }

    if (citiesStillWithoutState.length > 0) {
      console.log("\n⚠️  Cities still missing StateId:\n");
      console.table(citiesStillWithoutState);
    }

    console.log("========================================");
    if (notFound === 0) {
      console.log("✅ FIX COMPLETE - All cities are now properly mapped!");
    } else {
      console.log(
        "⚠️  PARTIAL FIX - Some cities could not be automatically mapped."
      );
      console.log(
        "Please review unmapped cities above and add them manually."
      );
    }
    console.log("========================================\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run the fix
fixCityStateMappings();
