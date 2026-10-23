# SquadSync — Frontend

**Spotting Workload Imbalance and Integration Risk from Git and Task Data**

SquadSync is a collaboration-monitoring platform designed for student software engineering teams, capstone projects, and hackathons. It analyzes GitHub repository activity and task-board data to detect:
- Workload imbalance & free-riding risks
- Insufficient or delayed peer code reviews
- Critical path overdue tasks
- Delayed code integration and branch divergence

---

## 1. Tech Stack

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS with custom purple brand accents and navy typography
- **Navigation**: React Router DOM (v6)
- **Visualizations**: Recharts (Bar charts, distribution shares, participation ratios)
- **Icons**: Lucide React
- **API Client**: Native Fetch API with timeout, standardized error handling, and health diagnostics

---

## 2. Getting Started

### Prerequisites

- Node.js (v18+ recommended, tested on v24)
- npm (v9+)
- (Optional) FastAPI Backend running at `http://localhost:8000/api/v1`

### Installation

```bash
# Clone the repository and enter directory
cd SquareSync

# Install dependencies
npm install
```

### Environment Configuration

Copy the example environment configuration:

```bash
cp .env.example .env
```

Default content of `.env`:
```env
# URL pointing to the FastAPI backend API
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Running Locally

```bash
# Start the Vite development server
npm run dev
```

The frontend will be available at:
`http://localhost:5173`

### Production Build

```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 3. Implemented Pages & Features

### A. Landing Page (`/`)
- Logo, project mission, and core problem vs. solution breakdown.
- Highlight cards for Workload Analysis, Review Participation, Integration Risk, and Evidence-Based Insights.
- Direct navigation buttons: "Open Dashboard" and "Connect GitHub Repository".
- Live preview showing sample Capstone Team health statistics.

### B. Collaboration Dashboard (`/dashboard`)
- Primary metric cards: Total team members, Tasks completed vs overdue, Open PRs, Review coverage percentage.
- Overall collaboration risk level badge (Low, Medium, High).
- Recharts Workload Distribution Bar Chart (Story points and assigned tasks).
- Recharts Code Review Participation Chart (PRs created vs Reviews conducted).
- Integration Risk Radar banner with active warning highlights.
- Actionable collaboration alerts list with one-click links to inspect evidence.
- Team selector dropdown to switch between monitored student teams.

### C. Team Workload Page (`/workload`)
- Multi-factor workload table: Member avatar, role, assigned tasks, completed tasks, pending tasks, estimated workload share, recent GitHub activity, and workload status badge.
- Interactive Bar Chart comparing workload across team members.
- Explicit methodology notice: **Commit counts are deliberately decoupled from workload share to avoid artificial commit bloating.**
- Drill-down Member Detail Modal showing individual assigned tasks, story points, and recent GitHub contributions.
- Filter by status (All, Overburdened, Balanced, Underutilized) and live search.

### D. Code Review Analysis Page (`/reviews`)
- Metrics: Total PRs, Reviewed vs Unreviewed, Review Coverage %, Average Review Wait Time in hours.
- Member review participation breakdown cards.
- Pull Requests Requiring Attention table with waiting time, assigned reviewers, and risk flags.
- **Evidence Inspector Modal**: Displays exact metrics behind flagged warnings (queue time, files modified, lines changed, reviewer load) and suggested next steps.
- Filter by status (All, Warnings Only, Needs Review, Approved) and live search.

### E. Integration Risk Radar Page (`/integration-risks`)
- Summary indicators: Open unmerged PRs, long-running branches (>7 days), PRs waiting >48h, blocked dependent tasks.
- **Strict Analytical Distinction**: Explicitly separates **Measured Facts** (branch age, commits behind main, touched files) from **Possible Risks** (merge conflicts, release regression).
- Actionable risk dossier cards with concrete suggested mitigation steps.
- Filter by severity (All, Critical, High, Medium).

### F. Data Sources & Synchronization Page (`/data-sources`)
- GitHub Repository Connection Form (Repository owner, name, default branch).
- **Security Notice**: Uses backend-managed GitHub App authentication. **Never asks users to paste Personal Access Tokens into frontend forms or store secrets in browser storage.**
- Task-Board CSV Uploader with drag & drop and downloadable sample CSV template (`squadsync_task_board_template.csv`).
- Latest synchronization job status card (duration, commits processed, PRs tracked, tasks imported).
- Data Validation Errors & Warnings table with auto-remediation logs.
- Immediate "Refresh Analysis Now" button.

### G. Risk Details Page (`/risks`)
- Searchable and filterable ledger of all detected collaboration risks across the team.
- Filter by Category (Workload Imbalance, Code Review, Integration Risk, Task Overdue) and Severity.
- Related task-board IDs and pull requests linked to each risk.
- Full Evidence Dossier modal with detection timestamp and suggested remediation.

### H. Settings & Documentation Page (`/settings`)
- Analysis thresholds overview (Workload share >30%, Review wait SLA >48h, Branch lifespan >7 days).
- Live backend connectivity health diagnostic (`/health` ping button).
- Demo Data toggle switch.
- Student collaboration problem motivation and philosophy.
- Metric definitions guide.
- Methodological limitations and transparency statement.

---

## 4. Backend Integration Contract

The frontend connects to the following FastAPI endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check to verify backend status |
| `GET` | `/teams` | List of monitored student teams |
| `GET` | `/teams/{team_id}/dashboard` | Team dashboard overview & metrics |
| `GET` | `/teams/{team_id}/members` | Team members list & roles |
| `GET` | `/teams/{team_id}/workload` | Workload distribution & points |
| `GET` | `/teams/{team_id}/reviews` | Review coverage & waiting queues |
| `GET` | `/teams/{team_id}/integration-risks`| Branch divergence & blockers |
| `GET` | `/teams/{team_id}/risks` | Comprehensive detected risks |
| `GET` | `/teams/{team_id}/sync-status` | Latest sync status & validation logs |
| `POST`| `/teams/{team_id}/sync` | Trigger on-demand sync |
| `POST`| `/teams/{team_id}/tasks/import` | Upload CSV task-board file |
| `POST`| `/teams/{team_id}/github` | Connect/update GitHub repository |

### Resilience & Demo Data Mode

- If the FastAPI backend is running, the frontend fetches and visualizes live repository data.
- If the backend is offline or unreachable, the frontend displays a clear connection diagnostic banner and gracefully activates **Demo Data Mode**.
- In accordance with academic integrity and hackathon guidelines, all simulated demonstration data is prominently labeled with a **Demo Data** badge and warning banner.

---

## 5. Remaining Limitations

- **Private Repositories**: Accessing private GitHub organization repositories requires backend GitHub App installation with repository read permissions.
- **Unlinked Task Correlating**: Pull requests that do not include the task ID (e.g. `TASK-104`) in the branch name or PR title cannot be automatically linked to task board cards without NLP inference.
- **Username Matching**: Task board CSV imports rely on matching the `assignee_github_username` column with team members' GitHub handles. Mismatches are flagged in the Data Sources validation table.
