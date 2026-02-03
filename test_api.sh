#!/bin/bash

# Login and get session cookie
echo "Logging in..."
COOKIE=$(curl -s -c - -X POST 'https://qsights.in/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"bq-evaluation.evaladmin@qsights.com","password":"dMoaQpf6iHpq"}' \
  | grep connect.sid | awk '{print $7}')

echo "Session cookie: $COOKIE"
echo ""

# Test triggered evaluations API
echo "=== Triggered Evaluations API ==="
curl -s "https://qsights.in/api/evaluation/triggered" \
  -H "Cookie: connect.sid=$COOKIE" \
  -H "Accept: application/json" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data, indent=2))" | head -50

echo ""
echo "=== Custom Questionnaires API ==="
curl -s "https://qsights.in/api/evaluation-custom-questionnaires" \
  -H "Cookie: connect.sid=$COOKIE" \
  -H "Accept: application/json" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data, indent=2))" | head -50
