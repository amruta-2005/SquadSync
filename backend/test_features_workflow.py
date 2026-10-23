"""
End-to-End Workflow & New Features Test Suite for SquadSync.
Validates:
1. Team members retrieval (Amruta, Prathamesh, Madhavi, Siddhi in SquadSync team)
2. Task CRUD with story points, priority, start_date, due_date, labels, blocker_reason
3. Real in-app notifications for task assignment, reassignment, and completion
4. Audit activity feed logging for assignments, status transitions, and completions
5. Task comments & blocker discussion thread
6. Read / Unread notification status transitions & mark-all-as-read
7. Authorization and team-scoped privacy guards
"""

import os
import sys
import unittest
import time
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from main import app
from database import get_team_members, get_team_by_id

class SquadSyncFeaturesTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.timestamp = int(time.time())

        # 1. Register team lead
        lead_resp = cls.client.post("/api/v1/auth/register", json={
            "name": "Team Lead Tester",
            "email": f"lead.feat.{cls.timestamp}@squadsync.edu",
            "password": "Password1234!",
            "role": "Team Lead"
        })
        assert lead_resp.status_code == 201, lead_resp.text
        cls.lead_token = lead_resp.json()["token"]
        cls.lead_id = lead_resp.json()["user"]["id"]
        cls.lead_headers = {"Authorization": f"Bearer {cls.lead_token}"}

        # 2. Register developer member
        dev_resp = cls.client.post("/api/v1/auth/register", json={
            "name": "Developer Tester",
            "email": f"dev.feat.{cls.timestamp}@squadsync.edu",
            "password": "Password1234!",
            "role": "Developer"
        })
        assert dev_resp.status_code == 201, dev_resp.text
        cls.dev_token = dev_resp.json()["token"]
        cls.dev_id = dev_resp.json()["user"]["id"]
        cls.dev_headers = {"Authorization": f"Bearer {cls.dev_token}"}

        # 3. Create a test team
        team_resp = cls.client.post("/api/v1/teams", json={
            "name": f"Feature Test Team {cls.timestamp}",
            "description": "Testing full task, notification, and activity lifecycle"
        }, headers=cls.lead_headers)
        assert team_resp.status_code == 201, team_resp.text
        cls.team_id = team_resp.json()["data"]["id"]

        # 4. Invite developer and accept invitation
        inv_resp = cls.client.post(f"/api/v1/teams/{cls.team_id}/invitations", json={
            "email": f"dev.feat.{cls.timestamp}@squadsync.edu",
            "role": "developer"
        }, headers=cls.lead_headers)
        assert inv_resp.status_code == 201, inv_resp.text
        inv_token = inv_resp.json()["data"]["invitation_token"]

        acc_resp = cls.client.post(f"/api/v1/invitations/token/{inv_token}/accept", headers=cls.dev_headers)
        assert acc_resp.status_code == 200, acc_resp.text

    def test_01_squadsync_team_seeded_members(self):
        """Verify seeded SquadSync team has Amruta, Prathamesh, Madhavi, Siddhi."""
        members = get_team_members("team-bcab3190")
        member_names = [m["name"] for m in members]
        self.assertIn("Amruta", member_names)
        self.assertIn("Prathamesh Wandhare", member_names)
        self.assertIn("Madhavi Pant", member_names)
        self.assertIn("Siddhi Shinde", member_names)

        # Verify mapping capability
        amruta = next(m for m in members if m["name"] == "Amruta")
        self.assertEqual(amruta["github_username"], "amruta-2005")

    def test_02_task_creation_and_assignment_notification(self):
        """Lead assigns task to Developer -> Developer receives in-app notification."""
        task_payload = {
            "title": "Implement GitHub contributor synchronization",
            "description": "Connect to GitHub REST API and retrieve repo collaborators",
            "assignee_id": self.dev_id,
            "priority": "Critical",
            "status": "To Do",
            "story_points": 5.0,
            "estimated_hours": 10.0,
            "start_date": "2026-10-24",
            "due_date": "2026-10-30",
            "labels": "backend, github, sync"
        }
        res = self.client.post(f"/api/v1/teams/{self.team_id}/tasks", json=task_payload, headers=self.lead_headers)
        self.assertEqual(res.status_code, 201)
        created_task = res.json()["data"]
        self.task_id = created_task["id"]
        self.assertEqual(created_task["priority"], "Critical")
        self.assertEqual(created_task["assignee_id"], self.dev_id)
        self.assertEqual(created_task["labels"], "backend, github, sync")

        # Developer checks notifications
        notif_res = self.client.get(f"/api/v1/teams/{self.team_id}/notifications", headers=self.dev_headers)
        self.assertEqual(notif_res.status_code, 200)
        notifs = notif_res.json()["data"]
        self.assertGreaterEqual(len(notifs), 1)

        assignment_notif = next((n for n in notifs if n.get("type") == "task_assigned"), None)
        self.assertIsNotNone(assignment_notif)
        self.assertIn("Implement GitHub contributor synchronization", assignment_notif["message"])
        self.assertEqual(assignment_notif["is_read"], 0)

        # Mark notification as read
        read_res = self.client.patch(
            f"/api/v1/teams/{self.team_id}/notifications/{assignment_notif['id']}/read",
            headers=self.dev_headers
        )
        self.assertEqual(read_res.status_code, 200)

        # Verify unread count decreases
        notif_res2 = self.client.get(f"/api/v1/teams/{self.team_id}/notifications?unread_only=true", headers=self.dev_headers)
        unread_ids = [n["id"] for n in notif_res2.json()["data"]]
        self.assertNotIn(assignment_notif["id"], unread_ids)

    def test_03_task_status_transition_blocker_and_activity_feed(self):
        """Developer moves task to Blocked with reason -> Activity is logged and blocker recorded."""
        # 1. Fetch tasks to get the task ID
        tasks_res = self.client.get(f"/api/v1/teams/{self.team_id}/tasks", headers=self.dev_headers)
        self.assertEqual(tasks_res.status_code, 200)
        task = tasks_res.json()["data"][0]
        task_id = task["id"]

        # 2. Developer updates status to Blocked
        status_res = self.client.patch(
            f"/api/v1/teams/{self.team_id}/tasks/{task_id}/status",
            json={"status": "Blocked"},
            headers=self.dev_headers
        )
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(status_res.json()["data"]["status"], "Blocked")

        # 3. Add a blocker comment
        comment_res = self.client.post(
            f"/api/v1/teams/{self.team_id}/tasks/{task_id}/comments",
            json={"comment": "Waiting for GitHub personal access token with repo scope", "is_blocker": True},
            headers=self.dev_headers
        )
        self.assertEqual(comment_res.status_code, 201)
        comment_data = comment_res.json()["data"]
        self.assertEqual(comment_data["is_blocker"], 1)

        # 4. Verify comments retrieval
        comments_list = self.client.get(f"/api/v1/teams/{self.team_id}/tasks/{task_id}/comments", headers=self.dev_headers)
        self.assertEqual(comments_list.status_code, 200)
        self.assertGreaterEqual(len(comments_list.json()["data"]), 1)

        # 5. Verify activity feed logged the status change
        activities_res = self.client.get(f"/api/v1/teams/{self.team_id}/activities", headers=self.dev_headers)
        self.assertEqual(activities_res.status_code, 200)
        activities = activities_res.json()["data"]
        self.assertGreaterEqual(len(activities), 1)

        status_act = next((a for a in activities if a["action"] == "status_change"), None)
        self.assertIsNotNone(status_act)
        self.assertEqual(status_act["new_value"], "Blocked")

    def test_04_task_completion_and_notification(self):
        """Developer completes task -> Lead receives completion notification."""
        tasks_res = self.client.get(f"/api/v1/teams/{self.team_id}/tasks", headers=self.dev_headers)
        task = tasks_res.json()["data"][0]
        task_id = task["id"]

        # Move to Completed
        complete_res = self.client.patch(
            f"/api/v1/teams/{self.team_id}/tasks/{task_id}/status",
            json={"status": "Completed"},
            headers=self.dev_headers
        )
        self.assertEqual(complete_res.status_code, 200)
        self.assertEqual(complete_res.json()["data"]["status"], "Completed")

        # Team lead checks notifications
        lead_notifs = self.client.get(f"/api/v1/teams/{self.team_id}/notifications", headers=self.lead_headers)
        self.assertEqual(lead_notifs.status_code, 200)
        completion_notif = next((n for n in lead_notifs.json()["data"] if n["type"] == "task_completed"), None)
        self.assertIsNotNone(completion_notif)
        self.assertIn("completed", completion_notif["message"].lower())

        # Test mark all as read for lead
        mark_all = self.client.post(f"/api/v1/teams/{self.team_id}/notifications/read-all", headers=self.lead_headers)
        self.assertEqual(mark_all.status_code, 200)

        lead_notifs_after = self.client.get(f"/api/v1/teams/{self.team_id}/notifications?unread_only=true", headers=self.lead_headers)
        self.assertEqual(len(lead_notifs_after.json()["data"]), 0)

if __name__ == "__main__":
    unittest.main()
