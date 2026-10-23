"""
SquadSync Comprehensive Automated Test Suite.
Validates authentication, multi-tenant team management, invitation workflow,
authorization guards, task management, contributor mapping, GitHub integration,
analytics engine calculation, risk detection, and API endpoints.
"""

import os
import sys
import unittest
import json
import time
from unittest.mock import patch
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure backend directory is in python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from main import app
from auth import hash_password, verify_password, create_user
from analytics import apply_known_repository_people, calculate_analytics
from database import (
    save_repository_config,
    get_repository_config,
    get_internal_repo_credentials,
    update_repository_sync_snapshot,
    get_latest_analytics,
    save_team_tasks,
    get_team_tasks,
    get_team_members,
    DB_PATH
)
from github_client import validate_repository

class SquadSyncTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        timestamp = int(time.time())
        cls.lead_email = f"lead.{timestamp}@squadsync.edu"
        cls.member_email = f"dev.{timestamp}@squadsync.edu"
        cls.intruder_email = f"intruder.{timestamp}@squadsync.edu"
        cls.password = "SquadSyncSecure2026!"

        # Register lead
        resp = cls.client.post("/api/v1/auth/register", json={
            "name": "Team Lead Alice",
            "email": cls.lead_email,
            "password": cls.password,
            "role": "Team Lead"
        })
        assert resp.status_code == 201, f"Lead registration failed: {resp.text}"
        cls.lead_token = resp.json()["token"]
        cls.lead_id = resp.json()["user"]["id"]
        cls.lead_headers = {"Authorization": f"Bearer {cls.lead_token}"}

        # Register member
        resp_m = cls.client.post("/api/v1/auth/register", json={
            "name": "Developer Bob",
            "email": cls.member_email,
            "password": cls.password,
            "role": "Software Developer"
        })
        assert resp_m.status_code == 201, f"Member registration failed: {resp_m.text}"
        cls.member_token = resp_m.json()["token"]
        cls.member_id = resp_m.json()["user"]["id"]
        cls.member_headers = {"Authorization": f"Bearer {cls.member_token}"}

        # Register intruder (unauthorized to other teams)
        resp_i = cls.client.post("/api/v1/auth/register", json={
            "name": "Intruder Eve",
            "email": cls.intruder_email,
            "password": cls.password,
            "role": "Guest"
        })
        assert resp_i.status_code == 201, f"Intruder registration failed: {resp_i.text}"
        cls.intruder_token = resp_i.json()["token"]
        cls.intruder_id = resp_i.json()["user"]["id"]
        cls.intruder_headers = {"Authorization": f"Bearer {cls.intruder_token}"}

        # Create primary testing team
        t_resp = cls.client.post("/api/v1/teams", json={
            "name": "Titan Squad",
            "description": "Integration and Workload Platform Team"
        }, headers=cls.lead_headers)
        assert t_resp.status_code == 201, f"Team creation failed: {t_resp.text}"
        cls.team_id = t_resp.json()["data"]["id"]

    def test_01_user_registration_and_authentication(self):
        """Test user login, JWT issuance, and /auth/me profile verification."""
        login_resp = self.client.post("/api/v1/auth/login", json={
            "email": self.lead_email,
            "password": self.password
        })
        self.assertEqual(login_resp.status_code, 200)
        data = login_resp.json()
        self.assertIn("token", data)
        self.assertEqual(data["user"]["email"], self.lead_email)

        me_resp = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {data['token']}"})
        self.assertEqual(me_resp.status_code, 200)
        self.assertEqual(me_resp.json()["user"]["id"], self.lead_id)

    def test_02_team_creation_and_membership_authorization(self):
        """Test team creation, role assignment, and unauthorized team boundary enforcement."""
        # 1. Check team listing for lead
        lead_teams = self.client.get("/api/v1/teams", headers=self.lead_headers).json()["data"]
        self.assertTrue(any(t["id"] == self.team_id for t in lead_teams))
        lead_team = next(t for t in lead_teams if t["id"] == self.team_id)
        self.assertEqual(lead_team["name"], "Titan Squad")
        self.assertEqual(lead_team["user_role"], "team_lead")

        # 2. Eve (intruder) must NOT see lead's team and must be 403 FORBIDDEN when attempting access
        intruder_teams = self.client.get("/api/v1/teams", headers=self.intruder_headers).json()["data"]
        self.assertFalse(any(t["id"] == self.team_id for t in intruder_teams))

        forbidden_resp = self.client.get(f"/api/v1/teams/{self.team_id}", headers=self.intruder_headers)
        self.assertEqual(forbidden_resp.status_code, 403)
        self.assertTrue(
            "permission" in forbidden_resp.json()["detail"].lower() or "access denied" in forbidden_resp.json()["detail"].lower()
        )

        # 3. Lead updates team details
        update_resp = self.client.put(f"/api/v1/teams/{self.team_id}", json={
            "name": "Titan Squad v2",
            "description": "Updated Description"
        }, headers=self.lead_headers)
        self.assertEqual(update_resp.status_code, 200)
        self.assertEqual(update_resp.json()["data"]["name"], "Titan Squad v2")

    def test_03_team_invitation_and_acceptance_workflow(self):
        """Test inviting a user by email, checking pending invitations, and accepting."""
        # 1. Lead invites Developer Bob
        inv_resp = self.client.post(f"/api/v1/teams/{self.team_id}/invitations", json={
            "email": self.member_email,
            "role": "developer"
        }, headers=self.lead_headers)
        self.assertEqual(inv_resp.status_code, 201)
        invitation = inv_resp.json()["data"]
        inv_id = invitation["id"]
        self.assertEqual(invitation["email"], self.member_email)
        self.assertEqual(invitation["status"], "pending")

        # 2. Check pending invitations for Developer Bob
        pending_resp = self.client.get("/api/v1/invitations/pending", headers=self.member_headers)
        self.assertEqual(pending_resp.status_code, 200)
        pending_list = pending_resp.json()["data"]
        self.assertTrue(any(p["id"] == inv_id for p in pending_list))

        # 3. Bob accepts the invitation
        accept_resp = self.client.post(f"/api/v1/invitations/{inv_id}/respond", json={
            "action": "accept"
        }, headers=self.member_headers)
        self.assertEqual(accept_resp.status_code, 200)

        # 4. Verify Bob is now an official team member
        members_resp = self.client.get(f"/api/v1/teams/{self.team_id}/members", headers=self.lead_headers)
        self.assertEqual(members_resp.status_code, 200)
        members = members_resp.json()["data"]
        bob_member = next((m for m in members if m["user_id"] == self.member_id), None)
        self.assertIsNotNone(bob_member)
        self.assertEqual(bob_member["role"], "developer")

    def test_04_contributor_github_username_mapping(self):
        """Test mapping a GitHub username to an existing team member."""
        map_resp = self.client.put(
            f"/api/v1/teams/{self.team_id}/members/{self.member_id}/github",
            json={"github_username": "bob-dev-gh"},
            headers=self.lead_headers
        )
        self.assertEqual(map_resp.status_code, 200)
        self.assertEqual(map_resp.json()["github_username"], "bob-dev-gh")

        # Check members list reflects the mapped GitHub username
        members = self.client.get(f"/api/v1/teams/{self.team_id}/members", headers=self.lead_headers).json()["data"]
        bob = next(m for m in members if m["user_id"] == self.member_id)
        self.assertEqual(bob["github_username"], "bob-dev-gh")

    def test_05_task_management_crud_and_status_transitions(self):
        """Test database-backed task creation, assignment, role checks, and status changes."""
        # 1. Lead creates a task assigned to Bob
        task_create_resp = self.client.post(f"/api/v1/teams/{self.team_id}/tasks", json={
            "title": "Build Integration Engine",
            "description": "Implement core algorithms for branch divergence and PR analysis.",
            "assignee_id": self.member_id,
            "priority": "High",
            "story_points": 8.0,
            "estimated_hours": 16.0,
            "due_date": "2026-11-01"
        }, headers=self.lead_headers)
        self.assertEqual(task_create_resp.status_code, 201)
        task = task_create_resp.json()["data"]
        task_id = task["id"]
        self.assertEqual(task["title"], "Build Integration Engine")
        self.assertEqual(task["assignee_id"], self.member_id)
        self.assertEqual(task["assignee_github_username"], "bob-dev-gh")
        self.assertEqual(task["status"], "Todo")

        # 2. Bob (assigned developer) updates task status to 'In Progress'
        status_resp = self.client.patch(
            f"/api/v1/teams/{self.team_id}/tasks/{task_id}/status",
            json={"status": "In Progress"},
            headers=self.member_headers
        )
        self.assertEqual(status_resp.status_code, 200)
        self.assertEqual(status_resp.json()["data"]["status"], "In Progress")

        # 3. Eve (intruder) cannot update or view tasks in this team
        eve_status_resp = self.client.patch(
            f"/api/v1/teams/{self.team_id}/tasks/{task_id}/status",
            json={"status": "Completed"},
            headers=self.intruder_headers
        )
        self.assertEqual(eve_status_resp.status_code, 403)

        # 4. List tasks filterable by status
        tasks_list_resp = self.client.get(f"/api/v1/teams/{self.team_id}/tasks?status=In Progress", headers=self.lead_headers)
        self.assertEqual(tasks_list_resp.status_code, 200)
        tasks = tasks_list_resp.json()["data"]
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["id"], task_id)

    def test_06_analytics_calculation_engine_and_decoupling(self):
        """
        Verify analytics calculation logic against mandatory rules:
        - Workload does NOT use commit count alone.
        - Unreviewed PRs strictly identify PRs without peer reviews.
        - Merge conflicts are ONLY flagged if verified (pr.mergeable is False).
        - Facts are strictly distinguished from risks.
        """
        mock_github = {
            "repository": {
                "id": 1001,
                "name": "titan-platform",
                "full_name": "squadsync-org/titan-platform",
                "owner": "squadsync-org",
                "default_branch": "main",
                "is_private": False
            },
            "contributors": [
                {"login": "alice", "avatar_url": "https://avatar/alice", "contributions": 50},
                {"login": "bob-dev-gh", "avatar_url": "https://avatar/bob", "contributions": 0}
            ],
            "collaborators": [
                {"id": 103, "login": "prathameshwandhare7-lab", "avatar_url": "https://avatar/prathamesh", "role_name": "write"},
                {"id": 104, "login": "siddhishinde06", "avatar_url": "https://avatar/siddhi", "role_name": "write"}
            ],
            "github_invitations": [
                {"id": 201, "invitee_login": "MadhaviPant", "invitee_avatar": "https://avatar/madhavi"},
                {"id": 202, "invitee_login": "Pratham3536", "invitee_avatar": "https://avatar/prathamesh-invite"}
            ],
            "commits": [
                {"sha": "c1", "author_login": "alice", "date": "2026-10-23T10:00:00Z"}
            ],
            "branches": [
                {"name": "main", "sha": "c1"},
                {"name": "feature-titan", "sha": "c2"}
            ],
            "branch_comparisons": {
                "feature-titan": {"status": "behind", "ahead_by": 2, "behind_by": 15, "total_commits": 17}
            },
            "pull_requests": [
                {
                    "id": "pr-10",
                    "number": 10,
                    "title": "Titan Engine PR",
                    "state": "open",
                    "author": "bob-dev-gh",
                    "head_branch": "feature-titan",
                    "base_branch": "main",
                    "created_at": "2026-10-12T12:00:00Z", # > 7 days old
                    "mergeable": False, # Verified Conflict!
                    "reviews": [
                        {"reviewer": "bob-dev-gh", "state": "APPROVED", "is_self_review": True, "submitted_at": "2026-10-12T13:00:00Z"}
                    ],
                    "requested_reviewers": ["alice"]
                }
            ],
            "issues": []
        }

        mock_custom_tasks = [
            {
                "task_id": "TSK-001",
                "title": "Build Integration Engine",
                "assignee_github_username": "bob-dev-gh",
                "assignee_id": self.member_id,
                "story_points": 8.0,
                "status": "In Progress"
            }
        ]

        mock_team_members = [
            {"user_id": self.lead_id, "name": "Alice", "github_username": "alice", "role": "team_lead"},
            {"user_id": self.member_id, "name": "Bob", "github_username": "bob-dev-gh", "role": "developer"}
        ]

        analytics = calculate_analytics(
            github_data=mock_github,
            custom_tasks=mock_custom_tasks,
            team_members=mock_team_members
        )

        # 1. Verify Repository and Live Flag
        self.assertEqual(analytics["repository"], "squadsync-org/titan-platform")
        self.assertFalse(analytics["is_demo"])

        # 2. Verify Workload Decoupling: Alice has 50 commits, but Bob has story points!
        members = {m["github_username"]: m for m in analytics["workload_data"]["members"]}
        self.assertIn("alice", members)
        self.assertIn("bob-dev-gh", members)
        self.assertIn("prathameshwandhare7-lab", members)
        self.assertIn("siddhishinde06", members)
        self.assertIn("MadhaviPant", members)
        self.assertIn("Pratham3536", members)
        self.assertEqual(members["prathameshwandhare7-lab"]["repository_status"], "collaborator")
        self.assertEqual(members["MadhaviPant"]["workload_status"], "Pending Invitation")
        self.assertEqual(analytics["metrics"]["total_members"], 6)
        self.assertEqual(analytics["metrics"]["total_team_members"], 2)
        # Bob has 0 commits, but 8 story points assigned!
        self.assertEqual(members["bob-dev-gh"]["story_points"], 8.0)
        self.assertGreater(members["bob-dev-gh"]["estimated_workload_share"], 0)

        known_people_github = apply_known_repository_people({
            **mock_github,
            "repository": {
                **mock_github["repository"],
                "full_name": "amruta-2005/SquadSync"
            },
            "collaborators": [
                {"login": "prathameshwandhare7-lab", "permissions": {"push": True}}
            ],
            "github_invitations": [
                {"id": 501, "invitee_login": "madhavipant"}
            ]
        })
        self.assertEqual(len(known_people_github["collaborators"]), 2)
        self.assertEqual(len(known_people_github["contributors"]), 3)
        self.assertEqual(len(known_people_github["github_invitations"]), 1)
        madhavi_contributor = next(
            person for person in known_people_github["contributors"]
            if person["login"].lower() == "madhavipant"
        )
        self.assertEqual(madhavi_contributor["name"], "Madhavi Pant")
        self.assertIsNone(madhavi_contributor["contributions"])
        known_people_analytics = calculate_analytics(
            github_data=known_people_github,
            custom_tasks=[],
            team_members=mock_team_members
        )
        known_people = {
            member["github_username"].lower(): member
            for member in known_people_analytics["workload_data"]["members"]
        }
        self.assertEqual(known_people["prathameshwandhare7-lab"]["name"], "Prathamesh Wandhare")
        self.assertEqual(known_people["siddhishinde06"]["name"], "Siddhi Shinde")
        self.assertEqual(known_people["madhavipant"]["name"], "Madhavi Pant")
        self.assertEqual(known_people["pratham3536"]["name"], "Prathamesh Wandhare")
        self.assertEqual(known_people["madhavipant"]["repository_status"], "contributor")
        self.assertEqual(known_people["madhavipant"]["github_activity"]["commits_count"], 0)
        self.assertEqual(known_people["pratham3536"]["workload_status"], "Pending Invitation")
        self.assertEqual(known_people["siddhishinde06"]["assigned_tasks"], 0)

        # 3. Verify Code Review Analysis: self-reviews ignored, unreviewed flagged
        reviews = analytics["reviews_data"]
        self.assertEqual(reviews["total_pull_requests"], 1)
        self.assertEqual(reviews["unreviewed_pull_requests"], 1)
        self.assertEqual(reviews["reviewed_pull_requests"], 0)

        no_task_data_github = {**mock_github, "pull_requests": [], "commits": []}
        no_task_analytics = calculate_analytics(
            github_data=no_task_data_github,
            custom_tasks=[],
            team_members=mock_team_members
        )
        no_task_members = {
            member["github_username"]: member
            for member in no_task_analytics["workload_data"]["members"]
        }
        self.assertEqual(no_task_members["alice"]["workload_status"], "No Task Data")
        self.assertEqual(no_task_members["prathameshwandhare7-lab"]["estimated_workload_share"], 0)
        self.assertEqual(no_task_members["MadhaviPant"]["workload_status"], "Pending Invitation")

        # 4. Verify Verified Merge Conflicts & Branch Divergence
        risks = analytics["risks_ledger"]
        conflict_risks = [r for r in risks if r["risk_type"] == "Verified Conflict"]
        self.assertEqual(len(conflict_risks), 1, "Verified conflict must be detected")
        self.assertIn("PR #10", conflict_risks[0]["title"])

        divergence_risks = [r for r in risks if r["risk_type"] == "Branch Divergence"]
        self.assertEqual(len(divergence_risks), 1, "Branch divergence must be detected")

        # 5. Onboarding checklist exists
        self.assertIn("onboarding_checklist", analytics)
        self.assertTrue(analytics["onboarding_checklist"]["tasks_created"])

    def test_07_persisted_snapshot_analytics_endpoints(self):
        """Test full analytics endpoints after synchronizing snapshot in SQLite."""
        save_repository_config(
            user_id=self.lead_id,
            team_id=self.team_id,
            repo_owner="squadsync-org",
            repo_name="titan-platform",
            branch="main",
            github_token="ghp_SecretMockTokenForTest12345"
        )

        mock_analytics = {
            "repository": "squadsync-org/titan-platform",
            "last_updated": "2026-10-23T15:30:00Z",
            "overall_risk_level": "High",
            "is_demo": False,
            "metrics": {
                "total_members": 2,
                "total_tasks": 1,
                "completed_tasks": 0,
                "in_progress_tasks": 1,
                "overdue_tasks": 0,
                "open_pull_requests": 1,
                "reviewed_pull_requests": 0,
                "unreviewed_pull_requests": 1,
                "review_coverage_percent": 0.0,
                "average_review_wait_hours": 48.0,
                "long_running_branches_count": 1
            },
            "workload_summary": [
                {"name": "Developer Bob", "role": "Developer", "tasks_assigned": 1, "points": 8.0, "workload_share": 100.0, "status": "Balanced"}
            ],
            "review_participation_summary": [],
            "integration_risk_indicators": {
                "risk_level": "High",
                "open_unmerged_prs": 1,
                "stale_prs_over_48h": 1,
                "long_lived_branches": 1,
                "blocked_tasks": 0,
                "top_warning": "Branch 'feature-titan' diverged from main"
            },
            "recent_warnings": [
                {
                    "id": "warn-1",
                    "category": "Branch Divergence",
                    "level": "High",
                    "title": "Branch 'feature-titan' diverged from main",
                    "explanation": "Branch is 15 commits behind main.",
                    "suggested_action": "Rebase feature branch on main.",
                    "timestamp": "2026-10-23T15:30:00Z"
                }
            ],
            "workload_data": {
                "total_story_points": 8.0,
                "total_tasks": 1,
                "members": [
                    {"name": "Developer Bob", "story_points": 8.0, "assigned_tasks": 1, "estimated_workload_share": 100.0, "workload_status": "Balanced", "tasks": []}
                ]
            },
            "reviews_data": {
                "total_pull_requests": 1,
                "reviewed_pull_requests": 0,
                "unreviewed_pull_requests": 1,
                "review_coverage_percent": 0.0,
                "average_wait_time_hours": 48.0,
                "pull_requests_requiring_attention": []
            },
            "integration_risks_data": {
                "overall_risk_level": "High",
                "summary": {"open_unmerged_prs": 1, "long_running_branches": 1},
                "risks": []
            },
            "risks_ledger": [
                {
                    "id": "risk-1",
                    "category": "Branch Divergence",
                    "risk_level": "High",
                    "severity": "High",
                    "title": "Branch 'feature-titan' diverged",
                    "explanation": "Diverged by 15 commits.",
                    "measured_facts": ["15 commits behind main"],
                    "possible_risks": ["Merge conflict risk"],
                    "suggested_action": "Merge main into branch"
                }
            ],
            "onboarding_checklist": {
                "team_created": True,
                "members_invited": True,
                "tasks_created": True,
                "repo_connected": True,
                "contributors_mapped": True,
                "first_analysis_completed": True,
                "is_complete": True
            }
        }

        update_repository_sync_snapshot(
            user_id=self.lead_id,
            team_id=self.team_id,
            raw_data={
                "repository": {
                    "full_name": "squadsync-org/titan-platform",
                    "owner": "squadsync-org",
                    "name": "titan-platform"
                },
                "contributors": [
                    {"id": 101, "login": "alice", "avatar_url": "https://avatar/alice", "html_url": "https://github.com/alice", "contributions": 50, "type": "User"},
                    {"id": 102, "login": "bob", "avatar_url": "https://avatar/bob", "html_url": "https://github.com/bob", "contributions": 25, "type": "User"},
                    {"id": 103, "login": "carol", "avatar_url": "https://avatar/carol", "html_url": "https://github.com/carol", "contributions": 12, "type": "User"},
                    {"id": 104, "login": "dan", "avatar_url": "https://avatar/dan", "html_url": "https://github.com/dan", "contributions": 4, "type": "User"}
                ],
                "collaborators": [
                    {"id": 101, "login": "alice", "permissions": {"push": True}, "role_name": "write"},
                    {"id": 105, "login": "erin", "permissions": {"pull": True}, "role_name": "read"}
                ],
                "github_invitations": [
                    {"id": 201, "invitee_login": "madhavi", "invitee_avatar": "https://avatar/madhavi"},
                    {"id": 202, "invitee_login": "prathamesh", "invitee_avatar": "https://avatar/prathamesh"}
                ],
                "contributors_warning": "GitHub contributor request was rate limited.",
                "collaborators_warning": "Some collaborator details are unavailable."
            },
            analytics_data=mock_analytics,
            sync_status="success",
            sync_message="Test sync verified"
        )

        # 1. /dashboard
        dash_res = self.client.get(f"/api/v1/teams/{self.team_id}/dashboard", headers=self.lead_headers)
        self.assertEqual(dash_res.status_code, 200)
        d_data = dash_res.json()["data"]
        self.assertFalse(d_data["is_demo"])
        self.assertEqual(d_data["repository"], "squadsync-org/titan-platform")
        self.assertEqual(d_data["metrics"]["total_github_contributors"], 4)
        self.assertEqual(len(d_data["github_contributors"]), 4)
        self.assertEqual(d_data["github_contributors"][0]["login"], "alice")
        self.assertEqual(d_data["github_contributors"][0]["id"], 101)
        self.assertEqual(d_data["github_contributors"][0]["contributions"], 50)
        self.assertEqual(
            d_data["github_contributors_warning"],
            "GitHub contributor request was rate limited."
        )
        self.assertEqual(d_data["metrics"]["total_github_collaborators"], 2)
        self.assertEqual(len(d_data["github_collaborators"]), 2)
        self.assertTrue(d_data["github_collaborators"][0]["permissions"]["push"])
        self.assertEqual(d_data["metrics"]["total_github_invitations"], 2)
        self.assertEqual(len(d_data["github_invitations"]), 2)
        self.assertEqual(d_data["github_invitations"][0]["invitee_login"], "madhavi")
        self.assertEqual(
            d_data["github_collaborators_warning"],
            "Some collaborator details are unavailable."
        )

        sync_status_resp = self.client.get(
            f"/api/v1/teams/{self.team_id}/sync-status",
            headers=self.lead_headers
        )
        self.assertEqual(sync_status_resp.status_code, 200)
        sync_records = sync_status_resp.json()["data"]["records_processed"]
        self.assertEqual(sync_records["github_contributors"], 4)
        self.assertEqual(sync_records["github_collaborators"], 2)
        self.assertEqual(sync_records["github_invitations"], 2)
        self.assertEqual(sync_records["team_members"], 2)
        self.assertIn(
            "Some collaborator details are unavailable.",
            sync_status_resp.json()["data"]["validation_errors"]
        )
        self.assertIn(
            "GitHub contributor request was rate limited.",
            sync_status_resp.json()["data"]["validation_errors"]
        )

        # 2. /workload
        work_res = self.client.get(f"/api/v1/teams/{self.team_id}/workload", headers=self.lead_headers)
        self.assertEqual(work_res.status_code, 200)
        self.assertEqual(len(work_res.json()["data"]["members"]), 1)

        # 3. /reviews
        rev_res = self.client.get(f"/api/v1/teams/{self.team_id}/reviews", headers=self.lead_headers)
        self.assertEqual(rev_res.status_code, 200)
        self.assertEqual(rev_res.json()["data"]["total_pull_requests"], 1)

        # 4. /integration-risks
        int_res = self.client.get(f"/api/v1/teams/{self.team_id}/integration-risks", headers=self.lead_headers)
        self.assertEqual(int_res.status_code, 200)
        self.assertEqual(int_res.json()["data"]["overall_risk_level"], "High")

        # 5. /risks
        risks_res = self.client.get(f"/api/v1/teams/{self.team_id}/risks", headers=self.lead_headers)
        self.assertEqual(risks_res.status_code, 200)
        self.assertEqual(len(risks_res.json()["data"]), 1)

        github_assignee_resp = self.client.post(
            f"/api/v1/teams/{self.team_id}/tasks",
            json={
                "title": "Prepare collaborator task",
                "assignee_github_username": "erin",
                "assignee_name": "Erin Collaborator"
            },
            headers=self.lead_headers
        )
        self.assertEqual(github_assignee_resp.status_code, 201)
        github_assigned_task = github_assignee_resp.json()["data"]
        self.assertEqual(github_assigned_task["assignee_id"], "")
        self.assertEqual(github_assigned_task["assignee_github_username"], "erin")
        self.assertEqual(github_assigned_task["assignee_name"], "Erin Collaborator")

        invalid_github_assignee_resp = self.client.post(
            f"/api/v1/teams/{self.team_id}/tasks",
            json={
                "title": "Reject unknown account task",
                "assignee_github_username": "not-a-repository-person"
            },
            headers=self.lead_headers
        )
        self.assertEqual(invalid_github_assignee_resp.status_code, 400)

    def test_08_csv_task_board_import(self):
        """Test CSV task board import into database for the team."""
        csv_content = (
            "task_id,title,assignee_github_username,story_points,status,due_date\n"
            "TASK-801,Setup OAuth2 provider,bob-dev-gh,5,Completed,2026-10-20\n"
            "TASK-802,Build Risk Radar Chart,bob-dev-gh,8,In Progress,2026-10-28\n"
        )

        files = {"file": ("tasks_export.csv", csv_content.encode("utf-8"), "text/csv")}
        import_resp = self.client.post(f"/api/v1/teams/{self.team_id}/tasks/import", files=files, headers=self.lead_headers)
        self.assertEqual(import_resp.status_code, 200)
        self.assertEqual(import_resp.json()["rows_processed"], 2)

        # Verify saved tasks in DB
        saved_tasks = get_team_tasks(self.team_id)
        self.assertGreaterEqual(len(saved_tasks), 3)

    def test_09_github_validation_and_rate_limit_handling(self):
        """Test repository validation behavior, error feedback, and rate limit safeguards."""
        connect_resp = self.client.post(f"/api/v1/teams/{self.team_id}/github", json={
            "repo_owner": "nonexistent-user-123456789-xyz",
            "repo_name": "nonexistent-repo-987654321-abc",
            "branch": "main"
        }, headers=self.lead_headers)

        self.assertEqual(connect_resp.status_code, 400)
        detail = connect_resp.json().get("detail", "")
        self.assertTrue(
            any(k in detail.lower() for k in ["not found", "rate limit", "failed to contact github", "getaddrinfo", "cannot access", "authentication failed"]),
            f"Expected error detail to be specific and actionable, got: {detail}"
        )

    def test_10_contributor_mapping_and_unmapping(self):
        """Test contributor mapping endpoint, duplicate prevention, and unmapping."""
        # 1. Fetch contributor mapping endpoint
        map_resp = self.client.get(f"/api/v1/teams/{self.team_id}/contributor-mapping", headers=self.lead_headers)
        self.assertEqual(map_resp.status_code, 200)
        data = map_resp.json()["data"]
        self.assertIn("team_members", data)
        self.assertIn("github_contributors", data)
        self.assertIn("github_collaborators", data)
        self.assertIn("team_invitations", data)

        # 2. Map lead to octocat-lead
        m_resp = self.client.put(
            f"/api/v1/teams/{self.team_id}/members/{self.lead_id}/github",
            json={"github_username": "octocat-lead"},
            headers=self.lead_headers
        )
        self.assertEqual(m_resp.status_code, 200)

        # 3. Attempt to map member to same username (should be rejected as duplicate)
        dup_resp = self.client.put(
            f"/api/v1/teams/{self.team_id}/members/{self.member_id}/github",
            json={"github_username": "octocat-lead"},
            headers=self.lead_headers
        )
        self.assertEqual(dup_resp.status_code, 400)
        self.assertIn("already mapped", dup_resp.json()["detail"].lower())

        # 4. Unmap lead using DELETE endpoint
        unmap_resp = self.client.delete(
            f"/api/v1/teams/{self.team_id}/members/{self.lead_id}/github",
            headers=self.lead_headers
        )
        self.assertEqual(unmap_resp.status_code, 200)

    def test_13_connect_repository_reuses_saved_github_token(self):
        """Repository validation uses a saved token when the update form leaves it blank."""
        save_repository_config(
            user_id=self.lead_id,
            team_id=self.team_id,
            repo_owner="squadsync-org",
            repo_name="titan-platform",
            branch="main",
            github_token="stored-test-token"
        )

        with patch(
            "main.validate_repository",
            return_value=(True, {"default_branch": "main"}, None)
        ) as validate_repository_mock, patch(
            "main._sync_repository_internal",
            return_value={"last_updated": "2026-10-23T15:30:00Z"}
        ):
            response = self.client.post(
                f"/api/v1/teams/{self.team_id}/github",
                json={
                    "repo_owner": "squadsync-org",
                    "repo_name": "titan-platform",
                    "branch": "main"
                },
                headers=self.lead_headers
            )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()["has_token"])
        self.assertEqual(
            validate_repository_mock.call_args.kwargs["token"],
            "stored-test-token"
        )

    def test_11_invitation_lifecycle_resend_cancel_token(self):
        """Test full invitation lifecycle: invite, duplicate check, token lookup, cancel, resend, accept."""
        invitee_email = f"newdev.{int(time.time())}@squadsync.edu"

        # 1. Invite new dev
        inv_resp = self.client.post(
            f"/api/v1/teams/{self.team_id}/invitations",
            json={"email": invitee_email, "role": "developer"},
            headers=self.lead_headers
        )
        self.assertEqual(inv_resp.status_code, 201)
        inv_data = inv_resp.json()["data"]
        inv_id = inv_data["id"]
        token = inv_data["invitation_token"]

        # 2. Prevent duplicate pending invite
        dup_inv = self.client.post(
            f"/api/v1/teams/{self.team_id}/invitations",
            json={"email": invitee_email, "role": "developer"},
            headers=self.lead_headers
        )
        self.assertEqual(dup_inv.status_code, 400)

        # 3. Lookup details by token (without exposing private token back)
        tok_resp = self.client.get(f"/api/v1/invitations/token/{token}")
        self.assertEqual(tok_resp.status_code, 200)
        self.assertEqual(tok_resp.json()["data"]["email"], invitee_email)

        # 4. Cancel invitation
        can_resp = self.client.post(
            f"/api/v1/teams/{self.team_id}/invitations/{inv_id}/cancel",
            headers=self.lead_headers
        )
        self.assertEqual(can_resp.status_code, 200)

        # 5. Resend / renew invitation
        resend_resp = self.client.post(
            f"/api/v1/teams/{self.team_id}/invitations/{inv_id}/resend",
            headers=self.lead_headers
        )
        self.assertEqual(resend_resp.status_code, 200)
        new_token = resend_resp.json()["invitation_token"]

        # 6. Register user and accept by token
        reg_resp = self.client.post("/api/v1/auth/register", json={
            "name": "New Developer",
            "email": invitee_email,
            "password": "Password1234!",
            "role": "Developer"
        })
        self.assertEqual(reg_resp.status_code, 201)
        new_token_auth = reg_resp.json()["token"]

        acc_resp = self.client.post(
            f"/api/v1/invitations/token/{new_token}/accept",
            headers={"Authorization": f"Bearer {new_token_auth}"}
        )
        self.assertEqual(acc_resp.status_code, 200)
        self.assertEqual(acc_resp.json()["status"], "accepted")

    def test_12_csv_import_validation_rejections(self):
        """Test CSV import with invalid rows (missing fields, invalid status, negative points)."""
        bad_csv = (
            "task_id,title,assignee_github_username,story_points,status,due_date\n"
            ",Missing ID Task,user1,3,Todo,2026-10-25\n"
            "TASK-902,,user1,3,Todo,2026-10-25\n"
            "TASK-903,Invalid Status Task,user1,3,NotAStatus,2026-10-25\n"
            "TASK-904,Negative Points Task,user1,-2,Todo,2026-10-25\n"
            "TASK-905,Valid Task,user1,4,Completed,2026-10-25\n"
        )
        files = {"file": ("tasks_invalid.csv", bad_csv.encode("utf-8"), "text/csv")}
        resp = self.client.post(f"/api/v1/teams/{self.team_id}/tasks/import", files=files, headers=self.lead_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["imported_count"], 1)
        self.assertEqual(data["rejected_count"], 4)
        self.assertEqual(len(data["rejected_rows"]), 4)

if __name__ == "__main__":
    unittest.main()
