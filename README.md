# SquadSync — Team Collaboration & Integration Risk Intelligence Platform

SquadSync is an enterprise-grade collaboration monitoring, workload distribution analysis, and integration risk detection platform designed for modern engineering teams, capstone projects, and student cohorts.

SquadSync correlates real task-board records stored in SQLite with live GitHub activity (commits, pull requests, peer reviews, branches, issues) to provide explainable risk indicators, workload transparency, and actionable recommendations.

---

## Key Differentiators & Engineering Principles

1. **Decoupled Workload Calculation**: Never measures individual productivity by raw commit counts alone. Workload share is derived from assigned sprint story points, task complexity, overdue tasks, and peer review turnaround.
2. **Verified Merge Conflicts & Divergence**: Pull requests are only marked as conflicting when verified (`mergeable: false`), distinguishing confirmed facts from speculative branch divergence risks.
3. **No Fabrication**: If repository data or task records are missing, the UI displays clear onboarding checklists and guidance rather than inventing mock metrics.
4. **Multi-Tenant Security & RBAC**: Strict team boundary isolation in SQLite. Only authorized team leads can modify team settings, invite members, or delete tasks; team developers can update assigned task statuses.

---

## Architecture Overview

```
SquareSync/
├── backend/                       # FastAPI + Python Backend
│   ├── auth.py                    # PBKDF2 hashing, secure token generation, RBAC sessions
│   ├── database.py                # Multi-tenant SQLite schema (teams, tasks, memberships, invitations)
│   ├── analytics.py               # Dynamic workload, code review, and integration risk engine
│   ├── github_client.py           # GitHub REST API client with rate-limiting & pagination
│   ├── main.py                    # FastAPI REST API endpoints
│   ├── test_suite.py              # Automated test suite (9/9 passed)
│   └── requirements.txt           # Python dependencies
│
├── src/                           # React 18 + Vite Frontend
│   ├── auth/                      # Authentication layer & ProtectedRoute
│   ├── components/
│   │   ├── dashboard/             # OnboardingChecklist, WorkloadChart, ReviewParticipationChart
│   │   ├── tasks/                 # CreateTaskModal, Kanban board, Status selector
│   │   ├── team/                  # CreateTeamModal, InviteMemberModal, ContributorMappingCard
│   │   ├── common/                # StatCard, Badge, Button, Card, Modal, ErrorState
│   │   └── layout/                # Navbar (with pending invites banner), Sidebar
│   ├── pages/
│   │   ├── DashboardPage.jsx      # Dynamic KPIs, Risk level, Onboarding checklist
│   │   ├── TasksPage.jsx          # Dedicated database-backed task board (Board & List views)
│   │   ├── WorkloadPage.jsx       # Multi-factor workload share & story point breakdown
│   │   ├── ReviewsPage.jsx        # PR peer review turnaround, unreviewed queues, SLAs
│   │   ├── IntegrationRiskPage.jsx# Long-running branches & verified merge conflicts
│   │   ├── DataSourcesPage.jsx    # GitHub repo connection, Contributor Mapping & CSV import
│   │   ├── RisksPage.jsx          # Auditable risk dossier with measured facts vs risks
│   │   └── SettingsDocsPage.jsx   # Active thresholds, SLA policies & metrics definitions
│   └── services/
│       └── api.js                 # Centralized frontend API client
│
├── start-all.bat                  # 1-Click launcher: Backend + Frontend
├── start-backend.bat              # Standalone FastAPI launcher (port 8000)
└── start-frontend.bat             # Standalone Vite launcher (port 5173)
```

---

## Core Workflow

```
1. Login / Register
   ↓
2. Create Team Workspace (or switch to existing team)
   ↓
3. Invite Team Members by Email (assign Developer, Reviewer, or Team Lead roles)
   ↓
4. Accept / Decline Invitations (recipients receive in-app invite banner)
   ↓
5. Create and Assign Tasks (title, priority, story points, hours, due dates)
   ↓
6. Connect GitHub Repository (owner/repo name + optional token for private repos)
   ↓
7. Map GitHub Contributors (associate GitHub handles with SquadSync team members)
   ↓
8. Analyze Workload & Integration Risks (dynamic multi-factor calculation)
   ↓
9. Review Actionable Recommendations (rebalance workload, review stale PRs)
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm v9+

### 1-Click Launch (Windows)
Double-click `start-all.bat` from the repository root. This opens both the backend server and frontend development server in separate windows.

---

### Manual Launch

#### 1. Backend (FastAPI)
```bash
# In repository root
pip install -r backend/requirements.txt

# Start backend on port 8000 with auto-reload
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://127.0.0.1:8000/api/v1`
- OpenAPI Swagger Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/v1/health`

#### 2. Frontend (React + Vite)
```bash
# In repository root
npm install

# Start Vite dev server on port 5173
npm run dev
```
- Frontend Application: `http://localhost:5173`

---

## Pre-Configured Accounts for Demonstration

| Name | Role | Email | Password | Pre-Assigned Team |
|---|---|---|---|---|
| **Alex Chen** | Team Lead | `alex.chen@squadsync.edu` | `SquadSync2026!` | `team-alpha` |
| **Maya Patel** | Developer | `maya.patel@squadsync.edu` | `SquadSync2026!` | `team-alpha` |
| **Dr. Eleanor Vance** | Faculty Mentor | `mentor@squadsync.edu` | `SquadSync2026!` | Viewer |

*(Quick demo buttons are also provided on the `/login` page for 1-click evaluation).*

---

## Demonstration Checklist

Follow this checklist to demonstrate all platform features end-to-end:

1. **Authentication & Team Creation**:
   - Navigate to `http://localhost:5173/login` and sign in as `alex.chen@squadsync.edu`.
   - Click the **Team Selector** dropdown in the top navbar and click **+ Create New Team**.
   - Enter a name (e.g. `Omega Platform`) and description. Click **Create Team**.

2. **Team Invitation Workflow**:
   - Navigate to **Data Sources** (`/data-sources`).
   - In the **Team Members & Contributor Mapping** card, click **Invite Member**.
   - Enter a collaborator's email (e.g. `maya.patel@squadsync.edu`) and select role `Developer`.
   - The invitation appears in the **Team Invitations** table with status `pending`.
   - When Maya logs in, an in-app banner appears allowing 1-click **Accept** or **Decline**.

3. **Task Management (Dedicated Page)**:
   - Navigate to **Tasks** (`/tasks`) from the sidebar.
   - Click **Create Task**. Enter title, assignee, priority (`High`), story points (`5.0`), and due date.
   - Switch between **Board** (Kanban lanes: Todo, In Progress, Review, Completed) and **List** view.
   - Change task status using the quick dropdown (e.g., move to `In Progress`).
   - Notice how summary cards (Total Tasks, In Progress, Points) update immediately.

4. **GitHub Repository Connection**:
   - Go to **Data Sources** (`/data-sources`).
   - Enter repository owner and name (e.g., `amruta-2005/SquadSync` or any public repository).
   - Click **Connect Repository**. SquadSync validates accessibility via GitHub API and saves it securely on the backend.

5. **Contributor Mapping**:
   - Scroll down to **Team Members & Contributor Mapping**.
   - Enter the team member's exact GitHub username (e.g., `octocat`).
   - Click **Save**. SquadSync updates the mapping and automatically recalibrates analytics.

6. **Dynamic Dashboard & Onboarding Checklist**:
   - Go to **Dashboard** (`/dashboard`).
   - Newly created teams display the **Team Onboarding & Setup Workflow** checklist showing real progress.
   - Click **Sync Data** to trigger on-demand synchronization with GitHub.
   - Review the calculated metrics: Workload Distribution, Review Coverage, and Integration Risks.

7. **Risk Detection & Evidence Dossier**:
   - Navigate to **Integration Risk** (`/integration-risks`) and **Risk Details** (`/risks`).
   - Inspect detected risks (e.g. Branch Divergence, Long-Lived PRs, Verified Conflicts).
   - Each risk displays measured facts, potential impact, severity badge, and recommended mitigation actions.

---

## Automated Test Suite

SquadSync includes a comprehensive automated test suite verifying all multi-tenant boundaries, RBAC authorization, task CRUD, GitHub integration, and analytics decoupling.

Run the test suite anytime:
```bash
python backend/test_suite.py -v
```

### Verified Test Cases:
- `test_01_user_registration_and_authentication` — User registration, PBKDF2 password verification, JWT session issuance, and `/auth/me`.
- `test_02_team_creation_and_membership_authorization` — Multi-tenant team creation, role assignment, and unauthorized team boundary enforcement (403 Forbidden for intruders).
- `test_03_team_invitation_and_acceptance_workflow` — Email invitation generation, pending invitation querying, and acceptance into team membership.
- `test_04_contributor_github_username_mapping` — Mapping GitHub usernames to existing team members.
- `test_05_task_management_crud_and_status_transitions` — Database-backed task creation, priority, story points, and permitted status transitions.
- `test_06_analytics_calculation_engine_and_decoupling` — Workload decoupling from commit counts, peer review verification, verified merge conflicts (`mergeable: false`), and branch divergence detection.
- `test_07_persisted_snapshot_analytics_endpoints` — SQLite synchronization and endpoint delivery (`/dashboard`, `/workload`, `/reviews`, `/integration-risks`, `/risks`).
- `test_08_csv_task_board_import` — CSV task parsing, schema normalization, and database ingestion.
- `test_09_github_validation_and_rate_limit_handling` — Repository accessibility checks, informative error feedback, and rate limit safeguards.

---

## Production Build Verification

To verify frontend compilation for production:
```bash
npm run build
```
Builds cleanly with zero errors to `dist/`.
