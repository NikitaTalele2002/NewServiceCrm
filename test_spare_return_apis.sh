#!/bin/bash
# Quick Test Script for Technician Spare Return APIs
# Replace YOUR_TOKEN with actual JWT token and SERVER_URL with your server URL

SERVER_URL="http://localhost:5000"
TECH_TOKEN="YOUR_TOKEN_HERE"
SC_TOKEN="YOUR_SC_TOKEN_HERE"

echo "========== Technician Spare Return API Test =========="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Get all technician returns
echo -e "${BLUE}Test 1: Get all technician returns${NC}"
curl -X GET "$SERVER_URL/api/technician-spare-returns" \
  -H "Authorization: Bearer $TECH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 2: Get specific return
echo -e "${BLUE}Test 2: Get specific return (ID: 102)${NC}"
curl -X GET "$SERVER_URL/api/technician-spare-returns/102" \
  -H "Authorization: Bearer $TECH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 3: SC views returns
echo -e "${BLUE}Test 3: Service Center views returns${NC}"
curl -X GET "$SERVER_URL/api/returns/technician-spare-returns/list" \
  -H "Authorization: Bearer $SC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceCenterId": 1,
    "status": "submitted"
  }' | jq '.'
echo ""
echo ""

# Test 4: SC receives items
echo -e "${BLUE}Test 4: Service Center receives items (ID: 102)${NC}"
curl -X POST "$SERVER_URL/api/technician-spare-returns/102/receive" \
  -H "Authorization: Bearer $SC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 15,
    "items": [
      {
        "return_item_id": 201,
        "received_qty": 1
      },
      {
        "return_item_id": 202,
        "received_qty": 2
      }
    ],
    "remarks": "All items received in good condition"
  }' | jq '.'
echo ""
echo ""

# Test 5: SC verifies and updates inventory
echo -e "${BLUE}Test 5: Service Center verifies return (ID: 102)${NC}"
curl -X POST "$SERVER_URL/api/technician-spare-returns/102/verify" \
  -H "Authorization: Bearer $SC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 15,
    "items": [
      {
        "return_item_id": 201,
        "verified_qty": 1,
        "condition_on_receipt": "good"
      },
      {
        "return_item_id": 202,
        "verified_qty": 2,
        "condition_on_receipt": "good"
      }
    ],
    "remarks": "All items verified and added to inventory"
  }' | jq '.'
echo ""
echo ""

echo -e "${GREEN}========== Tests Complete ==========${NC}"
echo ""
echo "📌 NOTE: Replace YOUR_TOKEN and YOUR_SC_TOKEN with actual JWT tokens"
echo "📌 Update SERVER_URL if your server runs on different port"
echo "📌 Update serviceCenterId and userId based on your database"
