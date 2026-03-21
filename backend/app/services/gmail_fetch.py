import os
import base64
import re
import time
from datetime import datetime
from email import message_from_bytes

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import requests

# -------------------------------
# CONFIG
# -------------------------------
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
BACKEND_URL = "http://localhost:8000/analyze/email"

# -------------------------------
# LOAD TOKEN
# -------------------------------
creds = Credentials.from_authorized_user_file(
    'app/services/token.json', SCOPES
)

service = build('gmail', 'v1', credentials=creds)

# -------------------------------
# HELPERS
# -------------------------------
def extract_links(text):
    return re.findall(r'https?://[^\s]+', text)

def get_email_body(msg):
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                return part.get_payload(decode=True).decode(errors='ignore')
    else:
        return msg.get_payload(decode=True).decode(errors='ignore')
    return ""

# -------------------------------
# FETCH EMAIL BY ID
# -------------------------------
def fetch_email_by_id(msg_id):
    try:
        msg = service.users().messages().get(
            userId='me',
            id=msg_id,
            format='raw'
        ).execute()

        raw_msg = base64.urlsafe_b64decode(msg['raw'])
        email_msg = message_from_bytes(raw_msg)

        sender = email_msg['From']
        body = get_email_body(email_msg)
        links = extract_links(body)

        data = {
            "type": "email",
            "content": body,
            "sender": sender,
            "links": links,
            "timestamp": datetime.now().isoformat()
        }

        print("\n📩 --- NEW EMAIL FETCHED ---")
        print(data)

        send_to_backend(data)

    except Exception as e:
        print("❌ Email Fetch Error:", e)

# -------------------------------
# SEND TO MAYAM
# -------------------------------
def send_to_backend(data):
    try:
        res = requests.post(BACKEND_URL, json=data)

        print("\n🧠 --- RESPONSE FROM MAYAM ---")

        try:
            print(res.json())
        except Exception as e:
            print("❌ JSON Parsing Error:", e)
            print("⚠️ Raw response from backend:")
            print(res.text)

    except requests.exceptions.ConnectionError:
        print("❌ Backend not running. Start FastAPI server.")
    except Exception as e:
        print("❌ Unexpected Error:", e)

# -------------------------------
# REAL-TIME LOOP
# -------------------------------
def start_email_monitor():
    seen_ids = set()

    print("🚀 MAYAM Email Monitoring Started...\n")

    while True:
        try:
            results = service.users().messages().list(
                userId='me',
                maxResults=1
            ).execute()

            messages = results.get('messages', [])

            if not messages:
                print("📭 No emails found...")
                time.sleep(10)
                continue

            msg_id = messages[0]['id']

            if msg_id in seen_ids:
                print("⏳ No new email...")
            else:
                seen_ids.add(msg_id)
                fetch_email_by_id(msg_id)

            time.sleep(10)

        except Exception as e:
            print("❌ Loop Error:", e)
            time.sleep(10)

# -------------------------------
# RUN
# -------------------------------
if __name__ == "__main__":
    start_email_monitor()