import winsound
import smtplib
import os
from email.message import EmailMessage

def play_alarm():
    winsound.PlaySound("alarm.wav", winsound.SND_FILENAME | winsound.SND_ASYNC)

def send_email_alert(image_path):
    try:
        EMAIL_ADDRESS = "codewithpavan29@gmail.com"
        EMAIL_PASSWORD = "kawyniwrvscovdql"
        TO_EMAIL = "marikanttipavankumar0@gmail.com"

        msg = EmailMessage()
        msg['Subject'] = "🔥 FIRE ALERT DETECTED!"
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = TO_EMAIL
        msg.set_content("Fire detected. See attached image.")

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
