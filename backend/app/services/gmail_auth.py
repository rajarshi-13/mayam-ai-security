from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

flow = InstalledAppFlow.from_client_secrets_file(
    'app/services/credentials.json', SCOPES
)

creds = flow.run_local_server(port=0)

# 🔥 SAVE TOKEN (IMPORTANT)
with open('app/services/token.json', 'w') as token:
    token.write(creds.to_json())

print("✅ Authentication successful + token saved")