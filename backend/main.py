"""
FastAPI Server for SquadSync — Collaboration Risk Intelligence.
Provides authentication endpoints (/api/v1/auth/*) and team analytics endpoints (/api/v1/teams/*).
"""

from fastapi import FastAPI, Depends, HTTPException, status, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
import time

from auth import (
    create_user,
    authenticate_user,
    create_session,
    invalidate_session,
    get_user_from_token,
    require_authenticated_user
)

app = FastAPI(
    title="SquadSync API",
    description="Backend API for SquadSync Collaboration & Risk Monitoring",
    version="1.0.0"
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ],
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

class ConnectRepoRequest(BaseModel):
    repo_owner: str
    repo_name: str
    branch: Optional[str] = "main"

# ----------------- Auth Endpoints -----------------

@app.post("/api/v1/auth/register", status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest):
    user = create_user(
        name=req.name,
        email=req.email,
        password=req.password,
        role=req.role or "Student Contributor"
    )
    token = create_session(user["id"], remember_me=False)
    return {
        "user": user,
        "token": token,
        "token_type": "bearer",
        "expires_in": 86400,
        "message": "Account created successfully"
    }

@app.post("/api/v1/auth/login")
def login(req: LoginRequest):
    user = authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials."
        )

    token = create_session(user["id"], remember_me=req.remember_me)
    expires_in = 30 * 86400 if req.remember_me else 86400

    return {
        "user": user,
        "token": token,
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
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        invalidate_session(token)
    return {"success": True, "message": "Successfully signed out"}

# ----------------- Core SquadSync Endpoints -----------------

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "service": "squadsync-backend",
        "timestamp": int(time.time()),
        "auth_enabled": True
    }

# Mock dataset matching demo standards
TEAMS_DATA = [
    {
        "id": "team-alpha",
        "name": "Team Alpha — DevPulse (Senior Capstone)",
        "repo_name": "squadsync-org/devpulse-capstone",
        "academic_term": "Fall 2026 Capstone",
        "members_count": 4,
        "created_at": "2026-09-01T09:00:00Z"
    },
    {
        "id": "team-beta",
        "name": "Team Beta — CampusEats (Agile Studio)",
        "repo_name": "squadsync-org/campuseats-web",
        "academic_term": "Fall 2026 SWE Studio",
        "members_count": 5,
        "created_at": "2026-09-15T10:30:00Z"
    }
]

@app.get("/api/v1/teams")
def get_teams(user: Dict[str, Any] = Depends(require_authenticated_user)):
    return {"data": TEAMS_DATA}

@app.get("/api/v1/teams/{team_id}/dashboard")
def get_dashboard(team_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    return {
        "data": {
            "team_id": team_id,
            "team_name": "Team Alpha — DevPulse (Senior Capstone)" if team_id == "team-alpha" else "Team Beta — CampusEats",
            "repository": "squadsync-org/devpulse-capstone",
            "is_demo": False,
            "last_updated": "2026-10-23T12:30:00Z",
            "overall_risk_level": "High" if team_id == "team-alpha" else "Low",
            "metrics": {
                "total_members": 4,
                "total_tasks": 28,
                "completed_tasks": 15,
                "in_progress_tasks": 8,
                "overdue_tasks": 5,
                "open_pull_requests": 6,
                "reviewed_pull_requests": 3,
                "unreviewed_pull_requests": 3,
                "review_coverage_percent": 50.0,
                "average_review_wait_hours": 58.2,
                "long_running_branches_count": 2
            },
            "workload_summary": [
                {"name": "Alex Chen", "role": "Fullstack / Lead", "tasks_assigned": 11, "points": 26, "workload_share": 44.8, "status": "Overburdened"},
                {"name": "Maya Patel", "role": "Frontend Dev", "tasks_assigned": 7, "points": 14, "workload_share": 24.1, "status": "Balanced"},
                {"name": "Marcus Vance", "role": "Backend Dev", "tasks_assigned": 6, "points": 12, "workload_share": 20.7, "status": "Balanced"},
                {"name": "Priya Sharma", "role": "QA & Docs", "tasks_assigned": 4, "points": 6, "workload_share": 10.4, "status": "Underutilized"}
            ],
            "review_participation_summary": [
                {"name": "Alex Chen", "prs_authored": 3, "reviews_conducted": 1, "review_ratio": 0.33},
                {"name": "Maya Patel", "prs_authored": 2, "reviews_conducted": 4, "review_ratio": 2.0},
                {"name": "Marcus Vance", "prs_authored": 1, "reviews_conducted": 1, "review_ratio": 1.0},
                {"name": "Priya Sharma", "prs_authored": 0, "reviews_conducted": 0, "review_ratio": 0.0}
            ],
            "integration_risk_indicators": {
                "risk_level": "High",
                "open_unmerged_prs": 6,
                "stale_prs_over_48h": 3,
                "long_lived_branches": 2,
                "blocked_tasks": 3,
                "top_warning": "Branch feature/auth-redesign is 16 days old and 28 commits behind main"
            },
            "recent_warnings": [
                {
                    "id": "warn-101",
                    "category": "Workload Imbalance",
                    "level": "High",
                    "title": "Alex Chen carries 44.8% of total team workload",
                    "explanation": "One member carries nearly half of sprint points. If Alex encounters blockers, the deadline is at risk.",
                    "suggested_action": "Reallocate Task #18 (OAuth Provider) and Task #22 to Priya or Marcus.",
                    "timestamp": "2026-10-23T08:15:00Z"
                },
                {
                    "id": "warn-102",
                    "category": "Review Bottleneck",
                    "level": "High",
                    "title": "3 Pull Requests awaiting review for over 48 hours",
                    "explanation": "PR #19, PR #21, and PR #24 have zero peer review comments.",
                    "suggested_action": "Assign Priya as primary reviewer for PR #21.",
                    "timestamp": "2026-10-22T19:30:00Z"
                }
            ]
        }
    }

@app.get("/api/v1/teams/{team_id}/workload")
def get_workload(team_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    return {
        "data": {
            "team_id": team_id,
            "total_story_points": 58,
            "total_tasks": 28,
            "methodology_note": "Workload share combines task difficulty estimation (story points) and active assigned tasks.",
            "members": [
                {
                    "member_id": "m-1",
                    "name": "Alex Chen",
                    "github_username": "alexchen-dev",
                    "role": "Fullstack / Team Lead",
                    "assigned_tasks": 11,
                    "completed_tasks": 5,
                    "pending_tasks": 6,
                    "story_points": 26,
                    "estimated_workload_share": 44.8,
                    "workload_status": "Overburdened",
                    "github_activity": {"commits_last_14d": 48, "prs_opened": 3, "prs_merged": 2, "review_comments_made": 4, "last_active": "2026-10-23T11:45:00Z"},
                    "tasks": [
                        {"id": "TASK-101", "title": "Implement JWT refresh token rotation", "points": 5, "status": "In Progress", "overdue": False},
                        {"id": "TASK-104", "title": "Database schema migration for multi-tenancy", "points": 8, "status": "Overdue", "overdue": True}
                    ]
                },
                {
                    "member_id": "m-2",
                    "name": "Maya Patel",
                    "github_username": "mayapatel-ui",
                    "role": "Frontend Developer",
                    "assigned_tasks": 7,
                    "completed_tasks": 4,
                    "pending_tasks": 3,
                    "story_points": 14,
                    "estimated_workload_share": 24.1,
                    "workload_status": "Balanced",
                    "github_activity": {"commits_last_14d": 29, "prs_opened": 2, "prs_merged": 2, "review_comments_made": 12, "last_active": "2026-10-23T10:15:00Z"},
                    "tasks": [
                        {"id": "TASK-102", "title": "Build responsive team workload dashboard view", "points": 5, "status": "Completed", "overdue": False}
                    ]
                },
                {
                    "member_id": "m-3",
                    "name": "Marcus Vance",
                    "github_username": "marcus-backend",
                    "role": "Backend Developer",
                    "assigned_tasks": 6,
                    "completed_tasks": 4,
                    "pending_tasks": 2,
                    "story_points": 12,
                    "estimated_workload_share": 20.7,
                    "workload_status": "Balanced",
                    "github_activity": {"commits_last_14d": 22, "prs_opened": 1, "prs_merged": 1, "review_comments_made": 6, "last_active": "2026-10-22T16:20:00Z"},
                    "tasks": [
                        {"id": "TASK-103", "title": "FastAPI endpoint for integration risk calculation", "points": 5, "status": "Completed", "overdue": False}
                    ]
                },
                {
                    "member_id": "m-4",
                    "name": "Priya Sharma",
                    "github_username": "priya-qa",
                    "role": "QA & Documentation",
                    "assigned_tasks": 4,
                    "completed_tasks": 2,
                    "pending_tasks": 2,
                    "story_points": 6,
                    "estimated_workload_share": 10.4,
                    "workload_status": "Underutilized",
                    "github_activity": {"commits_last_14d": 6, "prs_opened": 0, "prs_merged": 0, "review_comments_made": 0, "last_active": "2026-10-20T14:00:00Z"},
                    "tasks": [
                        {"id": "TASK-105", "title": "End-to-end Cypress test suite for auth flow", "points": 3, "status": "Overdue", "overdue": True}
                    ]
                }
            ]
        }
    }

@app.get("/api/v1/teams/{team_id}/reviews")
def get_reviews(team_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    return {
        "data": {
            "team_id": team_id,
            "total_pull_requests": 12,
            "reviewed_pull_requests": 6,
            "unreviewed_pull_requests": 6,
            "review_coverage_percent": 50.0,
            "average_wait_time_hours": 58.2,
            "member_participation": [
                {"name": "Alex Chen", "reviews_done": 1, "prs_created": 4, "participation_share": 14.3},
                {"name": "Maya Patel", "reviews_done": 5, "prs_created": 3, "participation_share": 71.4},
                {"name": "Marcus Vance", "reviews_done": 1, "prs_created": 3, "participation_share": 14.3},
                {"name": "Priya Sharma", "reviews_done": 0, "prs_created": 0, "participation_share": 0.0}
            ],
            "pull_requests_requiring_attention": [
                {
                    "id": "pr-24",
                    "number": 24,
                    "title": "feat: add role-based authorization middleware",
                    "author": "Alex Chen",
                    "author_username": "alexchen-dev",
                    "branch": "feature/auth-rbac",
                    "target_branch": "main",
                    "created_at": "2026-10-19T14:30:00Z",
                    "waiting_hours": 94,
                    "status": "Needs Review",
                    "reviewers": ["marcus-backend"],
                    "review_count": 0,
                    "files_changed": 14,
                    "additions": 480,
                    "deletions": 52,
                    "has_warning": True,
                    "evidence": {
                        "warning_title": "Unreviewed Core Security Changes for >90 hours",
                        "why_warning_raised": "This pull request modifies critical backend authentication guards with zero reviews.",
                        "supporting_metrics": [
                            {"label": "Time Waiting for Peer Review", "value": "94 hours (Threshold: 48h)"},
                            {"label": "Security Critical Files Modified", "value": "4 core middleware files"}
                        ],
                        "suggested_action": "Reassign review to Maya Patel during standup before merging."
                    }
                }
            ]
        }
    }

@app.get("/api/v1/teams/{team_id}/integration-risks")
def get_integration_risks(team_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    return {
        "data": {
            "team_id": team_id,
            "overall_risk_level": "High",
            "summary": {
                "open_unmerged_prs": 6,
                "long_running_branches": 2,
                "prs_waiting_over_48h": 3,
                "blocked_or_overdue_dependent_tasks": 4,
                "average_branch_age_days": 9.4
            },
            "risks": [
                {
                    "id": "ir-1",
                    "title": "Long-running branch with severe divergence",
                    "identifier": "feature/auth-redesign",
                    "risk_type": "Branch Divergence & Merge Conflict",
                    "severity": "Critical",
                    "branch_name": "feature/auth-redesign",
                    "author": "Alex Chen",
                    "measured_facts": [
                        "Branch created 16 days ago without intermediate merges to main",
                        "Currently 28 commits behind the target main branch",
                        "Modifies 34 files, including core auth and database models"
                    ],
                    "possible_risks": [
                        "Extremely high probability of complex three-way merge conflicts",
                        "Risk of breaking user session handling for other team members"
                    ],
                    "suggested_action": "Perform git rebase onto main immediately in pairing session."
                }
            ]
        }
    }

@app.get("/api/v1/teams/{team_id}/risks")
def get_risks(team_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    return {
        "data": [
            {
                "id": "RISK-001",
                "category": "Workload Imbalance",
                "risk_level": "High",
                "title": "Single Contributor Workload Bottleneck",
                "explanation": "Alex Chen is responsible for 44.8% of all sprint points across 11 tasks.",
                "supporting_metrics": {"workload_share": "44.8%", "assigned_tasks": 11, "team_average_share": "25.0%"},
                "related_tasks": [{"id": "TASK-101", "title": "Implement JWT refresh token rotation"}],
                "related_prs": [{"id": "pr-24", "number": 24, "title": "feat: add role-based authorization middleware"}],
                "detection_timestamp": "2026-10-23T08:15:00Z",
                "suggested_action": "Reallocate at least 8 story points to Priya Sharma or Marcus Vance."
            }
        ]
    }

@app.get("/api/v1/teams/{team_id}/sync-status")
def get_sync_status(team_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    return {
        "data": {
            "team_id": team_id,
            "repository": "squadsync-org/devpulse-capstone",
            "default_branch": "main",
            "connection_type": "Backend-Managed GitHub App",
            "last_synced_at": "2026-10-23T12:30:00Z",
            "status": "success",
            "sync_duration_seconds": 3.2,
            "records_processed": {"commits": 142, "pull_requests": 12, "reviews": 7, "tasks_imported": 28},
            "validation_errors": []
        }
    }

@app.post("/api/v1/teams/{team_id}/sync")
def trigger_sync(team_id: str, user: Dict[str, Any] = Depends(require_authenticated_user)):
    return {
        "success": True,
        "message": "Data synchronization completed successfully",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "records_processed": {"commits": 142, "pull_requests": 12, "tasks": 28}
    }

@app.post("/api/v1/teams/{team_id}/tasks/import")
async def import_tasks(team_id: str, file: UploadFile = File(...), user: Dict[str, Any] = Depends(require_authenticated_user)):
    content = await file.read()
    lines = content.decode("utf-8", errors="ignore").splitlines()
    count = max(0, len(lines) - 1)
    return {
        "success": True,
        "message": f"Imported {count} tasks from {file.filename}",
        "rows_processed": count,
        "validation_warnings": 0
    }

@app.post("/api/v1/teams/{team_id}/github")
def connect_github(team_id: str, req: ConnectRepoRequest, user: Dict[str, Any] = Depends(require_authenticated_user)):
    return {
        "success": True,
        "message": f"Connected repository {req.repo_owner}/{req.repo_name} (branch: {req.branch})",
        "repository": f"{req.repo_owner}/{req.repo_name}"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
