@echo off
REM Quick Test Script for Technician Spare Return APIs (Windows)
REM Replace YOUR_TOKEN with actual JWT token and update SERVER_URL

set SERVER_URL=http://localhost:5000
set TECH_TOKEN=YOUR_TOKEN_HERE
set SC_TOKEN=YOUR_SC_TOKEN_HERE

echo.
echo ========== Technician Spare Return API Test ==========
echo.

REM Test 1: Get all technician returns
echo [Test 1] Get all technician returns
echo.
curl -X GET "%SERVER_URL%/api/technician-spare-returns" ^
  -H "Authorization: Bearer %TECH_TOKEN%" ^
  -H "Content-Type: application/json"
echo.
echo.

REM Test 2: Get specific return
echo [Test 2] Get specific return (ID: 102)
echo.
curl -X GET "%SERVER_URL%/api/technician-spare-returns/102" ^
  -H "Authorization: Bearer %TECH_TOKEN%" ^
  -H "Content-Type: application/json"
echo.
echo.

REM Test 3: SC views returns
echo [Test 3] Service Center views returns
echo.
curl -X GET "%SERVER_URL%/api/returns/technician-spare-returns/list" ^
  -H "Authorization: Bearer %SC_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"serviceCenterId\": 1, \"status\": \"submitted\"}"
echo.
echo.

REM Test 4: SC receives items
echo [Test 4] Service Center receives items (ID: 102)
echo.
curl -X POST "%SERVER_URL%/api/technician-spare-returns/102/receive" ^
  -H "Authorization: Bearer %SC_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\": 15, \"items\": [{\"return_item_id\": 201, \"received_qty\": 1}, {\"return_item_id\": 202, \"received_qty\": 2}], \"remarks\": \"All items received in good condition\"}"
echo.
echo.

REM Test 5: SC verifies return
echo [Test 5] Service Center verifies return (ID: 102)
echo.
curl -X POST "%SERVER_URL%/api/technician-spare-returns/102/verify" ^
  -H "Authorization: Bearer %SC_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\": 15, \"items\": [{\"return_item_id\": 201, \"verified_qty\": 1, \"condition_on_receipt\": \"good\"}, {\"return_item_id\": 202, \"verified_qty\": 2, \"condition_on_receipt\": \"good\"}], \"remarks\": \"All items verified and added to inventory\"}"
echo.
echo.

echo ========== Tests Complete ==========
echo.
echo NOTE: Replace YOUR_TOKEN and YOUR_SC_TOKEN with actual JWT tokens
echo NOTE: Update SERVER_URL if your server runs on different port
echo NOTE: Update serviceCenterId and userId based on your database
echo.

pause
