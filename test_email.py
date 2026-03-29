import smtplib
import os
from email.message import EmailMessage
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_send_email():
    print("--- 📧 Email Configuration Verification ---")
    
    email_address = os.getenv("EMAIL_ADDRESS")
    email_password = os.getenv("EMAIL_PASSWORD")
    to_email = os.getenv("TO_EMAIL")
    
    # Mask password for display
    start_mask = email_password[:2] if email_password else "??"
    end_mask = email_password[-2:] if email_password else "??"
    masked_pw = f"{start_mask}****{end_mask}" if email_password else "NOT SET"

    print(f"From: {email_address}")
    print(f"To: {to_email}")
    print(f"Password (masked): {masked_pw}")

    if not email_address or not email_password or not to_email:
        print("\n❌ Error: Missing email credentials in .env file.")
        return

    msg = EmailMessage()
    msg['Subject'] = "🔥 Diagnostic Email - Fire Detection System"
    msg['From'] = email_address
    msg['To'] = to_email
    msg.set_content("This is a diagnostic email to verify that your .env credentials are correct and working.")

    try:
        print("\nConnecting to Gmail SMTP (smtp.gmail.com:465)...")
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            print("Connected. Authenticating...")
            smtp.login(email_address, email_password)
            print("✅ Authentication Successful.")
            
            print("Sending test message...")
            smtp.send_message(msg)
            print("✅ Email sent successfully!")
            print("Please check your inbox (and spam folder) for the test email.")
            
    except smtplib.SMTPAuthenticationError:
        print("\n❌ Authentication Failed.")
        print(f"The password '{masked_pw}' was rejected by Gmail.")
        print("Common reasons:")
        print("1. It is your login password, not an App Password.")
        print("2. The App Password has been revoked or is inactive.")
        print("3. Two-Factor Authentication (2FA) is OFF (App Passwords require 2FA).")
    except Exception as e:
        print(f"\n❌ An error occurred: {e}")

if __name__ == "__main__":
    test_send_email()
