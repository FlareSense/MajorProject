import winsound
import smtplib
import os
from email.message import EmailMessage
from twilio.rest import Client  # Import Twilio (Install: pip install twilio)

# --- TWILIO SMS CONFIGURATION ---
TWILIO_SID = os.getenv("TWILIO_SID", "your_twilio_sid") 
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "your_twilio_auth_token")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "+16095071587")
USER_PHONE_NUMBER = os.getenv("USER_PHONE_NUMBER", "+918639004939")
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
        EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS", "codewithpavan29@gmail.com")
        EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "your_email_password")
        TO_EMAIL = os.getenv("TO_EMAIL", "marikanttipavankumar0@gmail.com")
 
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

    except Exception as e:
        print("[EMAIL ERROR]", e)
