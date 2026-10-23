# SquadSync — Fullstack Collaboration Intelligence

**Spotting Workload Imbalance and Integration Risk from Git and Task Data**

SquadSync is a collaboration-monitoring platform designed for student software engineering teams, capstone projects, and hackathons. It analyzes GitHub repository activity and task-board data to detect:
- Workload imbalance & free-riding risks
- Insufficient or delayed peer code reviews
- Critical path overdue tasks
- Delayed code integration and branch divergence

---

## 1. System Architecture

```
SquareSync/
├── backend/                  # FastAPI Python Backend
│   ├── auth.py               # PBKDF2 hashing, secure token generation, SQLite persistence
│   ├── main.py               # Auth & SquadSync API endpoints with CORS
│   └── requirements.txt      # Python dependencies
│
├── src/                      # React 18 Frontend
│   ├── auth/                 # Authentication Module (Independent Layer)
│   │   ├── authService.js    # Token storage, API integration, auth headers
│   │   ├── AuthProvider.jsx  # Shared auth context & session verification
│   │   └── ProtectedRoute.jsx# React Router route guard with redirect preservation
│   ├── components/
│   │   ├── auth/             # PasswordInput, LoginForm helpers
│   │   ├── common/           # Badge, Button, Card, StatCard, Modal, Toast
│   │   └── layout/           # Navbar (with user profile & sign-out), Sidebar
│   ├── pages/
│   │   ├── Login.jsx         # Hackathon 2-column Login with demo evaluation accounts
│   │   ├── Register.jsx      # User Registration with role selection & validation
│   │   ├── LandingPage.jsx   # Public mission, features & preview
│   │   ├── DashboardPage.jsx # Protected Dashboard with collaboration metrics
│   │   ├── WorkloadPage.jsx  # Protected Team Workload analysis & bar chart
│   │   ├── ReviewsPage.jsx   # Protected Code Review participation & evidence
│   │   ├── IntegrationRiskPage.jsx # Protected Integration Risk Radar (Facts vs Risks)
│   │   ├── DataSourcesPage.jsx     # Protected GitHub connection & CSV import
│   │   ├── RisksPage.jsx     # Protected Risk ledger & evidence dossier
│   │   └── SettingsDocsPage.jsx    # Protected Settings, thresholds & definitions
│   └── App.jsx               # Router configuring public vs protected routes
```

---

## 2. Getting Started

### Prerequisites

- Node.js (v18+, tested on v24) & npm (v9+)
- Python (v3.10+) with pip

---

### Step 1: Start the FastAPI Backend

```bash
# Navigate to the backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server on port 8000
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API will be available at:
`http://127.0.0.1:8000/api/v1`

Interactive OpenAPI/Swagger documentation:
`http://127.0.0.1:8000/docs`

---

### Step 2: Start the Vite Frontend

```bash
# From repository root
npm install

# Start Vite development server
npm run dev
```

The frontend will be available at:
`http://localhost:5173`

---

## 3. Pre-Seeded Hackathon Evaluation Accounts

For rapid demonstration and evaluation, the backend database is automatically seeded with the following accounts:

| Name | Role | Email | Password |
|---|---|---|---|
| **Alex Chen** | Team Lead & Fullstack Dev | `alex.chen@squadsync.edu` | `SquadSync2026!` |
| **Maya Patel** | Frontend Developer | `maya.patel@squadsync.edu` | `SquadSync2026!` |
| **Dr. Eleanor Vance** | Capstone Faculty Mentor | `mentor@squadsync.edu` | `SquadSync2026!` |

*(On the Login page, 1-click demo buttons are provided to instantly populate and test these accounts).*

You can also create custom accounts at any time via `/register`.

---

## 4. Authentication Architecture & Security

### Backend Security
- **Password Hashing**: PBKDF2-HMAC-SHA256 with 100,000 iterations and cryptographically secure random 16-byte salts (via Python standard library `secrets` and `hashlib`). Passwords are never stored in plain text.
- **Session Tokens**: 32-byte cryptographically secure random tokens stored in SQLite with expiration timestamps.
- **Dependency Guard**: `require_authenticated_user` extracts `Bearer <token>` from the HTTP `Authorization` header and rejects invalid or expired tokens with `401 Unauthorized`.
- **CORS**: Configured specifically for the frontend origin (`http://localhost:5173`) with credentials enabled.

### Frontend Route Protection
- **Public Routes**: `/login`, `/register`, `/` (Landing page)
- **Protected Routes**: `/dashboard`, `/workload`, `/reviews`, `/integration-risks`, `/data-sources`, `/risks`, `/settings`
- **Redirect Preservation**: Unauthenticated requests to protected paths (e.g. `/workload`) redirect to `/login` with `state: { from: location }`, returning the user directly to that page upon successful authentication.
- **Session Restoration**: On page load or refresh, `AuthProvider` validates the stored token against `GET /api/v1/auth/me`.
- **Sign Out**: Invalidates the active token on the backend (`POST /api/v1/auth/logout`), purges client-side storage, and redirects to `/login`.

---

## 5. Backend API Endpoints

### Authentication Endpoints
- `POST /api/v1/auth/register` — Create a new user account (name, email, password, role)
- `POST /api/v1/auth/login` — Authenticate credentials and receive Bearer token
- `GET /api/v1/auth/me` — Retrieve currently authenticated user profile
- `POST /api/v1/auth/logout` — Invalidate the active session token

### Core SquadSync Analytics Endpoints (Protected)
- `GET /api/v1/health` — Backend health check (public)
- `GET /api/v1/teams` — List monitored student teams
- `GET /api/v1/teams/{team_id}/dashboard` — Team dashboard overview & KPIs
- `GET /api/v1/teams/{team_id}/workload` — Workload share & member story points
- `GET /api/v1/teams/{team_id}/reviews` — Code review coverage & PR waiting queues
- `GET /api/v1/teams/{team_id}/integration-risks` — Branch divergence & blocked dependencies
- `GET /api/v1/teams/{team_id}/risks` — Comprehensive detected risk ledger
- `GET /api/v1/teams/{team_id}/sync-status` — Synchronization status & validation logs
- `POST /api/v1/teams/{team_id}/sync` — Trigger on-demand repository audit
- `POST /api/v1/teams/{team_id}/tasks/import` — Ingest task board CSV export
- `POST /api/v1/teams/{team_id}/github` — Update repository connection settings
