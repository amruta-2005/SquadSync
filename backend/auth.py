"""
Authentication and session management module for SquadSync.
Provides secure password hashing (PBKDF2-HMAC-SHA256 with cryptographically secure salts),
HttpOnly cookie sessions with SameSite protection, CSRF token handling, in-memory rate limiting,
SQLite persistence, and dependency guards.
"""

import os
import hashlib
import secrets
import sqlite3
import time
from typing import Optional, Dict, Any, Tuple
from pathlib import Path
from fastapi import HTTPException, Header, Depends, status, Request, Response

DB_PATH = Path(__file__).parent / "squadsync_auth.db"

# Cookie configuration
SESSION_COOKIE_NAME = "squadsync_session"
CSRF_COOKIE_NAME = "squadsync_csrf"
# Secure flag should be False for localhost HTTP development, True for production HTTPS
SECURE_COOKIE = os.getenv("SECURE_COOKIE", "false").lower() == "true"
COOKIE_SAMESITE = "lax"

# In-memory rate limiter for login attempts: ip -> list of timestamps
FAILED_LOGIN_ATTEMPTS: Dict[str, list] = {}
RATE_LIMIT_MAX_ATTEMPTS = 5
RATE_LIMIT_WINDOW_SECONDS = 300  # 5 minutes

def check_login_rate_limit(client_ip: str):
    """Enforce rate limiting: maximum 5 failed attempts per 5 minutes per IP."""
    now = time.time()
    attempts = FAILED_LOGIN_ATTEMPTS.get(client_ip, [])
    # Filter attempts within window
    recent_attempts = [t for t in attempts if now - t < RATE_LIMIT_WINDOW_SECONDS]
    FAILED_LOGIN_ATTEMPTS[client_ip] = recent_attempts

    if len(recent_attempts) >= RATE_LIMIT_MAX_ATTEMPTS:
        retry_after = int(RATE_LIMIT_WINDOW_SECONDS - (now - recent_attempts[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please try again in {max(1, retry_after)} seconds."
        )

def record_failed_login(client_ip: str):
    now = time.time()
    attempts = FAILED_LOGIN_ATTEMPTS.get(client_ip, [])
    attempts.append(now)
    FAILED_LOGIN_ATTEMPTS[client_ip] = attempts

def clear_failed_logins(client_ip: str):
    if client_ip in FAILED_LOGIN_ATTEMPTS:
        del FAILED_LOGIN_ATTEMPTS[client_ip]

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 20000")
    conn.execute("PRAGMA synchronous = NORMAL")
    return conn

def init_db():
    conn = get_db()
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
            csrf_token TEXT,
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("PRAGMA table_info(sessions)")
    columns = [col[1] for col in cursor.fetchall()]
    if "csrf_token" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN csrf_token TEXT")
    conn.commit()
    conn.close()

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations and 16-byte random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against salt$hash format using constant-time comparison."""
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
        },
        {
            "id": "usr-20907c5e9fbd",
            "name": "Amruta",
            "email": "amrutasomvanshi08@gmail.com",
            "password": "SquadSync2026!",
            "role": "Team Lead",
            "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
        },
        {
            "id": "usr-prathamesh-wandhare",
            "name": "Prathamesh Wandhare",
            "email": "prathamesh.wandhare@squadsync.edu",
            "password": "SquadSync2026!",
            "role": "Fullstack Developer",
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
        },
        {
            "id": "usr-madhavi-pant",
            "name": "Madhavi Pant",
            "email": "madhavi.pant@squadsync.edu",
            "password": "SquadSync2026!",
            "role": "Frontend Developer",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face"
        },
        {
            "id": "usr-siddhi-shinde",
            "name": "Siddhi Shinde",
            "email": "siddhi.shinde@squadsync.edu",
            "password": "SquadSync2026!",
            "role": "Backend Developer",
            "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face"
        }
    ]

    conn = get_db()
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
        else:
            pw_hash = hash_password(u["password"])
            cursor.execute(
                "UPDATE users SET name = ?, password_hash = ?, role = ? WHERE email = ?",
                (u["name"], pw_hash, u["role"], u["email"].lower())
            )
    conn.commit()
    conn.close()

def create_user(name: str, email: str, password: str, role: str = "Student Contributor") -> Dict[str, Any]:
    email = email.strip().lower()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in or use a different email."
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

def authenticate_user(email: str, password: str, client_ip: str = "127.0.0.1") -> Optional[Dict[str, Any]]:
    check_login_rate_limit(client_ip)
    email = email.strip().lower()

    conn = get_db()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()

    # Avoid user enumeration: perform dummy hash check even if user doesn't exist
    dummy_hash = "00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000"
    if not user:
        verify_password(password, dummy_hash)
        record_failed_login(client_ip)
        return None

    if not verify_password(password, user["password_hash"]):
        record_failed_login(client_ip)
        return None

    # Successful authentication: clear failure count
    clear_failed_logins(client_ip)

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "avatar_url": user["avatar_url"]
    }

def create_session(user_id: str, remember_me: bool = False) -> Tuple[str, str, int]:
    """Create session and return (session_token, csrf_token, max_age_seconds)."""
    lifetime = 30 * 86400 if remember_me else 86400
    now = int(time.time())
    expires_at = now + lifetime
    token = secrets.token_urlsafe(32)
    csrf_token = secrets.token_hex(16)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sessions (token, user_id, csrf_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
        (token, user_id, csrf_token, expires_at, now)
    )
    conn.commit()
    conn.close()
    return token, csrf_token, lifetime

def set_session_cookies(response: Response, session_token: str, csrf_token: str, max_age: int):
    """
    Sets secure HttpOnly session cookie and client-readable CSRF cookie.
    Never exposes session token to client-side JavaScript.
    """
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        max_age=max_age,
        expires=max_age,
        path="/",
        httponly=True,       # Prevents XSS script access to session token
        samesite=COOKIE_SAMESITE,
        secure=SECURE_COOKIE
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=max_age,
        expires=max_age,
        path="/",
        httponly=False,      # Accessible to JavaScript to send in X-CSRF-Token header
        samesite=COOKIE_SAMESITE,
        secure=SECURE_COOKIE
    )

def clear_session_cookies(response: Response):
    """Deletes session and CSRF cookies."""
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/")

def get_user_from_token(token: str) -> Optional[Tuple[Dict[str, Any], str]]:
    if not token:
        return None

    now = int(time.time())
    conn = get_db()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.name, u.email, u.role, u.avatar_url, s.csrf_token, s.expires_at
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
    user_dict = {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "avatar_url": row["avatar_url"]
    }
    return user_dict, row["csrf_token"]

def invalidate_session(token: str):
    if not token:
        return
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.commit()
    conn.close()

def require_authenticated_user(request: Request) -> Dict[str, Any]:
    """
    Dependency guard for protected routes.
    Extracts session from HttpOnly cookie first; falls back to Authorization Bearer header.
    Validates CSRF token on state-changing methods (POST, PUT, DELETE, PATCH).
    """
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split("Bearer ", 1)[1].strip()
        using_cookie = False
    else:
        token = request.cookies.get(SESSION_COOKIE_NAME)
        using_cookie = True

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to access your SquadSync workspace."
        )

    result = get_user_from_token(token)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired or is invalid. Please sign in again."
        )

    user, expected_csrf = result

    # CSRF check on state-changing requests when authenticated via cookies
    if using_cookie and request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        # Exclude login and register routes from CSRF requirement
        path = request.url.path
        if not path.endswith("/auth/login") and not path.endswith("/auth/register"):
            header_csrf = request.headers.get("x-csrf-token")
            cookie_csrf = request.cookies.get(CSRF_COOKIE_NAME)
            if not header_csrf or header_csrf != expected_csrf:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid or missing CSRF token."
                )

    return user

# Initialize database schema and demo accounts on module import
init_db()
seed_demo_users()
