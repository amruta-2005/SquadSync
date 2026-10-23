"""
Database operations for SquadSync teams, memberships, invitations,
tasks, repositories, and sync snapshots.
Uses SQLite for persistence, tied to the user's authenticated session.
"""

import sqlite3
import json
import time
import uuid
import secrets
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple

DB_PATH = Path(__file__).parent / "squadsync_auth.db"

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 30000")
    conn.execute("PRAGMA synchronous = NORMAL")
    return conn

def init_extended_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Repositories Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS repositories (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            team_id TEXT NOT NULL,
            repo_owner TEXT NOT NULL,
            repo_name TEXT NOT NULL,
            default_branch TEXT NOT NULL DEFAULT 'main',
            github_token TEXT,
            last_synced_at TEXT,
            sync_status TEXT DEFAULT 'pending',
            sync_message TEXT,
            raw_data_json TEXT,
            analytics_json TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 2. Teams Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS teams (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            created_by TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 3. Team Memberships Table (includes role & GitHub username mapping)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS team_memberships (
            id TEXT PRIMARY KEY,
            team_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'developer',
            github_username TEXT DEFAULT '',
            joined_at INTEGER NOT NULL,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(team_id, user_id)
        )
    """)

    # 4. Team Invitations Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS team_invitations (
            id TEXT PRIMARY KEY,
            team_id TEXT NOT NULL,
            email TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'developer',
            status TEXT NOT NULL DEFAULT 'pending',
            invited_by TEXT NOT NULL,
            invitation_token TEXT UNIQUE NOT NULL,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            responded_at INTEGER,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
            FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 5. Database-Backed Tasks Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            team_id TEXT NOT NULL,
            task_key TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            assignee_id TEXT DEFAULT '',
            assignee_name TEXT DEFAULT '',
            assignee_github_username TEXT DEFAULT '',
            priority TEXT NOT NULL DEFAULT 'Medium',
            status TEXT NOT NULL DEFAULT 'Todo',
            story_points REAL DEFAULT 1.0,
            estimated_hours REAL DEFAULT 0.0,
            start_date TEXT,
            due_date TEXT,
            labels TEXT DEFAULT '',
            blocker_reason TEXT DEFAULT '',
            created_by TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
        )
    """)

    # Alter tasks table if newer columns are missing
    cursor.execute("PRAGMA table_info(tasks)")
    task_columns = [col[1] for col in cursor.fetchall()]
    if "start_date" not in task_columns:
        cursor.execute("ALTER TABLE tasks ADD COLUMN start_date TEXT")
    if "labels" not in task_columns:
        cursor.execute("ALTER TABLE tasks ADD COLUMN labels TEXT DEFAULT ''")
    if "blocker_reason" not in task_columns:
        cursor.execute("ALTER TABLE tasks ADD COLUMN blocker_reason TEXT DEFAULT ''")

    # 6. Legacy CSV Tasks Table (kept for backwards compatibility)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS team_tasks (
            id TEXT PRIMARY KEY,
            team_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            title TEXT NOT NULL,
            assignee_github_username TEXT,
            story_points REAL DEFAULT 1.0,
            status TEXT DEFAULT 'Pending',
            due_date TEXT,
            created_at INTEGER NOT NULL
        )
    """)

    # 7. Notifications Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            team_id TEXT NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            task_id TEXT,
            is_read INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user_team ON notifications(user_id, team_id, is_read)")

    # 8. Task Activities Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS task_activities (
            id TEXT PRIMARY KEY,
            team_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            task_title TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT NOT NULL,
            previous_value TEXT,
            new_value TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_task_activities_team ON task_activities(team_id, created_at)")

    # 9. Task Comments & Blockers Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS task_comments (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            team_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            comment TEXT NOT NULL,
            is_blocker INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id, created_at)")

    conn.commit()

    # Seed default team-alpha if not existing
    cursor.execute("SELECT id FROM teams WHERE id = 'team-alpha'")
    if not cursor.fetchone():
        now = int(time.time())
        cursor.execute("""
            INSERT INTO teams (id, name, description, created_by, created_at, updated_at)
            VALUES ('team-alpha', 'Team Alpha — DevPulse', 'Senior Capstone Project', 'usr-alex-chen', ?, ?)
        """, (now, now))

        cursor.execute("SELECT id FROM users WHERE id = 'usr-alex-chen'")
        if cursor.fetchone():
            cursor.execute("""
                INSERT OR IGNORE INTO team_memberships (id, team_id, user_id, role, github_username, joined_at)
                VALUES ('tm-alpha-alex', 'team-alpha', 'usr-alex-chen', 'team_lead', 'alexchen', ?)
            """, (now,))

        cursor.execute("SELECT id FROM users WHERE id = 'usr-maya-patel'")
        if cursor.fetchone():
            cursor.execute("""
                INSERT OR IGNORE INTO team_memberships (id, team_id, user_id, role, github_username, joined_at)
                VALUES ('tm-alpha-maya', 'team-alpha', 'usr-maya-patel', 'developer', 'mayapatel', ?)
            """, (now,))

        cursor.execute("SELECT id FROM users WHERE id = 'usr-20907c5e9fbd'")
        if cursor.fetchone():
            cursor.execute("""
                INSERT OR IGNORE INTO team_memberships (id, team_id, user_id, role, github_username, joined_at)
                VALUES ('tm-alpha-amruta', 'team-alpha', 'usr-20907c5e9fbd', 'team_lead', 'amruta-2005', ?)
            """, (now,))

        conn.commit()

    # Seed or ensure SquadSync team (team-bcab3190) has all 4 real team members
    now = int(time.time())
    cursor.execute("SELECT id FROM teams WHERE id = 'team-bcab3190'")
    if not cursor.fetchone():
        cursor.execute("""
            INSERT INTO teams (id, name, description, created_by, created_at, updated_at)
            VALUES ('team-bcab3190', 'SquadSync', 'Workload Imbalance and Integration Risk Detection', 'usr-20907c5e9fbd', ?, ?)
        """, (now, now))
        conn.commit()

    squadsync_members = [
        ('tm-team-bcab3190-usr-20907c5e9fbd', 'team-bcab3190', 'usr-20907c5e9fbd', 'team_lead', 'amruta-2005'),
        ('tm-team-bcab3190-usr-alex', 'team-bcab3190', 'usr-alex-chen', 'developer', 'alexchen'),
        ('tm-team-bcab3190-usr-prathamesh', 'team-bcab3190', 'usr-prathamesh-wandhare', 'developer', 'prathameshwandhare7-lab'),
        ('tm-team-bcab3190-usr-madhavi', 'team-bcab3190', 'usr-madhavi-pant', 'developer', 'MadhaviPant'),
        ('tm-team-bcab3190-usr-siddhi', 'team-bcab3190', 'usr-siddhi-shinde', 'developer', 'siddhishinde06'),
    ]
    for tm_id, t_id, u_id, role, gh_user in squadsync_members:
        cursor.execute("SELECT id FROM users WHERE id = ?", (u_id,))
        if cursor.fetchone():
            cursor.execute("""
                INSERT OR IGNORE INTO team_memberships (id, team_id, user_id, role, github_username, joined_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (tm_id, t_id, u_id, role, gh_user, now))

    # Also configure repository amruta-2005/SquadSync for team-bcab3190 if not configured
    cursor.execute("SELECT id FROM repositories WHERE team_id = 'team-bcab3190'")
    if not cursor.fetchone():
        cursor.execute("""
            INSERT INTO repositories (
                id, user_id, team_id, repo_owner, repo_name, default_branch,
                sync_status, sync_message, created_at, updated_at
            ) VALUES ('repo-team-bcab3190', 'usr-20907c5e9fbd', 'team-bcab3190', 'amruta-2005', 'SquadSync', 'main', 'pending', 'Ready to synchronize', ?, ?)
        """, (now, now))

    conn.commit()
    conn.close()

# -------------------------------------------------------------
# Teams & Memberships Management
# -------------------------------------------------------------

def create_team(user_id: str, name: str, description: str = "") -> Dict[str, Any]:
    now = int(time.time())
    team_id = f"team-{uuid.uuid4().hex[:8]}"

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO teams (id, name, description, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (team_id, name.strip(), description.strip(), user_id, now, now))

    # Add creator as team_lead
    membership_id = f"tm-{team_id}-{user_id}"
    cursor.execute("""
        INSERT INTO team_memberships (id, team_id, user_id, role, github_username, joined_at)
        VALUES (?, ?, ?, 'team_lead', '', ?)
    """, (membership_id, team_id, user_id, now))

    conn.commit()
    conn.close()

    return {
        "id": team_id,
        "name": name.strip(),
        "description": description.strip(),
        "created_by": user_id,
        "created_at": now,
        "updated_at": now,
        "role": "team_lead"
    }

def update_team(team_id: str, name: str, description: Optional[str] = None) -> Optional[Dict[str, Any]]:
    now = int(time.time())
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    if description is not None:
        cursor.execute("""
            UPDATE teams SET name = ?, description = ?, updated_at = ? WHERE id = ?
        """, (name.strip(), description.strip(), now, team_id))
    else:
        cursor.execute("""
            UPDATE teams SET name = ?, updated_at = ? WHERE id = ?
        """, (name.strip(), now, team_id))

    conn.commit()

    cursor.execute("SELECT * FROM teams WHERE id = ?", (team_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None
    return dict(row)

def get_team_by_id(team_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM teams WHERE id = ?", (team_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)

def get_user_teams(user_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Query all teams where user is a member
    cursor.execute("""
        SELECT t.id, t.name, t.description, t.created_by, t.created_at, t.updated_at,
               tm.role, tm.github_username,
               r.repo_owner, r.repo_name, r.default_branch, r.last_synced_at, r.sync_status
        FROM team_memberships tm
        JOIN teams t ON tm.team_id = t.id
        LEFT JOIN repositories r ON r.team_id = t.id
        WHERE tm.user_id = ?
        ORDER BY t.created_at DESC
    """, (user_id,))
    rows = cursor.fetchall()

    teams_list = []
    for r in rows:
        t_id = r["id"]
        # Count members
        cursor.execute("SELECT COUNT(*) FROM team_memberships WHERE team_id = ?", (t_id,))
        m_count = cursor.fetchone()[0]

        is_repo_configured = bool(r["repo_owner"] and r["repo_name"])
        repo_display = f"{r['repo_owner']}/{r['repo_name']}" if is_repo_configured else "No Repository Connected"

        teams_list.append({
            "id": t_id,
            "name": r["name"],
            "description": r["description"],
            "repo_name": repo_display,
            "user_role": r["role"],
            "my_github_username": r["github_username"] or "",
            "is_configured": is_repo_configured,
            "last_synced_at": r["last_synced_at"],
            "sync_status": r["sync_status"] or "not_configured",
            "members_count": m_count
        })

    conn.close()
    return teams_list

def get_team_members(team_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT u.id as user_id, u.name, u.email, u.avatar_url,
               tm.role, tm.github_username, tm.joined_at
        FROM team_memberships tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ?
        ORDER BY tm.joined_at ASC
    """, (team_id,))
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r["user_id"],
            "user_id": r["user_id"],
            "name": r["name"],
            "email": r["email"],
            "avatar_url": r["avatar_url"],
            "role": r["role"],
            "github_username": r["github_username"] or "",
            "joined_at": r["joined_at"]
        }
        for r in rows
    ]

def get_team_membership(team_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM team_memberships WHERE team_id = ? AND user_id = ?
    """, (team_id, user_id))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)

def update_member_role(team_id: str, user_id: str, new_role: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE team_memberships SET role = ? WHERE team_id = ? AND user_id = ?
    """, (new_role, team_id, user_id))
    conn.commit()
    conn.close()

def update_member_github_username(team_id: str, user_id: str, github_username: str):
    clean_gh = (github_username or "").strip().lstrip("@")
    conn = get_db_connection()
    cursor = conn.cursor()

    if clean_gh:
        # Prevent duplicate mappings across members in the same team
        cursor.execute("""
            SELECT tm.user_id, u.name FROM team_memberships tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = ? AND lower(tm.github_username) = ? AND tm.user_id != ?
        """, (team_id, clean_gh.lower(), user_id))
        conflict = cursor.fetchone()
        if conflict:
            conn.close()
            raise ValueError(f"GitHub username '@{clean_gh}' is already mapped to member {conflict[1]}.")

    cursor.execute("""
        UPDATE team_memberships SET github_username = ? WHERE team_id = ? AND user_id = ?
    """, (clean_gh, team_id, user_id))
    conn.commit()
    conn.close()

def remove_team_member(team_id: str, user_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM team_memberships WHERE team_id = ? AND user_id = ?
    """, (team_id, user_id))
    conn.commit()
    conn.close()

# -------------------------------------------------------------
# Invitations Management
# -------------------------------------------------------------

def create_team_invitation(team_id: str, invited_by: str, email: str, role: str = "developer") -> Dict[str, Any]:
    now = int(time.time())
    expires_at = now + (7 * 86400) # 7 days validity
    invitation_id = f"inv-{uuid.uuid4().hex[:10]}"
    token = secrets.token_urlsafe(32)
    clean_email = email.strip().lower()

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Check if user with this email is already a member
    cursor.execute("""
        SELECT u.id, u.name FROM team_memberships tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ? AND lower(u.email) = ?
    """, (team_id, clean_email))
    existing_member = cursor.fetchone()
    if existing_member:
        conn.close()
        raise ValueError(f"User with email '{clean_email}' ({existing_member[1]}) is already an active member of this team.")

    # 2. Check for existing pending invitation
    cursor.execute("""
        SELECT id, expires_at FROM team_invitations
        WHERE team_id = ? AND lower(email) = ? AND status = 'pending'
    """, (team_id, clean_email))
    existing_inv = cursor.fetchone()
    if existing_inv:
        if existing_inv[1] > now:
            conn.close()
            raise ValueError(f"A pending invitation for '{clean_email}' already exists. You can resend or cancel it from the table below.")
        else:
            # Mark expired
            cursor.execute("UPDATE team_invitations SET status = 'expired' WHERE id = ?", (existing_inv[0],))

    cursor.execute("""
        INSERT INTO team_invitations (id, team_id, email, role, status, invited_by, invitation_token, created_at, expires_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    """, (invitation_id, team_id, clean_email, role, invited_by, token, now, expires_at))

    conn.commit()
    conn.close()

    return {
        "id": invitation_id,
        "team_id": team_id,
        "email": clean_email,
        "role": role,
        "status": "pending",
        "invitation_token": token,
        "created_at": now,
        "expires_at": expires_at
    }

def get_team_invitations(team_id: str) -> List[Dict[str, Any]]:
    now = int(time.time())
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Auto-expire any pending invitations that have passed expires_at
    cursor.execute("""
        UPDATE team_invitations SET status = 'expired'
        WHERE team_id = ? AND status = 'pending' AND expires_at < ?
    """, (team_id, now))
    conn.commit()

    cursor.execute("""
        SELECT ti.id, ti.team_id, ti.email, ti.role, ti.status, ti.invited_by,
               ti.invitation_token, ti.created_at, ti.expires_at, ti.responded_at,
               u.name as inviter_name, u.email as inviter_email
        FROM team_invitations ti
        JOIN users u ON ti.invited_by = u.id
        WHERE ti.team_id = ?
        ORDER BY ti.created_at DESC
    """, (team_id,))
    rows = cursor.fetchall()
    conn.close()

    return [dict(r) for r in rows]

def cancel_team_invitation(team_id: str, invitation_id: str) -> Dict[str, Any]:
    now = int(time.time())
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE team_invitations SET status = 'cancelled', responded_at = ?
        WHERE id = ? AND team_id = ? AND status = 'pending'
    """, (now, invitation_id, team_id))
    if cursor.rowcount == 0:
        conn.close()
        raise ValueError("Pending invitation not found or already processed.")
    conn.commit()
    conn.close()
    return {"success": True, "message": "Invitation cancelled successfully."}

def resend_team_invitation(team_id: str, invitation_id: str) -> Dict[str, Any]:
    now = int(time.time())
    expires_at = now + (7 * 86400)
    new_token = secrets.token_urlsafe(32)
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM team_invitations WHERE id = ? AND team_id = ?", (invitation_id, team_id))
    inv = cursor.fetchone()
    if not inv:
        conn.close()
        raise ValueError("Invitation not found.")
    cursor.execute("""
        UPDATE team_invitations
        SET status = 'pending', invitation_token = ?, created_at = ?, expires_at = ?, responded_at = NULL
        WHERE id = ? AND team_id = ?
    """, (new_token, now, expires_at, invitation_id, team_id))
    conn.commit()
    conn.close()
    return {
        "success": True,
        "message": f"Invitation renewed for {inv['email']}.",
        "invitation_token": new_token,
        "expires_at": expires_at
    }

def get_invitation_by_token(token: str) -> Optional[Dict[str, Any]]:
    now = int(time.time())
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ti.*, t.name as team_name, t.description as team_description, u.name as inviter_name
        FROM team_invitations ti
        JOIN teams t ON ti.team_id = t.id
        JOIN users u ON ti.invited_by = u.id
        WHERE ti.invitation_token = ?
    """, (token,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    inv = dict(row)
    if inv["status"] == "pending" and inv["expires_at"] < now:
        cursor.execute("UPDATE team_invitations SET status = 'expired' WHERE id = ?", (inv["id"],))
        conn.commit()
        inv["status"] = "expired"
    conn.close()
    return inv

def accept_invitation_by_token(token: str, user_id: str, user_email: str) -> Dict[str, Any]:
    inv = get_invitation_by_token(token)
    if not inv:
        raise ValueError("Invalid invitation link or token.")
    if inv["status"] != "pending":
        raise ValueError(f"This invitation has already been {inv['status']}.")
    return respond_to_invitation(inv["id"], user_id, user_email, "accept")

def get_user_pending_invitations(email: str) -> List[Dict[str, Any]]:
    now = int(time.time())
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE team_invitations SET status = 'expired'
        WHERE lower(email) = ? AND status = 'pending' AND expires_at < ?
    """, (email.strip().lower(), now))
    conn.commit()

    cursor.execute("""
        SELECT ti.*, t.name as team_name, t.description as team_description, u.name as inviter_name
        FROM team_invitations ti
        JOIN teams t ON ti.team_id = t.id
        JOIN users u ON ti.invited_by = u.id
        WHERE lower(ti.email) = ? AND ti.status = 'pending'
        ORDER BY ti.created_at DESC
    """, (email.strip().lower(),))
    rows = cursor.fetchall()
    conn.close()

    return [dict(r) for r in rows]

def respond_to_invitation(invitation_id: str, user_id: str, user_email: str, action: str) -> Dict[str, Any]:
    now = int(time.time())
    action_clean = action.strip().lower() # 'accept' or 'decline'

    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM team_invitations WHERE id = ?", (invitation_id,))
    inv = cursor.fetchone()

    if not inv:
        conn.close()
        raise ValueError("Invitation not found.")

    if inv["status"] == "pending" and inv["expires_at"] < now:
        cursor.execute("UPDATE team_invitations SET status = 'expired' WHERE id = ?", (invitation_id,))
        conn.commit()
        conn.close()
        raise ValueError("This invitation has expired. Please ask your team lead to resend the invitation.")

    if inv["status"] != "pending":
        conn.close()
        raise ValueError(f"Invitation has already been {inv['status']}.")

    if inv["email"].lower() != user_email.strip().lower():
        conn.close()
        raise ValueError("This invitation was sent to a different email address.")

    new_status = "accepted" if action_clean == "accept" else "declined"
    cursor.execute("""
        UPDATE team_invitations SET status = ?, responded_at = ? WHERE id = ?
    """, (new_status, now, invitation_id))

    if action_clean == "accept":
        # Add to team_memberships
        m_id = f"tm-{inv['team_id']}-{user_id}"
        cursor.execute("""
            INSERT OR IGNORE INTO team_memberships (id, team_id, user_id, role, github_username, joined_at)
            VALUES (?, ?, ?, ?, '', ?)
        """, (m_id, inv["team_id"], user_id, inv["role"], now))

    conn.commit()
    conn.close()

    return {
        "invitation_id": invitation_id,
        "team_id": inv["team_id"],
        "status": new_status,
        "message": f"Invitation successfully {new_status}."
    }

# -------------------------------------------------------------
# Database-Backed Task Management
# -------------------------------------------------------------

def create_task(
    team_id: str,
    created_by: str,
    title: str,
    description: str = "",
    assignee_id: Optional[str] = None,
    assignee_github_username: Optional[str] = None,
    assignee_name: Optional[str] = None,
    priority: str = "Medium",
    status: str = "Todo",
    story_points: float = 1.0,
    estimated_hours: float = 0.0,
    start_date: Optional[str] = None,
    due_date: Optional[str] = None,
    labels: str = "",
    blocker_reason: str = ""
) -> Dict[str, Any]:
    now = int(time.time())
    task_id = f"task-{uuid.uuid4().hex[:10]}"

    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Calculate task_key (e.g. TASK-1, TASK-2)
    cursor.execute("SELECT COUNT(*) FROM tasks WHERE team_id = ?", (team_id,))
    existing_count = cursor.fetchone()[0]
    task_key = f"TASK-{existing_count + 1}"

    # Lookup assignee details if assignee_id provided
    resolved_assignee_name = (assignee_name or "").strip()
    resolved_assignee_github_username = (assignee_github_username or "").strip().lstrip("@").lower()
    if assignee_id:
        cursor.execute("SELECT name FROM users WHERE id = ?", (assignee_id,))
        u = cursor.fetchone()
        if u:
            resolved_assignee_name = u["name"]
        cursor.execute("SELECT github_username FROM team_memberships WHERE team_id = ? AND user_id = ?", (team_id, assignee_id))
        tm = cursor.fetchone()
        if tm and tm["github_username"]:
            resolved_assignee_github_username = tm["github_username"]

    cursor.execute("""
        INSERT INTO tasks (
            id, team_id, task_key, title, description, assignee_id, assignee_name,
            assignee_github_username, priority, status, story_points, estimated_hours,
            start_date, due_date, labels, blocker_reason, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        task_id, team_id, task_key, title.strip(), description.strip(),
        assignee_id or "", resolved_assignee_name, resolved_assignee_github_username,
        priority, status, float(story_points or 1.0), float(estimated_hours or 0.0),
        start_date or None, due_date or None, labels or "", blocker_reason or "",
        created_by, now, now
    ))

    conn.commit()
    conn.close()

    return {
        "id": task_id,
        "team_id": team_id,
        "task_key": task_key,
        "title": title.strip(),
        "description": description.strip(),
        "assignee_id": assignee_id or "",
        "assignee_name": resolved_assignee_name,
        "assignee_github_username": resolved_assignee_github_username,
        "priority": priority,
        "status": status,
        "story_points": float(story_points or 1.0),
        "estimated_hours": float(estimated_hours or 0.0),
        "start_date": start_date,
        "due_date": due_date,
        "labels": labels,
        "blocker_reason": blocker_reason,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now
    }

def get_team_tasks_db(
    team_id: str,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = "SELECT * FROM tasks WHERE team_id = ?"
    params: List[Any] = [team_id]

    if status and status.upper() != "ALL":
        query += " AND lower(status) = lower(?)"
        params.append(status)

    if priority and priority.upper() != "ALL":
        query += " AND lower(priority) = lower(?)"
        params.append(priority)

    if assignee_id and assignee_id.upper() != "ALL":
        query += " AND assignee_id = ?"
        params.append(assignee_id)

    query += " ORDER BY created_at DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    tasks_list = []
    today_str = time.strftime("%Y-%m-%d", time.gmtime())
    for r in rows:
        d = dict(r)
        is_completed = d["status"].lower() in ["completed", "done", "closed"]
        overdue = False
        if d.get("due_date") and not is_completed:
            try:
                due_str = d["due_date"].split("T")[0]
                if due_str < today_str:
                    overdue = True
            except Exception:
                pass
        d["overdue"] = overdue
        tasks_list.append(d)

    return tasks_list

def get_task_by_id(task_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    is_completed = d["status"].lower() in ["completed", "done", "closed"]
    overdue = False
    if d.get("due_date") and not is_completed:
        try:
            today_str = time.strftime("%Y-%m-%d", time.gmtime())
            if d["due_date"].split("T")[0] < today_str:
                overdue = True
        except Exception:
            pass
    d["overdue"] = overdue
    return d

def update_task_db(
    task_id: str,
    team_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    assignee_id: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    story_points: Optional[float] = None,
    estimated_hours: Optional[float] = None,
    start_date: Optional[str] = None,
    due_date: Optional[str] = None,
    labels: Optional[str] = None,
    blocker_reason: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    now = int(time.time())
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tasks WHERE id = ? AND team_id = ?", (task_id, team_id))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return None

    prev_data = dict(existing)

    new_title = title.strip() if title is not None else existing["title"]
    new_desc = description.strip() if description is not None else existing["description"]
    new_pri = priority if priority is not None else existing["priority"]
    new_status = status if status is not None else existing["status"]
    new_pts = float(story_points) if story_points is not None else existing["story_points"]
    new_hrs = float(estimated_hours) if estimated_hours is not None else existing["estimated_hours"]
    new_start = start_date if start_date is not None else prev_data.get("start_date")
    new_due = due_date if due_date is not None else prev_data.get("due_date")
    new_labels = labels if labels is not None else prev_data.get("labels", "")
    new_blocker = blocker_reason if blocker_reason is not None else prev_data.get("blocker_reason", "")

    new_assignee_id = assignee_id if assignee_id is not None else existing["assignee_id"]
    new_assignee_name = existing["assignee_name"]
    new_assignee_gh = existing["assignee_github_username"]

    if assignee_id is not None:
        if assignee_id:
            cursor.execute("SELECT name FROM users WHERE id = ?", (assignee_id,))
            u = cursor.fetchone()
            new_assignee_name = u["name"] if u else ""
            cursor.execute("SELECT github_username FROM team_memberships WHERE team_id = ? AND user_id = ?", (team_id, assignee_id))
            tm = cursor.fetchone()
            new_assignee_gh = tm["github_username"] if (tm and tm["github_username"]) else ""
        else:
            new_assignee_name = ""
            new_assignee_gh = ""

    cursor.execute("""
        UPDATE tasks SET
            title = ?, description = ?, assignee_id = ?, assignee_name = ?,
            assignee_github_username = ?, priority = ?, status = ?,
            story_points = ?, estimated_hours = ?, start_date = ?, due_date = ?,
            labels = ?, blocker_reason = ?, updated_at = ?
        WHERE id = ? AND team_id = ?
    """, (
        new_title, new_desc, new_assignee_id, new_assignee_name,
        new_assignee_gh, new_pri, new_status, new_pts, new_hrs,
        new_start, new_due, new_labels, new_blocker, now, task_id, team_id
    ))

    conn.commit()
    cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    updated = cursor.fetchone()
    conn.close()

    res = dict(updated) if updated else None
    if res:
        res["_previous"] = prev_data
    return res

def delete_task_db(task_id: str, team_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ? AND team_id = ?", (task_id, team_id))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# -------------------------------------------------------------
# Repositories & Sync Snapshots
# -------------------------------------------------------------

def save_repository_config(
    user_id: str,
    team_id: str,
    repo_owner: str,
    repo_name: str,
    branch: str = "main",
    github_token: Optional[str] = None
) -> Dict[str, Any]:
    now = int(time.time())
    repo_id = f"repo-{team_id}"

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if exists
    cursor.execute("SELECT github_token FROM repositories WHERE team_id = ?", (team_id,))
    existing = cursor.fetchone()

    token_to_store = github_token
    if not token_to_store and existing and existing[0]:
        token_to_store = existing[0]

    cursor.execute("""
        INSERT INTO repositories (
            id, user_id, team_id, repo_owner, repo_name, default_branch,
            github_token, last_synced_at, sync_status, sync_message,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            repo_owner = excluded.repo_owner,
            repo_name = excluded.repo_name,
            default_branch = excluded.default_branch,
            github_token = excluded.github_token,
            updated_at = excluded.updated_at
    """, (
        repo_id, user_id, team_id, repo_owner.strip(), repo_name.strip(), branch.strip() or "main",
        token_to_store.strip() if token_to_store else None, None, "configured",
        "Repository configured. Ready to synchronize.", now, now
    ))

    conn.commit()
    conn.close()

    return {
        "team_id": team_id,
        "repo_owner": repo_owner.strip(),
        "repo_name": repo_name.strip(),
        "repository": f"{repo_owner.strip()}/{repo_name.strip()}",
        "default_branch": branch.strip() or "main",
        "has_token": bool(token_to_store)
    }

def get_repository_config(user_id: str, team_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM repositories WHERE team_id = ?", (team_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "team_id": row["team_id"],
        "repo_owner": row["repo_owner"],
        "repo_name": row["repo_name"],
        "repository": f"{row['repo_owner']}/{row['repo_name']}",
        "default_branch": row["default_branch"],
        "last_synced_at": row["last_synced_at"],
        "sync_status": row["sync_status"],
        "sync_message": row["sync_message"],
        "has_token": bool(row["github_token"]),
        "has_analytics": bool(row["analytics_json"])
    }

def get_internal_repo_credentials(user_id: str, team_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM repositories WHERE team_id = ?", (team_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "repo_owner": row["repo_owner"],
        "repo_name": row["repo_name"],
        "default_branch": row["default_branch"],
        "github_token": row["github_token"]
    }

def update_repository_sync_snapshot(
    user_id: str,
    team_id: str,
    raw_data: Dict[str, Any],
    analytics_data: Dict[str, Any],
    sync_status: str = "success",
    sync_message: str = "Synchronized successfully"
):
    now = int(time.time())
    iso_now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE repositories
        SET last_synced_at = ?,
            sync_status = ?,
            sync_message = ?,
            raw_data_json = ?,
            analytics_json = ?,
            updated_at = ?
        WHERE team_id = ?
    """, (
        iso_now, sync_status, sync_message,
        json.dumps(raw_data), json.dumps(analytics_data), now,
        team_id
    ))
    conn.commit()
    conn.close()

def get_latest_analytics(user_id: str, team_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT analytics_json, last_synced_at, repo_owner, repo_name FROM repositories WHERE team_id = ?",
        (team_id,)
    )
    row = cursor.fetchone()
    conn.close()

    if not row or not row["analytics_json"]:
        return None

    try:
        data = json.loads(row["analytics_json"])
        data["last_updated"] = row["last_synced_at"] or data.get("last_updated")
        return data
    except Exception:
        return None

def save_team_tasks(team_id: str, tasks: List[Dict[str, Any]]):
    """Bridge for CSV tasks import into database tasks table."""
    now = int(time.time())
    conn = get_db_connection()
    cursor = conn.cursor()

    for idx, t in enumerate(tasks):
        raw_key = str(t.get("task_id") or t.get("task_key") or f"CSV-{now}-{idx}")
        task_id = f"task-{team_id}-{raw_key}"
        task_key = raw_key
        cursor.execute("""
            INSERT INTO tasks (
                id, team_id, task_key, title, description, assignee_id, assignee_name,
                assignee_github_username, priority, status, story_points, estimated_hours,
                due_date, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, '', '', '', ?, 'Medium', ?, ?, 0.0, ?, 'csv_importer', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                team_id = excluded.team_id,
                title = excluded.title,
                assignee_github_username = excluded.assignee_github_username,
                story_points = excluded.story_points,
                status = excluded.status,
                due_date = excluded.due_date,
                updated_at = excluded.updated_at
        """, (
            task_id, team_id, task_key, t.get("title", "Imported Task"),
            t.get("assignee_github_username", "").lower(),
            t.get("status", "In Progress"),
            float(t.get("story_points", 1.0) or 1.0),
            t.get("due_date"),
            now, now
        ))

    conn.commit()
    conn.close()

def get_team_tasks(team_id: str) -> List[Dict[str, Any]]:
    return get_team_tasks_db(team_id)

def get_repository_raw_data(team_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT raw_data_json FROM repositories WHERE team_id = ?", (team_id,))
    row = cursor.fetchone()
    conn.close()
    if not row or not row["raw_data_json"]:
        return None
    try:
        return json.loads(row["raw_data_json"])
    except Exception:
        return None

# -------------------------------------------------------------
# Notifications System
# -------------------------------------------------------------

def create_notification(
    user_id: str,
    team_id: str,
    notif_type: str,
    title: str,
    message: str,
    task_id: Optional[str] = None
) -> Dict[str, Any]:
    now = int(time.time())
    notif_id = f"notif-{uuid.uuid4().hex[:12]}"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO notifications (id, user_id, team_id, type, title, message, task_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    """, (notif_id, user_id, team_id, notif_type, title.strip(), message.strip(), task_id or None, now))
    conn.commit()
    conn.close()
    return {
        "id": notif_id,
        "user_id": user_id,
        "team_id": team_id,
        "type": notif_type,
        "title": title.strip(),
        "message": message.strip(),
        "task_id": task_id,
        "is_read": 0,
        "created_at": now
    }

def get_user_notifications(user_id: str, team_id: Optional[str] = None, unread_only: bool = False, limit: int = 50) -> Dict[str, Any]:
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    if team_id:
        if unread_only:
            cursor.execute("""
                SELECT * FROM notifications
                WHERE user_id = ? AND team_id = ? AND is_read = 0
                ORDER BY created_at DESC LIMIT ?
            """, (user_id, team_id, limit))
        else:
            cursor.execute("""
                SELECT * FROM notifications
                WHERE user_id = ? AND team_id = ?
                ORDER BY created_at DESC LIMIT ?
            """, (user_id, team_id, limit))
    else:
        if unread_only:
            cursor.execute("""
                SELECT * FROM notifications
                WHERE user_id = ? AND is_read = 0
                ORDER BY created_at DESC LIMIT ?
            """, (user_id, limit))
        else:
            cursor.execute("""
                SELECT * FROM notifications
                WHERE user_id = ?
                ORDER BY created_at DESC LIMIT ?
            """, (user_id, limit))
    rows = cursor.fetchall()

    if team_id:
        cursor.execute("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND team_id = ? AND is_read = 0", (user_id, team_id))
    else:
        cursor.execute("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0", (user_id,))
    unread_count = cursor.fetchone()[0]
    conn.close()

    return {
        "notifications": [dict(r) for r in rows],
        "unread_count": unread_count
    }

def mark_notification_read(notification_id: str, user_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", (notification_id, user_id))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected

def mark_all_notifications_read(user_id: str, team_id: Optional[str] = None) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    if team_id:
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND team_id = ? AND is_read = 0", (user_id, team_id))
    else:
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", (user_id,))
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return count

def check_and_generate_deadline_notifications(team_id: str):
    now = int(time.time())
    today_str = time.strftime("%Y-%m-%d", time.gmtime(now))
    two_days_later_str = time.strftime("%Y-%m-%d", time.gmtime(now + 2 * 86400))

    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, title, assignee_id, due_date, status FROM tasks
        WHERE team_id = ? AND assignee_id != '' AND lower(status) NOT IN ('completed', 'done', 'closed')
        AND due_date IS NOT NULL AND due_date != ''
    """, (team_id,))
    tasks = cursor.fetchall()

    for t in tasks:
        due_str = t["due_date"].split("T")[0]
        assignee_id = t["assignee_id"]
        task_id = t["id"]
        task_title = t["title"]

        if due_str < today_str:
            cursor.execute("""
                SELECT id FROM notifications
                WHERE user_id = ? AND task_id = ? AND type = 'task_overdue' AND created_at > ?
            """, (assignee_id, task_id, now - 86400))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO notifications (id, user_id, team_id, type, title, message, task_id, is_read, created_at)
                    VALUES (?, ?, ?, 'task_overdue', ?, ?, ?, 0, ?)
                """, (
                    f"notif-{uuid.uuid4().hex[:12]}", assignee_id, team_id,
                    "Task Overdue",
                    f"Task overdue: {task_title}",
                    task_id, now
                ))
        elif due_str <= two_days_later_str:
            cursor.execute("""
                SELECT id FROM notifications
                WHERE user_id = ? AND task_id = ? AND type = 'deadline_approaching' AND created_at > ?
            """, (assignee_id, task_id, now - 2 * 86400))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO notifications (id, user_id, team_id, type, title, message, task_id, is_read, created_at)
                    VALUES (?, ?, ?, 'deadline_approaching', ?, ?, ?, 0, ?)
                """, (
                    f"notif-{uuid.uuid4().hex[:12]}", assignee_id, team_id,
                    "Deadline Approaching",
                    f"Deadline approaching: {task_title}",
                    task_id, now
                ))

    conn.commit()
    conn.close()

# -------------------------------------------------------------
# Activity Feed
# -------------------------------------------------------------

def log_task_activity(
    team_id: str,
    task_id: str,
    user_id: str,
    user_name: str,
    task_title: str,
    action: str,
    details: str,
    previous_value: Optional[str] = None,
    new_value: Optional[str] = None
) -> Dict[str, Any]:
    now = int(time.time())
    act_id = f"act-{uuid.uuid4().hex[:12]}"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO task_activities (
            id, team_id, task_id, user_id, user_name, task_title, action, details, previous_value, new_value, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (act_id, team_id, task_id, user_id, user_name, task_title, action, details, previous_value, new_value, now))
    conn.commit()
    conn.close()
    return {
        "id": act_id,
        "team_id": team_id,
        "task_id": task_id,
        "user_id": user_id,
        "user_name": user_name,
        "task_title": task_title,
        "action": action,
        "details": details,
        "previous_value": previous_value,
        "new_value": new_value,
        "created_at": now
    }

def get_team_activities(team_id: str, task_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    if task_id:
        cursor.execute("""
            SELECT * FROM task_activities
            WHERE team_id = ? AND task_id = ?
            ORDER BY created_at DESC LIMIT ?
        """, (team_id, task_id, limit))
    else:
        cursor.execute("""
            SELECT * FROM task_activities
            WHERE team_id = ?
            ORDER BY created_at DESC LIMIT ?
        """, (team_id, limit))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# -------------------------------------------------------------
# Task Comments & Blockers
# -------------------------------------------------------------

def add_task_comment(
    task_id: str,
    team_id: str,
    user_id: str,
    user_name: str,
    comment: str,
    is_blocker: bool = False
) -> Dict[str, Any]:
    now = int(time.time())
    comment_id = f"comm-{uuid.uuid4().hex[:12]}"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO task_comments (id, task_id, team_id, user_id, user_name, comment, is_blocker, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (comment_id, task_id, team_id, user_id, user_name, comment.strip(), 1 if is_blocker else 0, now))

    if is_blocker:
        cursor.execute("""
            UPDATE tasks SET status = 'Blocked', blocker_reason = ?, updated_at = ?
            WHERE id = ? AND team_id = ?
        """, (comment.strip(), now, task_id, team_id))

    conn.commit()
    conn.close()
    return {
        "id": comment_id,
        "task_id": task_id,
        "team_id": team_id,
        "user_id": user_id,
        "user_name": user_name,
        "comment": comment.strip(),
        "is_blocker": bool(is_blocker),
        "created_at": now
    }

def get_task_comments(task_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM task_comments
        WHERE task_id = ?
        ORDER BY created_at ASC
    """, (task_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Initialize schema on module load
init_extended_db()
