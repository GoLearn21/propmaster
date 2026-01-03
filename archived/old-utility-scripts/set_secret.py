import requests
import json

project_id = "rautdxfkuemmlhcrujxq"
access_token = "sbp_oauth_d0cc0829ce5b306d1476e78cb4a68055d6c46dae"
openai_key = "YOUR_OPENAI_API_KEY_HERE"

url = f"https://api.supabase.com/v1/projects/{project_id}/secrets"
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}
data = {
    "name": "OPENAI_API_KEY",
    "value": openai_key
}

response = requests.post(url, headers=headers, json=data)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
