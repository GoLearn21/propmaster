#!/bin/bash
# Manual Edge Function Deployment Script
# This creates the functions directly via Supabase Management API

PROJECT_REF="bqehbymwhgdxutopyecm"
ACCESS_TOKEN="sbp_oauth_3f6b73cbbce15365761e635f4afe7548013a9d12"
OPENAI_KEY="YOUR_OPENAI_API_KEY_HERE"

# First, let's try to set the OpenAI secret
echo "Setting OpenAI API Key secret..."
curl -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '[{"name": "OPENAI_API_KEY", "value": "'${OPENAI_KEY}'"}]'

echo -e "\n\nDone setting secrets"
