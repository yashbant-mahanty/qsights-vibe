#!/bin/bash

echo "Testing Bulk Delete API"
echo "======================="

# Test with valid IDs (replace with actual participant IDs from your database)
curl -X POST http://localhost:8000/api/participants/bulk-delete \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"ids": ["test-id-1", "test-id-2"]}' | jq .

echo -e "\n\nTest with empty array:"
curl -X POST http://localhost:8000/api/participants/bulk-delete \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"ids": []}' | jq .

echo -e "\n\nTest with missing ids parameter:"
curl -X POST http://localhost:8000/api/participants/bulk-delete \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{}' | jq .
