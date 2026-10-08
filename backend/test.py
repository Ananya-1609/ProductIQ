import os
import requests
from dotenv import load_dotenv

print("1. Starting...")

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

print("2. API key found:", bool(api_key))

if not api_key:
    raise ValueError("GEMINI_API_KEY not found")

url = (
    "https://generativelanguage.googleapis.com/"
    "v1beta/models/gemini-3.6-flash:generateContent"
)

headers = {
    "x-goog-api-key": api_key,
    "Content-Type": "application/json"
}

data = {
    "contents": [
        {
            "parts": [
                {"text": "Say only: Hello"}
            ]
        }
    ]
}

print("3. Sending REST request...")

response = requests.post(
    url,
    headers=headers,
    json=data,
    timeout=30
)

print("4. Status:", response.status_code)
print("5. Response:")
print(response.text)