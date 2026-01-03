#!/bin/bash

# Set OpenAI API key as Supabase secret
PROJECT_ID="rautdxfkuemmlhcrujxq"
ACCESS_TOKEN="sbp_oauth_d0cc0829ce5b306d1476e78cb4a68055d6c46dae"
OPENAI_API_KEY="YOUR_OPENAI_API_KEY_HERE"

# Set the secret via Supabase Management API
curl -X POST "https://api.supabase.com/v1/projects/${PROJECT_ID}/secrets" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"OPENAI_API_KEY\", \"value\": \"${OPENAI_API_KEY}\"}"

echo ""
echo "OpenAI API key secret set successfully"
