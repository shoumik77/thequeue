import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_URL = "http://localhost:8000"
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")

def test_admin_endpoints():
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    # Test listing sessions
    print("Testing /admin/sessions endpoint...")
    response = requests.get(f"{BASE_URL}/admin/sessions", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        sessions = response.json()
        print(f"Found {len(sessions.get('sessions', []))} sessions")
        for session in sessions.get('sessions', [])[:3]:  # Print first 3 sessions
            print(f"- {session['name']} (ID: {session['id']}, Active: {session['is_active']})")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    if not ADMIN_TOKEN:
        print("Error: ADMIN_TOKEN not found in .env file")
        exit(1)
    test_admin_endpoints()
