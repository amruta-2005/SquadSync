import json
import urllib.request
from backend.auth import create_access_token

token = create_access_token({"sub": "user-48fbb2fc", "email": "amruta@squadsync.edu"})
url = "http://127.0.0.1:8000/api/v1/teams/team-bcab3190/contributor-mapping"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"Status: {resp.status}")
        print(f"Team Members count: {len(data['data']['members'])}")
        print(f"Contributors count: {len(data['data']['github_contributors'])}")
        print(f"Collaborators count: {len(data['data']['collaborators'])}")
        print(f"Invitations count: {len(data['data']['invitations'])}")
        print(f"Summary counts: {data['data']['counts']}")
        if data['data']['github_contributors']:
            print("First 3 contributors:")
            for c in data['data']['github_contributors'][:3]:
                print(f"  - {c.get('login')} (contributions: {c.get('contributions')}, mapped: {c.get('is_mapped')})")
        if data['data']['members']:
            print("Members:")
            for m in data['data']['members']:
                print(f"  - {m.get('name')} (role: {m.get('role')}, gh: {m.get('github_username')})")
except Exception as e:
    print(f"Request failed: {e}")
