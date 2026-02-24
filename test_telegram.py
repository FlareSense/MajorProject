import os
import requests
from dotenv import load_dotenv

# Force reload dotenv just to be safe
load_dotenv(override=True)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

print(f"Token Loaded: {TELEGRAM_BOT_TOKEN[:10]}... (Length: {len(TELEGRAM_BOT_TOKEN) if TELEGRAM_BOT_TOKEN else 0})")
print(f"Chat ID Loaded: {TELEGRAM_CHAT_ID}")

url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

data = {
    'chat_id': TELEGRAM_CHAT_ID,
    'text': "🧪 *TEST MESSAGE*\nIf you are seeing this, your Telegram Bot credentials are correct!",
    'parse_mode': 'Markdown'
}

print("Attempting to send message...")
response = requests.post(url, data=data)

print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    print("✅ Success! Message sent.")
else:
    print(f"❌ Error Output: {response.text}")
