import winsound
import smtplib
import os
from email.message import EmailMessage
from twilio.rest import Client  # Import Twilio (Install: pip install twilio)
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- TWILIO SMS CONFIGURATION ---
TWILIO_SID = os.getenv("TWILIO_SID") 
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER")
USER_PHONE_NUMBER = os.getenv("USER_PHONE_NUMBER")
# ------------------------------------------------

def play_alarm():
    winsound.PlaySound("alarm.wav", winsound.SND_FILENAME | winsound.SND_ASYNC)

def make_call_alert(severity, location_url):
    """Makes a voice call alert via Twilio."""
    try:
        # Check if placeholders are still present
        if "ACxxx" in TWILIO_SID or "your_" in TWILIO_AUTH_TOKEN:
            print("⚠️ Twilio Credentials not set. Call Skipped.")
            return

        client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)
        
        # TwiML (Voice Markup)
        twiml_response = f"""
        <Response>
            <Say voice="alice">
                Emergency Alert! Fire detected at your location. 
                Severity is {severity}. 
                Please check the live feed immediately.
            </Say>
        </Response>
        """
        
        call = client.calls.create(
            twiml=twiml_response,
            to=USER_PHONE_NUMBER,
            from_=TWILIO_FROM_NUMBER
        )
        print(f"� Call Initiated! SID: {call.sid}")
    except Exception as e:
        print(f"❌ Failed to make call: {e}")

def send_email_alert(image_path, location=None):
    try:
        EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
        EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
        TO_EMAIL = os.getenv("TO_EMAIL")

        if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
            print("❌ Email credentials missing in .env file (EMAIL_ADDRESS or EMAIL_PASSWORD)")
            return
        msg = EmailMessage()
        msg['Subject'] = "🔥 FIRE ALERT DETECTED!"
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = TO_EMAIL
        
        content = "Fire detected. See attached image.\n"
        
        if location and 'lat' in location and 'lon' in location:
            lat = location['lat']
            lon = location['lon']
            maps_link = f"https://www.google.com/maps?q={lat},{lon}"
            content += f"\n📍 ALERT LOCATION: {lat}, {lon}\n"
            content += f"🔗 View on Map: {maps_link}\n"
            
        msg.set_content(content)

        with open(image_path, 'rb') as f:
            file_data = f.read()
            file_name = os.path.basename(image_path)

        msg.add_attachment(file_data, maintype='image', subtype='jpeg', filename=file_name)

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.send_message(msg)

        print("[EMAIL SENT] Fire alert email delivered.")

    except smtplib.SMTPAuthenticationError:
        print("\n❌ EMAIL LOGIN FAILED: Username and Password not accepted.")
        print("👉 Solution: You must use an 'App Password' if 2-Step Verification is enabled.")
        print("   1. Go to https://myaccount.google.com/security")
        print("   2. Search for 'App Passwords'")
        print("   3. Generate a new password and update EMAIL_PASSWORD in .env\n")
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")

# --- TELEGRAM AND WHATSAPP BOTS ---

def send_telegram_alert(image_path, location=None, message="FIRE ALERT", severity="High"):
    import requests
    TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
    TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
    
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("⚠️ Telegram Credentials not set. Alert Skipped.")
        return
        
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
    
    emoji = "🚨" if severity.lower() in ["high", "critical"] else "⚠️"
    caption = f"{emoji} *{message}* {emoji}\n\n*Severity:* {severity}"
    
    if location and 'lat' in location and 'lon' in location:
        maps_link = f"https://www.google.com/maps?q={location['lat']},{location['lon']}"
        caption += f"\n📍 [View Location on Map]({maps_link})"
        
    try:
        with open(image_path, 'rb') as f:
            files = {'photo': f}
            data = {
                'chat_id': TELEGRAM_CHAT_ID,
                'caption': caption,
                'parse_mode': 'Markdown'
            }
            response = requests.post(url, files=files, data=data)
            if response.status_code == 200:
                print("✅ Telegram Alert Sent Successfully!")
            else:
                print(f"❌ Telegram Error: {response.text}")
    except Exception as e:
        print(f"❌ Telegram Exception: {e}")

def send_whatsapp_alert(location=None, message="FIRE ALERT", severity="High"):
    TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")
    
    if "ACxxx" in TWILIO_SID or not TWILIO_WHATSAPP_NUMBER:
        print("⚠️ Twilio WhatsApp Credentials not set. Alert Skipped.")
        return
        
    client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)
    
    emoji = "🚨" if severity.lower() in ["high", "critical"] else "⚠️"
    body = f"{emoji} *{message}* {emoji}\n\n*Severity:* {severity}"
    
    if location and 'lat' in location and 'lon' in location:
        maps_link = f"https://www.google.com/maps?q={location['lat']},{location['lon']}"
        body += f"\n📍 Map: {maps_link}"
    
    try:
        # Twilio WhatsApp requires 'whatsapp:' prefix
        from_number = f"whatsapp:{TWILIO_WHATSAPP_NUMBER}"
        to_number = f"whatsapp:{USER_PHONE_NUMBER}"
        
        msg = client.messages.create(
            body=body,
            from_=from_number,
            to=to_number
        )
        print(f"✅ WhatsApp Alert Sent! SID: {msg.sid}")
    except Exception as e:
        print(f"❌ Failed to send WhatsApp: {e}")

