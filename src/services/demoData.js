/**
 * Realistic demonstration dataset for SquadSync.
 * Represents student software engineering project teams (e.g., Capstone/Studio).
 * Clearly marked as Demo Data to satisfy academic & hackathon integrity guidelines.
 */

export const DEMO_TEAMS = [
  {
    id: 'team-alpha',
    name: 'Team Alpha — DevPulse (Senior Capstone)',
    repo_name: 'squadsync-org/devpulse-capstone',
    academic_term: 'Fall 2026 Capstone',
    members_count: 4,
    created_at: '2026-09-01T09:00:00Z'
  },
  {
    id: 'team-beta',
    name: 'Team Beta — CampusEats (Agile Studio)',
    repo_name: 'squadsync-org/campuseats-web',
    academic_term: 'Fall 2026 SWE Studio',
    members_count: 5,
    created_at: '2026-09-15T10:30:00Z'
  }
];

export const DEMO_DATA = {
  'team-alpha': {
    dashboard: {
      team_id: 'team-alpha',
      team_name: 'Team Alpha — DevPulse (Senior Capstone)',
      repository: 'squadsync-org/devpulse-capstone',
      is_demo: true,
      last_updated: '2026-10-23T12:30:00Z',
      overall_risk_level: 'High',
      metrics: {
        total_members: 4,
        total_tasks: 28,
        completed_tasks: 15,
        in_progress_tasks: 8,
        overdue_tasks: 5,
        open_pull_requests: 6,
        reviewed_pull_requests: 3,
        unreviewed_pull_requests: 3,
        review_coverage_percent: 50.0,
        average_review_wait_hours: 58.2,
        long_running_branches_count: 2
      },
      workload_summary: [
        { name: 'Alex Chen', role: 'Fullstack / Lead', tasks_assigned: 11, points: 26, workload_share: 44.8, status: 'Overburdened' },
        { name: 'Maya Patel', role: 'Frontend Dev', tasks_assigned: 7, points: 14, workload_share: 24.1, status: 'Balanced' },
        { name: 'Marcus Vance', role: 'Backend Dev', tasks_assigned: 6, points: 12, workload_share: 20.7, status: 'Balanced' },
        { name: 'Priya Sharma', role: 'QA & Docs', tasks_assigned: 4, points: 6, workload_share: 10.4, status: 'Underutilized' }
      ],
      review_participation_summary: [
        { name: 'Alex Chen', prs_authored: 3, reviews_conducted: 1, review_ratio: 0.33 },
        { name: 'Maya Patel', prs_authored: 2, reviews_conducted: 4, review_ratio: 2.0 },
        { name: 'Marcus Vance', prs_authored: 1, reviews_conducted: 1, review_ratio: 1.0 },
        { name: 'Priya Sharma', prs_authored: 0, reviews_conducted: 0, review_ratio: 0.0 }
      ],
      integration_risk_indicators: {
        risk_level: 'High',
        open_unmerged_prs: 6,
        stale_prs_over_48h: 3,
        long_lived_branches: 2,
        blocked_tasks: 3,
        top_warning: 'Branch feature/auth-redesign is 16 days old and 28 commits behind main'
      },
      recent_warnings: [
        {
          id: 'warn-101',
          category: 'Workload Imbalance',
          level: 'High',
          title: 'Alex Chen carries 44.8% of total team workload',
          explanation: 'One team member is assigned nearly half of all sprint points. If Alex encounters roadblocks, the entire release deadline is at risk.',
          suggested_action: 'Reallocate Task #18 (OAuth Provider) and Task #22 to Priya or Marcus.',
          timestamp: '2026-10-23T08:15:00Z'
        },
        {
          id: 'warn-102',
          category: 'Review Bottleneck',
          level: 'High',
          title: '3 Pull Requests awaiting review for over 48 hours',
          explanation: 'PR #19, PR #21, and PR #24 have zero peer review comments. Priya Sharma has not performed any code reviews this sprint.',
          suggested_action: 'Establish mandatory peer review pair: assign Priya as primary reviewer for PR #21.',
          timestamp: '2026-10-22T19:30:00Z'
        },
        {
          id: 'warn-103',
          category: 'Integration Risk',
          level: 'Critical',
          title: 'Severe branch divergence on feature/auth-redesign',
          explanation: 'Branch has been active for 16 days without merging to main and touches 34 files. High risk of merge conflict cascade.',
          suggested_action: 'Perform an immediate rebase onto main and split remaining work into smaller incremental PRs.',
          timestamp: '2026-10-23T11:00:00Z'
        }
      ]
    },

    members: [
      { id: 'm-1', name: 'Alex Chen', github_username: 'alexchen-dev', role: 'Fullstack / Team Lead', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face' },
      { id: 'm-2', name: 'Maya Patel', github_username: 'mayapatel-ui', role: 'Frontend Developer', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face' },
      { id: 'm-3', name: 'Marcus Vance', github_username: 'marcus-backend', role: 'Backend Developer', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
      { id: 'm-4', name: 'Priya Sharma', github_username: 'priya-qa', role: 'QA & Documentation', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face' }
    ],

    workload: {
      team_id: 'team-alpha',
      total_story_points: 58,
      total_tasks: 28,
      methodology_note: 'Workload share combines task difficulty estimation (story points) and active assigned tasks. Git commit volume is displayed for visibility but is intentionally decoupled from workload share to avoid artificial commit bloating.',
      members: [
        {
          member_id: 'm-1',
          name: 'Alex Chen',
          github_username: 'alexchen-dev',
          role: 'Fullstack / Team Lead',
          assigned_tasks: 11,
          completed_tasks: 5,
          pending_tasks: 6,
          story_points: 26,
          estimated_workload_share: 44.8,
          workload_status: 'Overburdened',
          github_activity: {
            commits_last_14d: 48,
            prs_opened: 3,
            prs_merged: 2,
            review_comments_made: 4,
            last_active: '2026-10-23T11:45:00Z'
          },
          tasks: [
            { id: 'TASK-101', title: 'Implement JWT refresh token rotation', points: 5, status: 'In Progress', overdue: false },
            { id: 'TASK-104', title: 'Database schema migration for multi-tenancy', points: 8, status: 'Overdue', overdue: true },
            { id: 'TASK-108', title: 'Connect Stripe webhook handler', points: 5, status: 'In Progress', overdue: false },
            { id: 'TASK-112', title: 'Setup Redis caching for analytics queries', points: 3, status: 'Completed', overdue: false },
            { id: 'TASK-115', title: 'Fix session timeout bug on mobile Safari', points: 2, status: 'Completed', overdue: false },
            { id: 'TASK-118', title: 'Docker Compose orchestration for local staging', points: 3, status: 'Overdue', overdue: true }
          ]
        },
        {
          member_id: 'm-2',
          name: 'Maya Patel',
          github_username: 'mayapatel-ui',
          role: 'Frontend Developer',
          assigned_tasks: 7,
          completed_tasks: 4,
          pending_tasks: 3,
          story_points: 14,
          estimated_workload_share: 24.1,
          workload_status: 'Balanced',
          github_activity: {
            commits_last_14d: 29,
            prs_opened: 2,
            prs_merged: 2,
            review_comments_made: 12,
            last_active: '2026-10-23T10:15:00Z'
          },
          tasks: [
            { id: 'TASK-102', title: 'Build responsive team workload dashboard view', points: 5, status: 'Completed', overdue: false },
            { id: 'TASK-106', title: 'Accessibility audit & WCAG AA contrast fixes', points: 3, status: 'In Progress', overdue: false },
            { id: 'TASK-109', title: 'Create interactive PR evidence inspector modal', points: 4, status: 'In Progress', overdue: false },
            { id: 'TASK-114', title: 'Implement toast notification system', points: 2, status: 'Completed', overdue: false }
          ]
        },
        {
          member_id: 'm-3',
          name: 'Marcus Vance',
          github_username: 'marcus-backend',
          role: 'Backend Developer',
          assigned_tasks: 6,
          completed_tasks: 4,
          pending_tasks: 2,
          story_points: 12,
          estimated_workload_share: 20.7,
          workload_status: 'Balanced',
          github_activity: {
            commits_last_14d: 22,
            prs_opened: 1,
            prs_merged: 1,
            review_comments_made: 6,
            last_active: '2026-10-22T16:20:00Z'
          },
          tasks: [
            { id: 'TASK-103', title: 'FastAPI endpoint for integration risk calculation', points: 5, status: 'Completed', overdue: false },
            { id: 'TASK-107', title: 'GitHub Octokit sync webhook listener', points: 4, status: 'In Progress', overdue: false },
            { id: 'TASK-111', title: 'CSV task board parser & validator service', points: 3, status: 'Completed', overdue: false }
          ]
        },
        {
          member_id: 'm-4',
          name: 'Priya Sharma',
          github_username: 'priya-qa',
          role: 'QA & Documentation',
          assigned_tasks: 4,
          completed_tasks: 2,
          pending_tasks: 2,
          story_points: 6,
          estimated_workload_share: 10.4,
          workload_status: 'Underutilized',
          github_activity: {
            commits_last_14d: 6,
            prs_opened: 0,
            prs_merged: 0,
            review_comments_made: 0,
            last_active: '2026-10-20T14:00:00Z'
          },
          tasks: [
            { id: 'TASK-105', title: 'End-to-end Cypress test suite for auth flow', points: 3, status: 'Overdue', overdue: true },
            { id: 'TASK-110', title: 'API documentation with OpenAPI / Swagger spec', points: 2, status: 'Completed', overdue: false },
            { id: 'TASK-113', title: 'Write sprint retrospective & user manual', points: 1, status: 'In Progress', overdue: false }
          ]
        }
      ]
    },

    reviews: {
      team_id: 'team-alpha',
      total_pull_requests: 12,
      reviewed_pull_requests: 6,
      unreviewed_pull_requests: 6,
      review_coverage_percent: 50.0,
      average_wait_time_hours: 58.2,
      member_participation: [
        { name: 'Alex Chen', reviews_done: 1, prs_created: 4, participation_share: 14.3 },
        { name: 'Maya Patel', reviews_done: 5, prs_created: 3, participation_share: 71.4 },
        { name: 'Marcus Vance', reviews_done: 1, prs_created: 3, participation_share: 14.3 },
        { name: 'Priya Sharma', reviews_done: 0, prs_created: 0, participation_share: 0.0 }
      ],
      pull_requests_requiring_attention: [
        {
          id: 'pr-24',
          number: 24,
          title: 'feat: add role-based authorization middleware',
          author: 'Alex Chen',
          author_username: 'alexchen-dev',
          branch: 'feature/auth-rbac',
          target_branch: 'main',
          created_at: '2026-10-19T14:30:00Z',
          waiting_hours: 94,
          status: 'Needs Review',
          reviewers: ['marcus-backend'],
          review_count: 0,
          files_changed: 14,
          additions: 480,
          deletions: 52,
          has_warning: true,
          evidence: {
            warning_title: 'Unreviewed Core Security Changes for >90 hours',
            why_warning_raised: 'This pull request modifies critical backend authentication guards but has had zero review comments since creation (over 3.9 days ago).',
            supporting_metrics: [
              { label: 'Time Waiting for Peer Review', value: '94 hours (Threshold: 48h)' },
              { label: 'Security Critical Files Modified', value: '4 core middleware files' },
              { label: 'Lines of Code Changed', value: '+480 / -52' },
              { label: 'Assigned Reviewer Response', value: 'marcus-backend (No activity)' }
            ],
            suggested_action: 'Notify Marcus Vance or reassign review to Maya Patel during standup before merging.'
          }
        },
        {
          id: 'pr-22',
          number: 22,
          title: 'refactor: decouple task sync processor from controller',
          author: 'Marcus Vance',
          author_username: 'marcus-backend',
          branch: 'refactor/sync-processor',
          target_branch: 'main',
          created_at: '2026-10-21T09:15:00Z',
          waiting_hours: 51,
          status: 'Needs Review',
          reviewers: ['alexchen-dev'],
          review_count: 0,
          files_changed: 8,
          additions: 210,
          deletions: 185,
          has_warning: true,
          evidence: {
            warning_title: 'Review Bottleneck on Team Lead',
            why_warning_raised: 'Alex Chen is the sole assigned reviewer, but Alex already has 11 assigned sprint tasks and 2 unmerged PRs.',
            supporting_metrics: [
              { label: 'Time In Queue', value: '51 hours' },
              { label: 'Reviewer Load', value: 'Alex Chen carries 44.8% sprint workload' },
              { label: 'Risk Factor', value: 'Lead bottleneck slows down backend team integration' }
            ],
            suggested_action: 'Pair with Maya Patel or Priya Sharma to perform peer review instead of waiting on the team lead.'
          }
        },
        {
          id: 'pr-21',
          number: 21,
          title: 'fix: handle missing CSV columns during task board import',
          author: 'Maya Patel',
          author_username: 'mayapatel-ui',
          branch: 'fix/csv-missing-cols',
          target_branch: 'main',
          created_at: '2026-10-21T16:00:00Z',
          waiting_hours: 44,
          status: 'Needs Review',
          reviewers: ['priya-qa'],
          review_count: 0,
          files_changed: 5,
          additions: 74,
          deletions: 12,
          has_warning: true,
          evidence: {
            warning_title: 'Reviewer Inactivity on QA Lead',
            why_warning_raised: 'Assigned reviewer Priya Sharma has 0 recorded GitHub code reviews during the current sprint cycle.',
            supporting_metrics: [
              { label: 'Time Waiting', value: '44 hours' },
              { label: 'Reviewer Sprint Reviews Completed', value: '0 PRs' },
              { label: 'Impact', value: 'Frontend fix waiting to be tested in staging' }
            ],
            suggested_action: 'Ping Priya Sharma to review or setup a 10-minute synchronous walkthrough.'
          }
        },
        {
          id: 'pr-18',
          number: 18,
          title: 'feat: add task board filter by member workload',
          author: 'Maya Patel',
          author_username: 'mayapatel-ui',
          branch: 'feat/workload-filters',
          target_branch: 'main',
          created_at: '2026-10-18T11:00:00Z',
          waiting_hours: 24,
          status: 'Approved',
          reviewers: ['alexchen-dev'],
          review_count: 2,
          files_changed: 6,
          additions: 140,
          deletions: 22,
          has_warning: false,
          evidence: {
            warning_title: 'Healthy Review Process',
            why_warning_raised: 'Reviewed and approved by Alex Chen with 2 constructive comments.',
            supporting_metrics: [
              { label: 'Review Turnaround Time', value: '22 hours (Within 48h limit)' },
              { label: 'Peer Comments', value: '2 code review suggestions incorporated' }
            ],
            suggested_action: 'Ready to merge to main branch.'
          }
        }
      ]
    },

    integration_risks: {
      team_id: 'team-alpha',
      overall_risk_level: 'High',
      summary: {
        open_unmerged_prs: 6,
        long_running_branches: 2,
        prs_waiting_over_48h: 3,
        blocked_or_overdue_dependent_tasks: 4,
        average_branch_age_days: 9.4
      },
      risks: [
        {
          id: 'ir-1',
          title: 'Long-running branch with severe divergence',
          identifier: 'feature/auth-redesign',
          risk_type: 'Branch Divergence & Merge Conflict',
          severity: 'Critical',
          branch_name: 'feature/auth-redesign',
          author: 'Alex Chen',
          measured_facts: [
            'Branch created 16 days ago without intermediate merges to main',
            'Currently 28 commits behind the target main branch',
            'Modifies 34 files, including core auth and database models',
            'Main branch has merged 6 other PRs since this branch was branched'
          ],
          possible_risks: [
            'Extremely high probability of complex three-way merge conflicts',
            'Risk of breaking user session handling for other team members currently building frontend views',
            'Substantial regression risk if merged right before capstone submission deadline'
          ],
          suggested_action: 'Freeze new feature commits on this branch. Perform git rebase/merge main immediately and resolve conflicts in a dedicated pairing session.',
          status: 'Open'
        },
        {
          id: 'ir-2',
          title: 'Blocked dependent task cascade',
          identifier: 'TASK-104 -> TASK-108 -> PR #24',
          risk_type: 'Dependency Cascade',
          severity: 'High',
          branch_name: 'feature/multi-tenancy-schema',
          author: 'Alex Chen',
          measured_facts: [
            'Database schema migration (TASK-104) is 4 days overdue',
            'Stripe webhook integration (TASK-108) cannot be tested until schema is migrated',
            'PR #24 relies on newly migrated schema fields that do not yet exist on staging'
          ],
          possible_risks: [
            'Two sprint features cannot proceed to QA testing',
            'Team members working downstream are stalled waiting on database contract stability'
          ],
          suggested_action: 'Pair Marcus Vance with Alex Chen to finalize the schema migration migration scripts today.',
          status: 'Open'
        },
        {
          id: 'ir-3',
          title: 'Stale open PR with unaddressed changes',
          identifier: 'PR #19 (feat: campus geolocation lookup)',
          risk_type: 'Stagnant Code Integration',
          severity: 'Medium',
          branch: 'feat/geo-lookup',
          author: 'Marcus Vance',
          measured_facts: [
            'PR #19 has been open for 11 days',
            'Last commit was made 8 days ago',
            'Contains 12 unmerged commits with 620 lines of code'
          ],
          possible_risks: [
            'Branch code is going stale while campus location schemas in main have changed',
            'Risk of student abandonment or redundant re-implementation'
          ],
          suggested_action: 'Check with Marcus Vance in standup whether geolocation is still in scope for this milestone, and either merge or close the branch.',
          status: 'Open'
        }
      ]
    },

    risks: [
      {
        id: 'RISK-001',
        category: 'Workload Imbalance',
        risk_level: 'High',
        title: 'Single Contributor Workload Bottleneck',
        explanation: 'Alex Chen is responsible for 44.8% of all sprint story points across 11 tasks. This concentration of effort creates a single point of failure for team velocity.',
        supporting_metrics: {
          workload_share: '44.8%',
          assigned_tasks: 11,
          team_average_share: '25.0%',
          standard_deviation: '14.2%'
        },
        related_tasks: [
          { id: 'TASK-101', title: 'Implement JWT refresh token rotation' },
          { id: 'TASK-104', title: 'Database schema migration for multi-tenancy' },
          { id: 'TASK-108', title: 'Connect Stripe webhook handler' }
        ],
        related_prs: [
          { id: 'pr-24', number: 24, title: 'feat: add role-based authorization middleware' }
        ],
        detection_timestamp: '2026-10-23T08:15:00Z',
        suggested_action: 'Reallocate at least 8 story points (e.g., Task #108 or Task #118) to Priya Sharma or Marcus Vance to balance team contribution.'
      },
      {
        id: 'RISK-002',
        category: 'Code Review Bottleneck',
        risk_level: 'High',
        title: 'Low Code Review Coverage & Unreviewed Security Code',
        explanation: 'Current review coverage is only 50%, with 3 pull requests waiting over 48 hours for their first review. Core security middleware (PR #24) has zero reviews.',
        supporting_metrics: {
          review_coverage: '50.0%',
          waiting_prs_over_48h: 3,
          average_wait_time: '58.2 hours',
          target_coverage: '> 85%'
        },
        related_tasks: [
          { id: 'TASK-101', title: 'Implement JWT refresh token rotation' }
        ],
        related_prs: [
          { id: 'pr-24', number: 24, title: 'feat: add role-based authorization middleware' },
          { id: 'pr-22', number: 22, title: 'refactor: decouple task sync processor from controller' }
        ],
        detection_timestamp: '2026-10-22T19:30:00Z',
        suggested_action: 'Implement a mandatory 2-person review rule in team agreement. Rotate review assignments so Priya Sharma handles PR #21 and Marcus handles PR #24.'
      },
      {
        id: 'RISK-003',
        category: 'Integration Risk',
        risk_level: 'Critical',
        title: 'Severe Branch Divergence on Auth Redesign',
        explanation: 'Branch feature/auth-redesign has diverged for 16 days and is 28 commits behind main, with 34 files touched. Merging without incremental synchronization will cause heavy conflict cascades.',
        supporting_metrics: {
          branch_age_days: 16,
          commits_behind_main: 28,
          touched_files: 34,
          downstream_blocked_tasks: 2
        },
        related_tasks: [
          { id: 'TASK-104', title: 'Database schema migration for multi-tenancy' },
          { id: 'TASK-108', title: 'Connect Stripe webhook handler' }
        ],
        related_prs: [
          { id: 'pr-24', number: 24, title: 'feat: add role-based authorization middleware' }
        ],
        detection_timestamp: '2026-10-23T11:00:00Z',
        suggested_action: 'Schedule a 30-minute sync session to rebase feature/auth-redesign onto main, resolve conflicts together, and merge before end of week.'
      },
      {
        id: 'RISK-004',
        category: 'Task Overdue',
        risk_level: 'Medium',
        title: 'Critical Path Tasks Overdue',
        explanation: '5 tasks are past their planned milestone deadline, including TASK-104 (Database Schema Migration) and TASK-105 (Cypress Test Suite).',
        supporting_metrics: {
          overdue_tasks_count: 5,
          days_overdue_max: 4,
          affected_milestone: 'Sprint 3 Milestone'
        },
        related_tasks: [
          { id: 'TASK-104', title: 'Database schema migration for multi-tenancy' },
          { id: 'TASK-105', title: 'End-to-end Cypress test suite for auth flow' },
          { id: 'TASK-118', title: 'Docker Compose orchestration for local staging' }
        ],
        related_prs: [],
        detection_timestamp: '2026-10-23T09:00:00Z',
        suggested_action: 'Adjust scope for Sprint 3. Move Docker Compose staging task to Sprint 4 and focus remaining capacity on database migration and Cypress tests.'
      }
    ],

    sync_status: {
      team_id: 'team-alpha',
      repository: 'squadsync-org/devpulse-capstone',
      default_branch: 'main',
      connection_type: 'Backend-Managed GitHub App',
      last_synced_at: '2026-10-23T12:30:00Z',
      status: 'success',
      sync_duration_seconds: 3.8,
      records_processed: {
        commits: 142,
        pull_requests: 12,
        reviews: 7,
        branches: 5,
        tasks_imported: 28
      },
      validation_errors: [
        {
          id: 'val-1',
          severity: 'warning',
          field: 'assignee',
          message: 'GitHub user "priya-qa" is not mapped to an external Jira/Trello handle in CSV import row 14.',
          item: 'TASK-113',
          remedy: 'Mapped automatically using email match.'
        },
        {
          id: 'val-2',
          severity: 'info',
          field: 'story_points',
          message: 'Task TASK-118 had no estimation points; defaulted to 1 point as fallback.',
          item: 'TASK-118',
          remedy: 'Please assign story points in the task board.'
        }
      ]
    }
  },

  'team-beta': {
    dashboard: {
      team_id: 'team-beta',
      team_name: 'Team Beta — CampusEats (Agile Studio)',
      repository: 'squadsync-org/campuseats-web',
      is_demo: true,
      last_updated: '2026-10-23T10:00:00Z',
      overall_risk_level: 'Low',
      metrics: {
        total_members: 5,
        total_tasks: 32,
        completed_tasks: 22,
        in_progress_tasks: 8,
        overdue_tasks: 2,
        open_pull_requests: 3,
        reviewed_pull_requests: 3,
        unreviewed_pull_requests: 0,
        review_coverage_percent: 100.0,
        average_review_wait_hours: 18.5,
        long_running_branches_count: 0
      },
      workload_summary: [
        { name: 'Sarah Lin', role: 'Frontend Lead', tasks_assigned: 7, points: 16, workload_share: 22.8, status: 'Balanced' },
        { name: 'Devon Miles', role: 'Backend Dev', tasks_assigned: 7, points: 15, workload_share: 21.4, status: 'Balanced' },
        { name: 'Jordan Kim', role: 'Fullstack Dev', tasks_assigned: 6, points: 14, workload_share: 20.0, status: 'Balanced' },
        { name: 'Chloe Dubois', role: 'API / Database', tasks_assigned: 6, points: 13, workload_share: 18.6, status: 'Balanced' },
        { name: 'Zane Torres', role: 'Testing & CI/CD', tasks_assigned: 6, points: 12, workload_share: 17.2, status: 'Balanced' }
      ],
      review_participation_summary: [
        { name: 'Sarah Lin', prs_authored: 2, reviews_conducted: 3, review_ratio: 1.5 },
        { name: 'Devon Miles', prs_authored: 2, reviews_conducted: 2, review_ratio: 1.0 },
        { name: 'Jordan Kim', prs_authored: 1, reviews_conducted: 3, review_ratio: 3.0 },
        { name: 'Chloe Dubois', prs_authored: 2, reviews_conducted: 2, review_ratio: 1.0 },
        { name: 'Zane Torres', prs_authored: 1, reviews_conducted: 2, review_ratio: 2.0 }
      ],
      integration_risk_indicators: {
        risk_level: 'Low',
        open_unmerged_prs: 3,
        stale_prs_over_48h: 0,
        long_lived_branches: 0,
        blocked_tasks: 0,
        top_warning: 'Collaboration healthy: 100% PR review coverage and balanced workload distribution.'
      },
      recent_warnings: [
        {
          id: 'warn-201',
          category: 'Healthy Collaboration',
          level: 'Low',
          title: 'High Peer Review Engagement',
          explanation: 'All 3 open pull requests have received constructive peer reviews within an average turnaround time of 18.5 hours.',
          suggested_action: 'Continue current sprint cadence.',
          timestamp: '2026-10-23T09:30:00Z'
        }
      ]
    },

    members: [
      { id: 'mb-1', name: 'Sarah Lin', github_username: 'sarahlin-fe', role: 'Frontend Lead', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face' },
      { id: 'mb-2', name: 'Devon Miles', github_username: 'devon-miles', role: 'Backend Dev', avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face' },
      { id: 'mb-3', name: 'Jordan Kim', github_username: 'jordankim-fs', role: 'Fullstack Dev', avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face' },
      { id: 'mb-4', name: 'Chloe Dubois', github_username: 'chloe-db', role: 'API / Database', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face' },
      { id: 'mb-5', name: 'Zane Torres', github_username: 'zane-qa', role: 'Testing & CI/CD', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' }
    ],

    workload: {
      team_id: 'team-beta',
      total_story_points: 70,
      total_tasks: 32,
      methodology_note: 'Workload share combines task difficulty estimation (story points) and active assigned tasks.',
      members: [
        {
          member_id: 'mb-1',
          name: 'Sarah Lin',
          github_username: 'sarahlin-fe',
          role: 'Frontend Lead',
          assigned_tasks: 7,
          completed_tasks: 5,
          pending_tasks: 2,
          story_points: 16,
          estimated_workload_share: 22.8,
          workload_status: 'Balanced',
          github_activity: { commits_last_14d: 28, prs_opened: 2, prs_merged: 2, review_comments_made: 8, last_active: '2026-10-23T11:00:00Z' },
          tasks: [
            { id: 'TB-101', title: 'Cart checkout UI components', points: 5, status: 'Completed', overdue: false },
            { id: 'TB-102', title: 'Vendor menu item customization modal', points: 5, status: 'Completed', overdue: false }
          ]
        },
        {
          member_id: 'mb-2',
          name: 'Devon Miles',
          github_username: 'devon-miles',
          role: 'Backend Dev',
          assigned_tasks: 7,
          completed_tasks: 5,
          pending_tasks: 2,
          story_points: 15,
          estimated_workload_share: 21.4,
          workload_status: 'Balanced',
          github_activity: { commits_last_14d: 31, prs_opened: 2, prs_merged: 2, review_comments_made: 6, last_active: '2026-10-23T10:30:00Z' },
          tasks: [
            { id: 'TB-103', title: 'Payment intent API endpoint', points: 5, status: 'Completed', overdue: false }
          ]
        },
        {
          member_id: 'mb-3',
          name: 'Jordan Kim',
          github_username: 'jordankim-fs',
          role: 'Fullstack Dev',
          assigned_tasks: 6,
          completed_tasks: 4,
          pending_tasks: 2,
          story_points: 14,
          estimated_workload_share: 20.0,
          workload_status: 'Balanced',
          github_activity: { commits_last_14d: 22, prs_opened: 1, prs_merged: 1, review_comments_made: 9, last_active: '2026-10-23T09:45:00Z' },
          tasks: [
            { id: 'TB-104', title: 'Delivery order status tracker component', points: 5, status: 'In Progress', overdue: false }
          ]
        },
        {
          member_id: 'mb-4',
          name: 'Chloe Dubois',
          github_username: 'chloe-db',
          role: 'API / Database',
          assigned_tasks: 6,
          completed_tasks: 4,
          pending_tasks: 2,
          story_points: 13,
          estimated_workload_share: 18.6,
          workload_status: 'Balanced',
          github_activity: { commits_last_14d: 25, prs_opened: 2, prs_merged: 2, review_comments_made: 7, last_active: '2026-10-22T18:00:00Z' },
          tasks: [
            { id: 'TB-105', title: 'PostgreSQL spatial query for campus dining locations', points: 5, status: 'Completed', overdue: false }
          ]
        },
        {
          member_id: 'mb-5',
          name: 'Zane Torres',
          github_username: 'zane-qa',
          role: 'Testing & CI/CD',
          assigned_tasks: 6,
          completed_tasks: 4,
          pending_tasks: 2,
          story_points: 12,
          estimated_workload_share: 17.2,
          workload_status: 'Balanced',
          github_activity: { commits_last_14d: 19, prs_opened: 1, prs_merged: 1, review_comments_made: 8, last_active: '2026-10-23T08:30:00Z' },
          tasks: [
            { id: 'TB-106', title: 'Playwright end-to-end checkout flow test', points: 4, status: 'Completed', overdue: false }
          ]
        }
      ]
    },

    reviews: {
      team_id: 'team-beta',
      total_pull_requests: 10,
      reviewed_pull_requests: 10,
      unreviewed_pull_requests: 0,
      review_coverage_percent: 100.0,
      average_wait_time_hours: 18.5,
      member_participation: [
        { name: 'Sarah Lin', reviews_done: 3, prs_created: 2, participation_share: 25.0 },
        { name: 'Devon Miles', reviews_done: 2, prs_created: 2, participation_share: 16.7 },
        { name: 'Jordan Kim', reviews_done: 3, prs_created: 1, participation_share: 25.0 },
        { name: 'Chloe Dubois', reviews_done: 2, prs_created: 2, participation_share: 16.7 },
        { name: 'Zane Torres', reviews_done: 2, prs_created: 1, participation_share: 16.7 }
      ],
      pull_requests_requiring_attention: [
        {
          id: 'pr-tb-12',
          number: 12,
          title: 'feat: apply promo code discount at checkout',
          author: 'Sarah Lin',
          author_username: 'sarahlin-fe',
          branch: 'feat/promo-codes',
          target_branch: 'main',
          created_at: '2026-10-23T07:00:00Z',
          waiting_hours: 5,
          status: 'Needs Review',
          reviewers: ['jordankim-fs'],
          review_count: 1,
          files_changed: 4,
          additions: 110,
          deletions: 14,
          has_warning: false,
          evidence: {
            warning_title: 'Normal In-Progress Review',
            why_warning_raised: 'Jordan Kim has started initial review, awaiting final approval.',
            supporting_metrics: [
              { label: 'Time In Queue', value: '5 hours (Healthy)' },
              { label: 'Reviewer', value: 'Jordan Kim' }
            ],
            suggested_action: 'No intervention required.'
          }
        }
      ]
    },

    integration_risks: {
      team_id: 'team-beta',
      overall_risk_level: 'Low',
      summary: {
        open_unmerged_prs: 3,
        long_running_branches: 0,
        prs_waiting_over_48h: 0,
        blocked_or_overdue_dependent_tasks: 0,
        average_branch_age_days: 2.1
      },
      risks: []
    },

    risks: [
      {
        id: 'RISK-010',
        category: 'Task Overdue',
        risk_level: 'Low',
        title: 'Minor Overdue Documentation Tasks',
        explanation: 'Two non-blocking sprint documentation tickets are slightly past due.',
        supporting_metrics: {
          overdue_tasks_count: 2,
          impact: 'Non-blocking'
        },
        related_tasks: [
          { id: 'TB-109', title: 'Update deployment runbook' }
        ],
        related_prs: [],
        detection_timestamp: '2026-10-23T09:00:00Z',
        suggested_action: 'Complete during sprint wrap-up.'
      }
    ],

    sync_status: {
      team_id: 'team-beta',
      repository: 'squadsync-org/campuseats-web',
      default_branch: 'main',
      connection_type: 'Backend-Managed GitHub App',
      last_synced_at: '2026-10-23T10:00:00Z',
      status: 'success',
      sync_duration_seconds: 2.4,
      records_processed: {
        commits: 185,
        pull_requests: 10,
        reviews: 12,
        branches: 3,
        tasks_imported: 32
      },
      validation_errors: []
    }
  }
};
