"""
FastAPI Server for SquadSync — Dynamic Collaboration, Workload & Risk Intelligence Platform.
Provides multi-tenant team management, invitation workflows, database-backed task management,
GitHub repository integration, contributor mapping, and explainable analytics.
"""

import csv
import io
import time
import sys
import json
import sqlite3
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Depends, HTTPException, status, Header, UploadFile, File, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Ensure backend directory and project root are in sys.path regardless of execution CWD
backend_dir = str(Path(__file__).parent.resolve())
project_root = str(Path(__file__).parent.parent.resolve())
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")
load_dotenv(Path(__file__).parent / ".env")

from auth import (
    create_user,
    authenticate_user,
    create_session,
    invalidate_session,
    require_authenticated_user,
    set_session_cookies,
    clear_session_cookies,
    SESSION_COOKIE_NAME
)
from github_client import (
    validate_repository,
    fetch_full_repository_data,
    fetch_repository_contributors,
    fetch_repository_collaborators,
    fetch_repository_invitations
)
from analytics import apply_known_repository_people, calculate_analytics
from database import (
    DB_PATH,
    save_repository_config,
    get_repository_config,
    get_internal_repo_credentials,
    update_repository_sync_snapshot,
    get_latest_analytics,
    save_team_tasks,
    get_team_tasks,
    # Team Management
    create_team,
    update_team,
    get_team_by_id,
    get_user_teams,
    get_team_members,
    get_team_membership,
    update_member_role,
    update_member_github_username,
    remove_team_member,
    # Invitations
    create_team_invitation,
    get_team_invitations,
    cancel_team_invitation,
    resend_team_invitation,
    get_invitation_by_token,
    accept_invitation_by_token,
    get_user_pending_invitations,
    respond_to_invitation,
    get_repository_raw_data,
    # Task Management
    create_task,
    get_team_tasks_db,
    get_task_by_id,
    update_task_db,
    delete_task_db,
    # Notifications, Activities & Discussions
    create_notification,
    get_user_notifications,
    mark_notification_read,
    mark_all_notifications_read,
    check_and_generate_deadline_notifications,
    log_task_activity,
    get_team_activities,
    add_task_comment,
    get_task_comments,
    get_db_connection
)

app = FastAPI(
    title="SquadSync API",
    description="Dynamic Backend API for SquadSync Collaboration, Workload & Risk Platform",
    version="2.1.0"
)

# Configure CORS with regex to allow local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Request / Response Models -----------------

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=150)
    password: str = Field(..., min_length=8)
    role: Optional[str] = "Student Contributor"

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=150)
    password: str
    remember_me: Optional[bool] = False

class CreateTeamRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = ""

class UpdateTeamRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = ""

class InviteMemberRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=150)
    role: Optional[str] = "developer"

class RespondInvitationRequest(BaseModel):
    action: str = Field(..., description="Action must be 'accept' or 'decline'")

class UpdateRoleRequest(BaseModel):
    role: str = Field(..., description="Role must be team_lead, developer, reviewer, or viewer")

class UpdateGithubMappingRequest(BaseModel):
    github_username: Optional[str] = Field(default="", max_length=100)

class CreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = ""
    assignee_id: Optional[str] = None
    assignee_github_username: Optional[str] = Field(default=None, max_length=100)
    assignee_name: Optional[str] = Field(default=None, max_length=150)
    priority: Optional[str] = "Medium"
    status: Optional[str] = "Todo"
    story_points: Optional[float] = 1.0
    estimated_hours: Optional[float] = 0.0
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    labels: Optional[str] = ""
    blocker_reason: Optional[str] = ""

class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    story_points: Optional[float] = None
    estimated_hours: Optional[float] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    labels: Optional[str] = None
    blocker_reason: Optional[str] = None

class UpdateTaskStatusRequest(BaseModel):
    status: str
    blocker_reason: Optional[str] = None

class TaskCommentRequest(BaseModel):
    comment: str = Field(..., min_length=1, max_length=2000)
    is_blocker: Optional[bool] = False

class ConnectRepoRequest(BaseModel):
    repo_owner: str = Field(..., min_length=1, max_length=100)
    repo_name: str = Field(..., min_length=1, max_length=100)
    branch: Optional[str] = "main"
    github_token: Optional[str] = None

# ----------------- Authorization Guards -----------------

def check_team_access(team_id: str, user_id: str) -> Dict[str, Any]:
    """Ensures that the user belongs to the specified team workspace."""
    membership = get_team_membership(team_id, user_id)
    if not membership:
        # Check if team exists
        team = get_team_by_id(team_id)
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team '{team_id}' not found."
            )
        # Check if user is the creator
        if team.get("created_by") == user_id:
            return {"role": "team_lead", "team_id": team_id, "user_id": user_id}
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this team workspace."
        )
    return dict(membership)

def check_team_lead(team_id: str, user_id: str) -> Dict[str, Any]:
    """Ensures that the user has Team Lead authorization for administrative actions."""
    membership = check_team_access(team_id, user_id)
    team = get_team_by_id(team_id)
    is_creator = team and team.get("created_by") == user_id
    if membership.get("role") != "team_lead" and not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Team Lead authorization required for this action."
        )
    return membership

# ----------------- Root & Health -----------------

@app.get("/")
def api_root():
    return {
        "service": "SquadSync Collaboration Intelligence API",
        "version": "2.1.0",
        "status": "online",
        "docs_url": "/docs",
        "health_url": "/api/v1/health"
    }

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "service": "squadsync-backend",
        "timestamp": int(time.time()),
        "auth_enabled": True,
        "github_integration_enabled": True,
        "multi_tenant_teams_enabled": True
    }

# ----------------- Auth Endpoints -----------------

@app.post("/api/v1/auth/register", status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, response: Response):
    user = create_user(
        name=req.name,
        email=req.email,
        password=req.password,
        role=req.role or "Student Contributor"
    )
    token, csrf_token, expires_in = create_session(user["id"], remember_me=False)
    set_session_cookies(response, token, csrf_token, expires_in)

    return {
        "user": user,
        "token": token,
        "csrf_token": csrf_token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "message": "Account created successfully"
    }

@app.post("/api/v1/auth/login")
def login(req: LoginRequest, request: Request, response: Response):
    client_ip = request.client.host if request.client else "127.0.0.1"
    user = authenticate_user(req.email, req.password, client_ip=client_ip)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials."
        )

    token, csrf_token, expires_in = create_session(user["id"], remember_me=req.remember_me)
    set_session_cookies(response, token, csrf_token, expires_in)

    return {
        "user": user,
        "token": token,
        "csrf_token": csrf_token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "message": f"Welcome back, {user['name']}!"
    }

@app.get("/api/v1/auth/me")
def get_me(user: Dict[str, Any] = Depends(require_authenticated_user)):
    return {
        "user": user,
        "authenticated": True
    }

@app.post("/api/v1/auth/logout")
def logout(request: Request, response: Response, authorization: Optional[str] = Header(None)):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    if token:
        invalidate_session(token)

    clear_session_cookies(response)
    return {"success": True, "message": "Successfully signed out"}

# ----------------- Helper: Recalculate & Synchronize -----------------

def _recalculate_analytics_with_cached_github(user_id: str, team_id: str):
    """Recompute analytics when tasks or mappings change, using cached raw GitHub data if available."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT raw_data_json FROM repositories WHERE team_id = ?", (team_id,))
        row = c.fetchone()
        conn.close()

        raw_github = json.loads(row["raw_data_json"]) if (row and row["raw_data_json"]) else {
            "repository": {}, "contributors": [], "commits": [], "branches": [], "pull_requests": [], "branch_comparisons": {}, "issues": []
        }
        raw_github = apply_known_repository_people(raw_github)

        custom_tasks = get_team_tasks(team_id)
        team_members = get_team_members(team_id)

        analytics_result = calculate_analytics(
            github_data=raw_github,
            custom_tasks=custom_tasks,
            team_members=team_members
        )

        update_repository_sync_snapshot(
            user_id=user_id,
            team_id=team_id,
            raw_data=raw_github,
            analytics_data=analytics_result,
            sync_status="success",
            sync_message="Analytics recalibrated with latest tasks and member data"
        )
    except Exception:
        pass

def _sync_repository_internal(user_id: str, team_id: str) -> Dict[str, Any]:
    """Helper to fetch and calculate analytics for a team's configured repository."""
    creds = get_internal_repo_credentials(user_id, team_id)
    if not creds:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No GitHub repository configured for team '{team_id}'. Please configure a repository in Data Sources."
        )

    owner = creds["repo_owner"]
    repo = creds["repo_name"]
    branch = creds["default_branch"]
    token = creds["github_token"]

    # 1. Fetch live data from GitHub
    try:
        raw_github = fetch_full_repository_data(owner=owner, repo=repo, default_branch=branch, token=token)
    except Exception as e:
        err_msg = str(e)
        update_repository_sync_snapshot(
            user_id=user_id,
            team_id=team_id,
            raw_data={},
            analytics_data={},
            sync_status="error",
            sync_message=f"Sync failed: {err_msg}"
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch data from GitHub: {err_msg}"
        )

    raw_github = apply_known_repository_people(raw_github)

    # 2. Retrieve database tasks & official team members
    custom_tasks = get_team_tasks(team_id)
    team_members = get_team_members(team_id)

    # 3. Calculate dynamic analytics
    analytics_result = calculate_analytics(
        github_data=raw_github,
        custom_tasks=custom_tasks,
        team_members=team_members
    )

    # 4. Update snapshot in SQLite
    update_repository_sync_snapshot(
        user_id=user_id,
        team_id=team_id,
        raw_data=raw_github,
        analytics_data=analytics_result,
        sync_status="success",
        sync_message="Data synchronized successfully"
    )

    return analytics_result

# ----------------- FEATURE 1: Team Management -----------------

@app.get("/api/v1/teams")
def get_teams(user: Dict[str, Any] = Depends(require_authenticated_user)):
    user_id = user["id"]
    teams_list = get_user_teams(user_id)
    return {"data": teams_list}

@app.post("/api/v1/teams", status_code=status.HTTP_201_CREATED)
def create_new_team(req: CreateTeamRequest, user: Dict[str, Any] = Depends(require_authenticated_user)):
    team = create_team(
        user_id=user["id"],
        name=req.name,
        description=req.description or ""
    )
    return {
        "success": True,
        "message": f"Team '{team['name']}' created successfully.",
        "data": team
    }

@app.get("/api/v1/teams/{team_id}")
def get_team_details(team_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    check_team_access(team_id, user["id"])
    team = get_team_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    members = get_team_members(team_id)
    config = get_repository_config(user["id"], team_id)
    return {
        "data": {
            **team,
            "members": members,
            "repository": config["repository"] if config else None,
            "is_configured": bool(config)
        }
    }

@app.put("/api/v1/teams/{team_id}")
def update_team_details(team_id: str, req: UpdateTeamRequest, user: Dict[str, Any] = Depends(require_authenticated_user)):
    check_team_lead(team_id, user["id"])
    updated = update_team(team_id, name=req.name, description=req.description)
    if not updated:
        raise HTTPException(status_code=404, detail="Team not found")
    return {
        "success": True,
        "message": "Team details updated successfully.",
        "data": updated
    }

@app.get("/api/v1/teams/{team_id}/members")
def list_team_members(team_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    check_team_access(team_id, user["id"])
    members = get_team_members(team_id)
    return {"data": members}

@app.put("/api/v1/teams/{team_id}/members/{member_id}/role")
def change_member_role(team_id: str, member_id: str, req: UpdateRoleRequest, user: Dict[str, Any] = Depends(require_authenticated_user)):
    check_team_lead(team_id, user["id"])
    if req.role not in ["team_lead", "developer", "reviewer", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role specified.")
    update_member_role(team_id, member_id, req.role)
    return {
        "success": True,
        "message": f"Updated member role to {req.role}."
    }

@app.put("/api/v1/teams/{team_id}/members/{member_id}/github")
def map_member_github_username(
    team_id: str,
    member_id: str,
    req: UpdateGithubMappingRequest,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    # Allow team lead or self
    if user["id"] != member_id:
        check_team_lead(team_id, user["id"])
    else:
        check_team_access(team_id, user["id"])

    gh_clean = (req.github_username or "").strip().lstrip("@")
    try:
        update_member_github_username(team_id, member_id, gh_clean)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Trigger analytics recalibration with mapped contributor
    _recalculate_analytics_with_cached_github(user["id"], team_id)

    action_text = f"Mapped team member to GitHub user '@{gh_clean}' successfully." if gh_clean else "Unmapped GitHub username successfully."
    return {
        "success": True,
        "message": action_text,
        "github_username": gh_clean
    }

@app.delete("/api/v1/teams/{team_id}/members/{member_id}/github")
def unmap_member_github_username(
    team_id: str,
    member_id: str,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    if user["id"] != member_id:
        check_team_lead(team_id, user["id"])
    else:
        check_team_access(team_id, user["id"])

    update_member_github_username(team_id, member_id, "")
    _recalculate_analytics_with_cached_github(user["id"], team_id)

    return {
        "success": True,
        "message": "Unmapped GitHub username successfully.",
        "github_username": ""
    }

@app.delete("/api/v1/teams/{team_id}/members/{member_id}")
def remove_member(team_id: str, member_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    check_team_lead(team_id, user["id"])
    if user["id"] == member_id:
        raise HTTPException(status_code=400, detail="Team leads cannot remove themselves. Reassign team lead role first.")
    remove_team_member(team_id, member_id)
    _recalculate_analytics_with_cached_github(user["id"], team_id)
    return {
        "success": True,
        "message": "Team member removed successfully."
    }

# ----------------- Invitations -----------------

@app.post("/api/v1/teams/{team_id}/invitations", status_code=status.HTTP_201_CREATED)
def invite_member_to_team(team_id: str, req: InviteMemberRequest, user: Dict[str, Any] = Depends(require_authenticated_user)):
    check_team_lead(team_id, user["id"])
    try:
        invitation = create_team_invitation(
            team_id=team_id,
            invited_by=user["id"],
            email=req.email,
            role=req.role or "developer"
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {
        "success": True,
        "message": f"Invitation generated for {req.email}. (Email delivery: Development mode — share the link or invitee can accept from their account)",
        "data": invitation,
        "development_url": f"/invitations/accept?token={invitation['invitation_token']}"
    }

@app.get("/api/v1/teams/{team_id}/invitations")
def list_team_invitations(team_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    check_team_access(team_id, user["id"])
    invitations = get_team_invitations(team_id)
    return {"data": invitations}

@app.post("/api/v1/teams/{team_id}/invitations/{invitation_id}/cancel")
def cancel_invitation_route(team_id: str, invitation_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    check_team_lead(team_id, user["id"])
    try:
        res = cancel_team_invitation(team_id, invitation_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/api/v1/teams/{team_id}/invitations/{invitation_id}/resend")
def resend_invitation_route(team_id: str, invitation_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    check_team_lead(team_id, user["id"])
    try:
        res = resend_team_invitation(team_id, invitation_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/api/v1/invitations/token/{token}")
def get_invitation_details_by_token(token: str):
    inv = get_invitation_by_token(token)
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation token not found or has been removed.")
    # Strip sensitive token before returning details
    return {
        "data": {
            "id": inv["id"],
            "team_id": inv["team_id"],
            "team_name": inv.get("team_name"),
            "email": inv["email"],
            "role": inv["role"],
            "status": inv["status"],
            "inviter_name": inv.get("inviter_name"),
            "created_at": inv["created_at"],
            "expires_at": inv["expires_at"]
        }
    }

@app.post("/api/v1/invitations/token/{token}/accept")
def accept_by_token_route(token: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    try:
        res = accept_invitation_by_token(token, user["id"], user["email"])
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/api/v1/invitations/pending")
def list_my_pending_invitations(user: Dict[str, Any] = Depends(require_authenticated_user)):
    invitations = get_user_pending_invitations(user["email"])
    return {"data": invitations}

@app.post("/api/v1/invitations/{invitation_id}/respond")
def respond_invitation_route(invitation_id: str, req: RespondInvitationRequest, user: Dict[str, Any] = Depends(require_authenticated_user)):
    if req.action not in ["accept", "decline"]:
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'decline'.")
    try:
        res = respond_to_invitation(
            invitation_id=invitation_id,
            user_id=user["id"],
            user_email=user["email"],
            action=req.action
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ----------------- Contributor Mapping & Discovery -----------------

@app.get("/api/v1/teams/{team_id}/contributor-mapping")
def get_contributor_mapping(team_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    check_team_access(team_id, user["id"])
    members = get_team_members(team_id)
    invitations = get_team_invitations(team_id)
    config = get_repository_config(user["id"], team_id)

    raw_data = apply_known_repository_people(get_repository_raw_data(team_id) or {})
    contributors_raw = raw_data.get("contributors", [])
    collaborators_raw = raw_data.get("collaborators", [])
    github_invitations_raw = raw_data.get("github_invitations", [])

    # Map lookups
    member_by_gh = {
        (m["github_username"] or "").lower(): m for m in members if m.get("github_username")
    }

    # Enhance GitHub contributors with mapping status
    mapped_contributors = []
    unmapped_contributors = []
    for c in contributors_raw:
        login = (c.get("login") or "").strip()
        login_lower = login.lower()
        is_mapped = login_lower in member_by_gh
        mapped_m = member_by_gh.get(login_lower)

        item = {
            "id": c.get("id"),
            "login": login,
            "name": c.get("name"),
            "avatar_url": c.get("avatar_url") or f"https://avatars.githubusercontent.com/{login}",
            "html_url": c.get("html_url") or f"https://github.com/{login}",
            "contributions": c.get("contributions"),
            "type": c.get("type", "User"),
            "source": c.get("source"),
            "is_mapped": is_mapped,
            "mapped_member_id": mapped_m["user_id"] if mapped_m else None,
            "mapped_member_name": mapped_m["name"] if mapped_m else None,
            "mapped_member_role": mapped_m["role"] if mapped_m else None
        }
        if is_mapped:
            mapped_contributors.append(item)
        else:
            unmapped_contributors.append(item)

    # Enhance GitHub collaborators with mapping status
    mapped_collaborators = []
    for cb in collaborators_raw:
        login = (cb.get("login") or "").strip()
        login_lower = login.lower()
        is_mapped = login_lower in member_by_gh
        mapped_m = member_by_gh.get(login_lower)

        mapped_collaborators.append({
            "id": cb.get("id"),
            "login": login,
            "name": cb.get("name"),
            "avatar_url": cb.get("avatar_url") or f"https://avatars.githubusercontent.com/{login}",
            "html_url": cb.get("html_url") or f"https://github.com/{login}",
            "type": cb.get("type", "User"),
            "permissions": cb.get("permissions", {}),
            "role_name": cb.get("role_name", "write"),
            "source": cb.get("source"),
            "is_mapped": is_mapped,
            "mapped_member_id": mapped_m["user_id"] if mapped_m else None,
            "mapped_member_name": mapped_m["name"] if mapped_m else None,
            "mapped_member_role": mapped_m["role"] if mapped_m else None
        })

    mapped_github_invitations = []
    for invitation in github_invitations_raw:
        login = (invitation.get("invitee_login") or "").strip()
        mapped_member = member_by_gh.get(login.lower()) if login else None
        mapped_github_invitations.append({
            **invitation,
            "invitee_html_url": invitation.get("invitee_html_url") or (
                f"https://github.com/{login}" if login else None
            ),
            "is_mapped": mapped_member is not None,
            "mapped_member_id": mapped_member["user_id"] if mapped_member else None,
            "mapped_member_name": mapped_member["name"] if mapped_member else None,
            "mapped_member_role": mapped_member["role"] if mapped_member else None
        })

    # Team members with mapping status
    unmapped_members = [m for m in members if not m.get("github_username")]

    return {
        "data": {
            "team_id": team_id,
            "repository": config["repository"] if config else None,
            "is_configured": bool(config),
            "sync_status": config.get("sync_status") if config else "not_configured",
            "last_synced_at": config.get("last_synced_at") if config else None,
            "team_members": members,
            "github_contributors": mapped_contributors + unmapped_contributors,
            "contributors_warning": raw_data.get("contributors_warning"),
            "collaborators_warning": raw_data.get("collaborators_warning"),
            "unmapped_contributors": unmapped_contributors,
            "unmapped_members": unmapped_members,
            "github_collaborators": mapped_collaborators,
            "collaborators_warning": raw_data.get("collaborators_warning"),
            "github_invitations": mapped_github_invitations,
            "github_invitations_warning": raw_data.get("github_invitations_warning"),
            "team_invitations": invitations,
            "summary": {
                "total_team_members": len(members),
                "mapped_team_members": len(members) - len(unmapped_members),
                "unmapped_team_members": len(unmapped_members),
                "total_github_contributors": len(contributors_raw),
                "mapped_github_contributors": len(mapped_contributors),
                "unmapped_github_contributors": len(unmapped_contributors),
                "total_collaborators": len(collaborators_raw),
                "pending_github_invitations": len(github_invitations_raw),
                "pending_team_invitations": len([i for i in invitations if i.get("status") == "pending"])
            }
        }
    }

# ----------------- FEATURE 2: Task Management -----------------

@app.get("/api/v1/teams/{team_id}/tasks")
def list_tasks(
    team_id: str,
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assignee_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    tasks_list = get_team_tasks_db(team_id, status=status, priority=priority, assignee_id=assignee_id)
    return {"data": tasks_list}

@app.post("/api/v1/teams/{team_id}/tasks", status_code=status.HTTP_201_CREATED)
def create_new_task(
    team_id: str,
    req: CreateTaskRequest,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    assignee_github_username = (req.assignee_github_username or "").strip().lstrip("@")
    if assignee_github_username:
        raw_data = apply_known_repository_people(get_repository_raw_data(team_id) or {})
        valid_logins = {
            (person.get("login") or "").strip().lower()
            for person in raw_data.get("contributors", []) + raw_data.get("collaborators", [])
            if person.get("login")
        }
        valid_logins.update(
            (person.get("invitee_login") or "").strip().lower()
            for person in raw_data.get("github_invitations", [])
            if person.get("invitee_login")
        )
        if valid_logins and assignee_github_username.lower() not in valid_logins:
            raise HTTPException(
                status_code=400,
                detail="GitHub assignee is not listed as a repository contributor, collaborator, or invitee."
            )

    task = create_task(
        team_id=team_id,
        created_by=user["id"],
        title=req.title,
        description=req.description or "",
        assignee_id=req.assignee_id,
        assignee_github_username=assignee_github_username or None,
        assignee_name=req.assignee_name,
        priority=req.priority or "Medium",
        status=req.status or "Todo",
        story_points=req.story_points or 1.0,
        estimated_hours=req.estimated_hours or 0.0,
        start_date=req.start_date,
        due_date=req.due_date,
        labels=req.labels or "",
        blocker_reason=req.blocker_reason or ""
    )

    assignee_display = task.get("assignee_name") or task.get("assignee_github_username")
    action_text = f"{user['name']} assigned a task to {assignee_display}." if assignee_display else f"{user['name']} created task '{task['title']}'."
    log_task_activity(
        team_id=team_id,
        task_id=task["id"],
        user_id=user["id"],
        user_name=user["name"],
        task_title=task["title"],
        action="created",
        details=action_text
    )

    if task.get("assignee_id") and task["assignee_id"] != user["id"]:
        create_notification(
            user_id=task["assignee_id"],
            team_id=team_id,
            notif_type="task_assigned",
            title="New Task Assigned",
            message=f"New task assigned to you: {task['title']}.",
            task_id=task["id"]
        )

    # Recalibrate analytics with new task
    _recalculate_analytics_with_cached_github(user["id"], team_id)

    return {
        "success": True,
        "message": f"Task '{task['task_key']}' created successfully.",
        "data": task
    }

@app.get("/api/v1/teams/{team_id}/tasks/{task_id}")
def get_task(team_id: str, task_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    check_team_access(team_id, user["id"])
    task = get_task_by_id(task_id)
    if not task or task.get("team_id") != team_id:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"data": task}

@app.put("/api/v1/teams/{team_id}/tasks/{task_id}")
def update_task_endpoint(
    team_id: str,
    task_id: str,
    req: UpdateTaskRequest,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    updated = update_task_db(
        task_id=task_id,
        team_id=team_id,
        title=req.title,
        description=req.description,
        assignee_id=req.assignee_id,
        priority=req.priority,
        status=req.status,
        story_points=req.story_points,
        estimated_hours=req.estimated_hours,
        start_date=req.start_date,
        due_date=req.due_date,
        labels=req.labels,
        blocker_reason=req.blocker_reason
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")

    prev = updated.get("_previous", {})

    if req.assignee_id is not None and req.assignee_id != prev.get("assignee_id"):
        new_assignee_name = updated.get("assignee_name") or "unassigned"
        log_task_activity(
            team_id=team_id,
            task_id=task_id,
            user_id=user["id"],
            user_name=user["name"],
            task_title=updated["title"],
            action="reassigned",
            details=f"{user['name']} reassigned '{updated['title']}' to {new_assignee_name}.",
            previous_value=prev.get("assignee_name", ""),
            new_value=new_assignee_name
        )
        if updated.get("assignee_id") and updated["assignee_id"] != user["id"]:
            create_notification(
                user_id=updated["assignee_id"],
                team_id=team_id,
                notif_type="task_reassigned",
                title="Task Reassigned",
                message=f"Task reassigned to you: {updated['title']}.",
                task_id=task_id
            )

    if req.status is not None and req.status != prev.get("status"):
        log_task_activity(
            team_id=team_id,
            task_id=task_id,
            user_id=user["id"],
            user_name=user["name"],
            task_title=updated["title"],
            action="status_changed",
            details=f"{user['name']} moved '{updated['title']}' to {req.status}.",
            previous_value=prev.get("status", ""),
            new_value=req.status
        )
        if req.status.lower() in ["completed", "done"]:
            creator_id = updated.get("created_by")
            if creator_id and creator_id != user["id"]:
                create_notification(
                    user_id=creator_id,
                    team_id=team_id,
                    notif_type="task_completed",
                    title="Task Completed",
                    message=f"{user['name']} marked '{updated['title']}' as completed.",
                    task_id=task_id
                )

    if req.priority is not None and req.priority != prev.get("priority"):
        log_task_activity(
            team_id=team_id,
            task_id=task_id,
            user_id=user["id"],
            user_name=user["name"],
            task_title=updated["title"],
            action="priority_changed",
            details=f"{user['name']} changed the task priority to {req.priority}.",
            previous_value=prev.get("priority", ""),
            new_value=req.priority
        )

    _recalculate_analytics_with_cached_github(user["id"], team_id)

    return {
        "success": True,
        "message": "Task updated successfully.",
        "data": updated
    }

@app.patch("/api/v1/teams/{team_id}/tasks/{task_id}/status")
def update_task_status_endpoint(
    team_id: str,
    task_id: str,
    req: UpdateTaskStatusRequest,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    updated = update_task_db(
        task_id=task_id,
        team_id=team_id,
        status=req.status,
        blocker_reason=req.blocker_reason
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")

    prev = updated.get("_previous", {})
    action_text = f"{user['name']} moved '{updated['title']}' to {req.status}."
    if req.status.lower() in ["blocked"] and req.blocker_reason:
        action_text = f"{user['name']} marked '{updated['title']}' as Blocked: {req.blocker_reason}"

    log_task_activity(
        team_id=team_id,
        task_id=task_id,
        user_id=user["id"],
        user_name=user["name"],
        task_title=updated["title"],
        action="status_change",
        details=action_text,
        previous_value=prev.get("status", ""),
        new_value=req.status
    )

    if req.status.lower() in ["completed", "done"]:
        creator_id = updated.get("created_by")
        if creator_id and creator_id != user["id"]:
            create_notification(
                user_id=creator_id,
                team_id=team_id,
                notif_type="task_completed",
                title="Task Completed",
                message=f"{user['name']} marked '{updated['title']}' as completed.",
                task_id=task_id
            )

    _recalculate_analytics_with_cached_github(user["id"], team_id)

    return {
        "success": True,
        "message": f"Task status updated to {req.status}.",
        "data": updated
    }

@app.delete("/api/v1/teams/{team_id}/tasks/{task_id}")
def delete_task_endpoint(team_id: str, task_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    check_team_access(team_id, user["id"])
    task = get_task_by_id(task_id)
    title = task["title"] if task else task_id
    deleted = delete_task_db(task_id, team_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")

    log_task_activity(
        team_id=team_id,
        task_id=task_id,
        user_id=user["id"],
        user_name=user["name"],
        task_title=title,
        action="deleted",
        details=f"{user['name']} deleted task '{title}'."
    )

    _recalculate_analytics_with_cached_github(user["id"], team_id)

    return {"success": True, "message": "Task deleted successfully."}

# ----------------- Notifications Endpoints -----------------

@app.get("/api/v1/teams/{team_id}/notifications")
def list_team_notifications(
    team_id: str,
    unread_only: bool = Query(False),
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    check_and_generate_deadline_notifications(team_id)
    res = get_user_notifications(user["id"], team_id=team_id, unread_only=unread_only)
    return {"data": res["notifications"], "unread_count": res["unread_count"]}

@app.patch("/api/v1/teams/{team_id}/notifications/{notification_id}/read")
@app.post("/api/v1/teams/{team_id}/notifications/{notification_id}/read")
@app.patch("/api/v1/notifications/{notification_id}/read")
@app.post("/api/v1/notifications/{notification_id}/read")
def read_notification(
    notification_id: str,
    team_id: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    success = mark_notification_read(notification_id, user["id"])
    return {"success": success}

@app.post("/api/v1/teams/{team_id}/notifications/read-all")
def read_all_notifications_endpoint(
    team_id: str,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    count = mark_all_notifications_read(user["id"], team_id=team_id)
    return {"success": True, "marked_count": count}

# ----------------- Activity Feed Endpoints -----------------

@app.get("/api/v1/teams/{team_id}/activities")
def list_team_activities(
    team_id: str,
    task_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    activities = get_team_activities(team_id, task_id=task_id)
    return {"data": activities}

# ----------------- Task Comments & Blockers Endpoints -----------------

@app.get("/api/v1/teams/{team_id}/tasks/{task_id}/comments")
def list_task_comments(
    team_id: str,
    task_id: str,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    comments = get_task_comments(task_id)
    return {"data": comments}

@app.post("/api/v1/teams/{team_id}/tasks/{task_id}/comments", status_code=status.HTTP_201_CREATED)
def post_task_comment(
    team_id: str,
    task_id: str,
    req: TaskCommentRequest,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    task = get_task_by_id(task_id)
    if not task or task.get("team_id") != team_id:
        raise HTTPException(status_code=404, detail="Task not found in this team.")

    comment_obj = add_task_comment(
        task_id=task_id,
        team_id=team_id,
        user_id=user["id"],
        user_name=user["name"],
        comment=req.comment,
        is_blocker=req.is_blocker or False
    )

    action = "reported blocker" if req.is_blocker else "commented"
    action_text = f"{user['name']} reported a blocker on '{task['title']}': {req.comment}" if req.is_blocker else f"{user['name']} commented on '{task['title']}'."
    log_task_activity(
        team_id=team_id,
        task_id=task_id,
        user_id=user["id"],
        user_name=user["name"],
        task_title=task["title"],
        action=action,
        details=action_text
    )

    if req.is_blocker:
        creator_id = task.get("created_by")
        if creator_id and creator_id != user["id"]:
            create_notification(
                user_id=creator_id,
                team_id=team_id,
                notif_type="task_blocked",
                title="Task Blocked",
                message=f"Blocker reported on '{task['title']}': {req.comment}",
                task_id=task_id
            )
        _recalculate_analytics_with_cached_github(user["id"], team_id)

    return {"success": True, "data": comment_obj}

# ----------------- FEATURE 3 & 4: GitHub Integration -----------------

@app.post("/api/v1/teams/{team_id}/github")
def connect_github(
    team_id: str,
    req: ConnectRepoRequest,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_lead(team_id, user["id"])
    owner = req.repo_owner.strip()
    repo = req.repo_name.strip()
    token = req.github_token.strip() if req.github_token else None
    if not token:
        existing_credentials = get_internal_repo_credentials(user["id"], team_id)
        token = existing_credentials.get("github_token") if existing_credentials else None

    # Validate repository existence & accessibility via GitHub API
    is_valid, repo_meta, err_msg = validate_repository(owner=owner, repo=repo, token=token)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg or f"Cannot access repository '{owner}/{repo}'. Please check the owner/name and token permissions."
        )

    default_branch = req.branch.strip() or repo_meta.get("default_branch", "main")

    # Save to SQLite
    saved = save_repository_config(
        user_id=user["id"],
        team_id=team_id,
        repo_owner=owner,
        repo_name=repo,
        branch=default_branch,
        github_token=token
    )

    # Trigger initial data synchronization
    try:
        _sync_repository_internal(user["id"], team_id)
        sync_msg = "Repository connected and initial data synchronized successfully."
    except Exception as e:
        sync_msg = f"Repository connected, but initial sync had a warning: {str(e)}"

    return {
        "success": True,
        "message": sync_msg,
        "repository": f"{owner}/{repo}",
        "default_branch": default_branch,
        "has_token": saved["has_token"]
    }

@app.get("/api/v1/teams/{team_id}/repo-info")
def get_repo_info(
    team_id: str,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    config = get_repository_config(user["id"], team_id)
    if not config:
        return {
            "configured": False,
            "team_id": team_id,
            "message": "No repository configured yet."
        }
    return {
        "configured": True,
        "data": config
    }

@app.post("/api/v1/teams/{team_id}/sync")
def trigger_sync(
    team_id: str,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    analytics = _sync_repository_internal(user["id"], team_id)
    raw_data = apply_known_repository_people(get_repository_raw_data(team_id) or {})
    return {
        "success": True,
        "message": "Data synchronization completed successfully",
        "timestamp": analytics.get("last_updated"),
        "records_processed": {
            "team_members": analytics["metrics"]["total_team_members"],
            "github_contributors": len(raw_data.get("contributors", [])),
            "github_collaborators": len(raw_data.get("collaborators", [])),
            "github_invitations": len(raw_data.get("github_invitations", [])),
            "tasks": analytics["metrics"]["total_tasks"],
            "pull_requests": analytics["reviews_data"]["total_pull_requests"],
            "detected_risks": len(analytics["risks_ledger"])
        }
    }

@app.get("/api/v1/teams/{team_id}/sync-status")
def get_sync_status(
    team_id: str,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    config = get_repository_config(user["id"], team_id)
    analytics = get_latest_analytics(user["id"], team_id)

    if not config:
        return {
            "data": {
                "team_id": team_id,
                "repository": "Not Configured",
                "default_branch": "main",
                "connection_type": "GitHub REST API",
                "last_synced_at": None,
                "status": "not_configured",
                "sync_duration_seconds": 0.0,
                "records_processed": {"commits": 0, "pull_requests": 0, "reviews": 0, "tasks_imported": 0},
                "validation_errors": ["No repository connected. Configure a repository in the form above."]
            }
        }

    raw_data = apply_known_repository_people(get_repository_raw_data(team_id) or {})
    records = {
        "team_members": (
            analytics["metrics"].get(
                "total_team_members",
                analytics["metrics"].get("total_members", len(get_team_members(team_id)))
            )
            if analytics else len(get_team_members(team_id))
        ),
        "github_contributors": len(raw_data.get("contributors", [])),
        "github_collaborators": len(raw_data.get("collaborators", [])),
        "github_invitations": len(raw_data.get("github_invitations", [])),
        "pull_requests": analytics["reviews_data"]["total_pull_requests"] if analytics else 0,
        "tasks": analytics["metrics"]["total_tasks"] if analytics else 0
    }
    validation_errors = []
    if config["sync_status"] != "success":
        validation_errors.append(config.get("sync_message", "Sync error"))
    for warning_key in (
        "contributors_warning",
        "collaborators_warning",
        "github_invitations_warning"
    ):
        warning = raw_data.get(warning_key)
        if warning:
            validation_errors.append(warning)

    return {
        "data": {
            "team_id": team_id,
            "repository": config["repository"],
            "default_branch": config["default_branch"],
            "connection_type": "GitHub REST API (Secure Backend)",
            "last_synced_at": config["last_synced_at"],
            "status": config["sync_status"],
            "sync_duration_seconds": 2.1,
            "records_processed": records,
            "validation_errors": validation_errors
        }
    }

# ----------------- FEATURE 5, 6, 7, 8, 9: Analytics Endpoints -----------------

def _get_or_sync_analytics(user_id: str, team_id: str) -> Dict[str, Any]:
    cached = get_latest_analytics(user_id, team_id)
    if cached:
        return cached

    config = get_repository_config(user_id, team_id)
    if config:
        try:
            return _sync_repository_internal(user_id, team_id)
        except Exception:
            pass

    raw_data = apply_known_repository_people(get_repository_raw_data(team_id) or {})
    tasks = get_team_tasks(team_id)
    members = get_team_members(team_id)

    # If not configured or offline, compute real analytics directly from tasks and team members
    return calculate_analytics(
        github_data=raw_data or {},
        custom_tasks=tasks,
        team_members=members
    )

@app.get("/api/v1/teams/{team_id}/dashboard")
def get_dashboard(
    team_id: str,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    analytics = _get_or_sync_analytics(user["id"], team_id)
    team = get_team_by_id(team_id)
    team_name = team["name"] if team else f"Workspace — {analytics['repository']}"
    contributor_mapping = get_contributor_mapping(team_id, user)["data"]
    metrics = {
        **analytics["metrics"],
        "total_team_members": analytics["metrics"].get(
            "total_team_members",
            analytics["metrics"].get("total_members", len(get_team_members(team_id)))
        ),
        "total_github_contributors": contributor_mapping["summary"]["total_github_contributors"],
        "total_github_collaborators": contributor_mapping["summary"]["total_collaborators"],
        "total_github_invitations": contributor_mapping["summary"]["pending_github_invitations"]
    }

    return {
        "data": {
            "team_id": team_id,
            "team_name": team_name,
            "repository": analytics["repository"],
            "is_demo": False,
            "last_updated": analytics["last_updated"],
            "overall_risk_level": analytics["overall_risk_level"],
            "onboarding_checklist": analytics.get("onboarding_checklist"),
            "unmapped_contributors": analytics.get("unmapped_contributors", []),
            "github_contributors": contributor_mapping["github_contributors"],
            "github_contributors_warning": contributor_mapping.get("contributors_warning"),
            "github_collaborators": contributor_mapping["github_collaborators"],
            "github_collaborators_warning": contributor_mapping.get("collaborators_warning"),
            "github_invitations": contributor_mapping["github_invitations"],
            "github_invitations_warning": contributor_mapping.get("github_invitations_warning"),
            "metrics": metrics,
            "workload_summary": analytics["workload_summary"],
            "review_participation_summary": analytics["review_participation_summary"],
            "integration_risk_indicators": analytics["integration_risk_indicators"],
            "recent_warnings": analytics["recent_warnings"]
        }
    }

@app.get("/api/v1/teams/{team_id}/workload")
def get_workload(
    team_id: str,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    analytics = _get_or_sync_analytics(user["id"], team_id)
    return {
        "data": {
            "team_id": team_id,
            **analytics["workload_data"]
        }
    }

@app.get("/api/v1/teams/{team_id}/reviews")
def get_reviews(
    team_id: str,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    analytics = _get_or_sync_analytics(user["id"], team_id)
    return {
        "data": {
            "team_id": team_id,
            **analytics["reviews_data"]
        }
    }

@app.get("/api/v1/teams/{team_id}/integration-risks")
def get_integration_risks(
    team_id: str,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    analytics = _get_or_sync_analytics(user["id"], team_id)
    return {
        "data": {
            "team_id": team_id,
            **analytics["integration_risks_data"]
        }
    }

@app.get("/api/v1/teams/{team_id}/risks")
def get_risks(
    team_id: str,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    analytics = _get_or_sync_analytics(user["id"], team_id)
    return {
        "data": analytics["risks_ledger"]
    }

@app.get("/api/v1/teams/{team_id}/recommendations")
def get_recommendations(
    team_id: str,
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    analytics = _get_or_sync_analytics(user["id"], team_id)
    return {
        "data": analytics["recent_warnings"]
    }

# ----------------- Task Ingestion (CSV) -----------------

@app.post("/api/v1/teams/{team_id}/tasks/import")
async def import_tasks(
    team_id: str,
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(require_authenticated_user)
):
    check_team_access(team_id, user["id"])
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported.")

    content = await file.read()
    try:
        decoded = content.decode("utf-8")
    except UnicodeDecodeError:
        decoded = content.decode("latin-1", errors="replace")

    reader = csv.DictReader(io.StringIO(decoded))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file is empty or does not contain a header row.")

    tasks_to_save = []
    rejected_rows = []
    seen_keys = set()
    valid_statuses = {"todo", "in progress", "review", "completed", "done", "blocked"}

    for idx, row in enumerate(reader, start=2):
        norm_row = {k.strip().lower(): v.strip() for k, v in row.items() if k and v is not None}

        raw_id = norm_row.get("task_id") or norm_row.get("id") or norm_row.get("key")
        if not raw_id:
            rejected_rows.append({"row": idx, "reason": "Missing required field: 'task_id'"})
            continue

        raw_id_clean = raw_id.strip()
        if raw_id_clean in seen_keys:
            rejected_rows.append({"row": idx, "task_id": raw_id_clean, "reason": f"Duplicate task_id '{raw_id_clean}' in file."})
            continue

        title = norm_row.get("title") or norm_row.get("summary") or norm_row.get("name")
        if not title:
            rejected_rows.append({"row": idx, "task_id": raw_id_clean, "reason": "Missing required field: 'title'"})
            continue

        pts_str = norm_row.get("story_points") or norm_row.get("points") or norm_row.get("estimate") or "1.0"
        try:
            pts = float(pts_str)
            if pts <= 0:
                rejected_rows.append({"row": idx, "task_id": raw_id_clean, "reason": f"Invalid story_points '{pts_str}': must be > 0."})
                continue
        except ValueError:
            rejected_rows.append({"row": idx, "task_id": raw_id_clean, "reason": f"Invalid story_points '{pts_str}': must be numeric."})
            continue

        raw_status = norm_row.get("status") or "Todo"
        if raw_status.lower() not in valid_statuses:
            rejected_rows.append({"row": idx, "task_id": raw_id_clean, "reason": f"Invalid status '{raw_status}'. Supported: Todo, In Progress, Review, Completed."})
            continue

        canonical_status = "In Progress" if raw_status.lower() in ["in progress", "blocked"] else ("Completed" if raw_status.lower() in ["completed", "done"] else raw_status.capitalize())

        due = norm_row.get("due_date") or norm_row.get("due") or ""
        if due:
            try:
                time.strptime(due.split("T")[0], "%Y-%m-%d")
            except ValueError:
                rejected_rows.append({"row": idx, "task_id": raw_id_clean, "reason": f"Invalid due_date '{due}': must be in YYYY-MM-DD format."})
                continue

        assignee = norm_row.get("assignee_github_username") or norm_row.get("assignee") or norm_row.get("user") or ""

        seen_keys.add(raw_id_clean)
        tasks_to_save.append({
            "task_id": raw_id_clean,
            "title": title.strip(),
            "assignee_github_username": assignee.strip().lstrip("@").lower(),
            "story_points": pts,
            "status": canonical_status,
            "due_date": due
        })

    if not tasks_to_save and rejected_rows:
        raise HTTPException(
            status_code=400,
            detail=f"All {len(rejected_rows)} rows in CSV were rejected: " + "; ".join(r["reason"] for r in rejected_rows[:3])
        )

    if tasks_to_save:
        save_team_tasks(team_id, tasks_to_save)
        _recalculate_analytics_with_cached_github(user["id"], team_id)

    msg = f"Successfully imported {len(tasks_to_save)} tasks."
    if rejected_rows:
        msg += f" ({len(rejected_rows)} invalid rows skipped)."

    return {
        "success": True,
        "message": msg,
        "rows_processed": len(tasks_to_save),
        "imported_count": len(tasks_to_save),
        "rejected_count": len(rejected_rows),
        "rejected_rows": rejected_rows,
        "validation_warnings": len(rejected_rows)
    }

if __name__ == "__main__":
    import uvicorn
    app_module = "backend.main:app" if Path.cwd().name != "backend" else "main:app"
    uvicorn.run(
        app_module,
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=[backend_dir],
        reload_includes=["*.py"],
        reload_excludes=["*.db*", "*.db-journal*"]
    )
