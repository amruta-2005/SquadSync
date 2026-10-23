"""
Authentication and session management module for SquadSync.
Provides secure password hashing (PBKDF2-HMAC-SHA256 with cryptographically secure salts),
session token generation, SQLite persistence, and dependency guards.
"""

import hashlib
import secrets
import sqlite3
import time
from typing import Optional, Dict, Any
from pathlib import Path
from fastapi import HTTPException, Header, Depends, status

DB_PATH = Path(__file__).parent / "squadsync_auth.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            avatar_url TEXT,
            created_at INTEGER NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    conn.close()

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations and 16-byte random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against salt$hash format."""
    try:
        salt, key_hex = hashed_password.split("$")
        test_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(test_key.hex(), key_hex)
    except Exception:
        return False

def seed_demo_users():
    """Seed student & mentor demo accounts if they do not exist."""
    demo_users = [
        {
            "id": "usr-alex-chen",
            "name": "Alex Chen",
            "email": "alex.chen@squadsync.edu",
            "password": "SquadSync2026!",
            "role": "Team Lead & Fullstack Dev",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face"
        },
        {
            "id": "usr-maya-patel",
            "name": "Maya Patel",
            "email": "maya.patel@squadsync.edu",
            "password": "SquadSync2026!",
            "role": "Frontend Developer",
            "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face"
        },
        {
            "id": "usr-mentor-vance",
            "name": "Dr. Eleanor Vance",
            "email": "mentor@squadsync.edu",
            "password": "SquadSync2026!",
            "role": "Capstone Faculty Mentor",
            "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face"
        }
    ]

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    now = int(time.time())

    for u in demo_users:
        cursor.execute("SELECT id FROM users WHERE email = ?", (u["email"].lower(),))
        if not cursor.fetchone():
            pw_hash = hash_password(u["password"])
            cursor.execute(
                "INSERT INTO users (id, name, email, password_hash, role, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (u["id"], u["name"], u["email"].lower(), pw_hash, u["role"], u["avatar_url"], now)
            )
    conn.commit()
    conn.close()

def create_user(name: str, email: str, password: str, role: str = "Student Contributor") -> Dict[str, Any]:
    email = email.strip().lower()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address is already registered."
        )

    user_id = f"usr-{secrets.token_hex(6)}"
    pw_hash = hash_password(password)
    now = int(time.time())
    avatar_url = f"https://api.dicebear.com/7.x/initials/svg?seed={name}"

    cursor.execute(
        "INSERT INTO users (id, name, email, password_hash, role, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, name.strip(), email, pw_hash, role.strip(), avatar_url, now)
    )
    conn.commit()
    conn.close()

    return {
        "id": user_id,
        "name": name.strip(),
        "email": email,
        "role": role.strip(),
        "avatar_url": avatar_url
    }

def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    email = email.strip().lower()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return None

    if not verify_password(password, user["password_hash"]):
        return None

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "avatar_url": user["avatar_url"]
    }

def create_session(user_id: str, remember_me: bool = False) -> str:
    # 30 days if remember_me, else 24 hours
    lifetime = 30 * 86400 if remember_me else 86400
    now = int(time.time())
    expires_at = now + lifetime
    token = secrets.token_urlsafe(32)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
        (token, user_id, expires_at, now)
    )
    conn.commit()
    conn.close()
    return token

def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None

    now = int(time.time())
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.name, u.email, u.role, u.avatar_url, s.expires_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ?
    """, (token,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        return None

    if row["expires_at"] < now:
        # Expired session: delete it
        cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        conn.close()
        return None

    conn.close()
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "avatar_url": row["avatar_url"]
    }

def invalidate_session(token: str):
    if not token:
        return
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.commit()
    conn.close()

def require_authenticated_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Dependency guard: extracts Bearer token and returns user or raises 401."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to access this resource."
        )

    token = authorization.split("Bearer ", 1)[1].strip()
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid. Please sign in again."
        )

    return user

# Initialize database schema and demo accounts on module import
init_db()
seed_demo_users()
