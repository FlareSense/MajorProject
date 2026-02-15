import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

def test_email():
    EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
    TO_EMAIL = os.getenv("TO_EMAIL")

    print(f"DEBUG: Attempting to send from {EMAIL_ADDRESS} to {TO_EMAIL}")
    
    if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
        print("[ERROR] Email credentials not found in .env")
        return

    msg = EmailMessage()
    msg['Subject'] = "FlareSense Email Test"
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = TO_EMAIL
    msg.set_content("This is a test email to verify your credentials. If you see this, your email alert system is working!")

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.send_message(msg)
        print("[SUCCESS] Email sent successfully!")
    except Exception as e:
        print(f"[FAILED] {e}")
        if "Authentication failed" in str(e) or "Username and Password not accepted" in str(e):
            print("\n💡 TIP: It looks like an authentication issue.")
            print("Since you are using Gmail, make sure you are using an 'APP PASSWORD', not your regular password.")
            print("1. Go to your Google Account settings.")
            print("2. Search for 'App Passwords'.")
            print("3. Generate a new password for 'Mail' and 'Other (FlareSense)'.")
            print("4. Copy the 16-character code into your .env file as EMAIL_PASSWORD.")

if __name__ == "__main__":
    test_email()
