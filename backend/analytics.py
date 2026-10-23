"""
SquadSync Dynamic Collaboration & Risk Analytics Engine.
Calculates dynamic workload distribution, code review health,
integration risks, and actionable recommendations from real GitHub, task, and team data.
Never generates fake metrics or claims unverified conflicts.
"""

import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

def _parse_iso(ts_str: Optional[str]) -> Optional[datetime]:
    if not ts_str:
        return None
    try:
        clean_str = ts_str.replace("Z", "+00:00")
        return datetime.fromisoformat(clean_str)
    except Exception:
        return None

def _hours_between(start_dt: Optional[datetime], end_dt: Optional[datetime]) -> float:
    if not start_dt or not end_dt:
        return 0.0
    diff = (end_dt - start_dt).total_seconds()
    return max(0.0, round(diff / 3600.0, 1))


def apply_known_repository_people(github_data: Dict[str, Any]) -> Dict[str, Any]:
    repository = github_data.get("repository", {}).get("full_name", "")
    if repository.strip().lower() != "amruta-2005/squadsync":
        return github_data

    data = dict(github_data)
    contributors = list(data.get("contributors", []))
    collaborators = list(data.get("collaborators", []))
    invitations = list(data.get("github_invitations", []))

    known_contributors = [
        {
            "id": None,
            "login": "MadhaviPant",
            "name": "Madhavi Pant",
            "avatar_url": "https://avatars.githubusercontent.com/MadhaviPant",
            "html_url": "https://github.com/MadhaviPant",
            "contributions": None,
            "type": "User",
            "source": "user_provided"
        }
    ]
    known_collaborators = [
        {
            "id": None,
            "login": "prathameshwandhare7-lab",
            "name": "Prathamesh Wandhare",
            "avatar_url": "https://avatars.githubusercontent.com/prathameshwandhare7-lab",
            "html_url": "https://github.com/prathameshwandhare7-lab",
            "permissions": {},
            "role_name": "Collaborator",
            "type": "User",
            "source": "user_provided"
        },
        {
            "id": None,
            "login": "siddhishinde06",
            "name": "Siddhi Shinde",
            "avatar_url": "https://avatars.githubusercontent.com/siddhishinde06",
            "html_url": "https://github.com/siddhishinde06",
            "permissions": {},
            "role_name": "Collaborator",
            "type": "User",
            "source": "user_provided"
        }
    ]
    known_invitations = [
        {
            "id": "known-invitation-pratham3536",
            "invitee_login": "Pratham3536",
            "invitee_name": "Prathamesh Wandhare",
            "invitee_avatar": "https://avatars.githubusercontent.com/Pratham3536",
            "invitee_html_url": "https://github.com/Pratham3536",
            "source": "user_provided"
        }
    ]

    def merge_known_people(existing, known, login_key):
        by_login = {
            (person.get(login_key) or "").strip().lower(): person
            for person in existing
            if person.get(login_key)
        }
        for person in known:
            login = person[login_key].lower()
            current = by_login.get(login)
            merged = {**person, **(current or {})}
            for key, value in person.items():
                if not merged.get(key):
                    merged[key] = value
            by_login[login] = merged
        return list(by_login.values())

    data["contributors"] = merge_known_people(
        contributors, known_contributors, "login"
    )
    data["collaborators"] = merge_known_people(
        collaborators, known_collaborators, "login"
    )
    data["github_invitations"] = merge_known_people(
        invitations, known_invitations, "invitee_login"
    )
    data["github_invitations"] = [
        invitation for invitation in data["github_invitations"]
        if (invitation.get("invitee_login") or "").strip().lower() != "madhavipant"
    ]
    return data


def calculate_analytics(
    github_data: Dict[str, Any],
    custom_tasks: Optional[List[Dict[str, Any]]] = None,
    team_members: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Compute full dynamic analytics suite from real GitHub data, database tasks, and team members.
    """
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    repo_meta = github_data.get("repository", {})
    contributors_raw = github_data.get("contributors", [])
    collaborators_raw = github_data.get("collaborators", [])
    github_invitations_raw = github_data.get("github_invitations", [])
    commits_raw = github_data.get("commits", [])
    branches_raw = github_data.get("branches", [])
    prs_raw = github_data.get("pull_requests", [])
    comparisons = github_data.get("branch_comparisons", {})
    issues_raw = github_data.get("issues", [])
    tasks = custom_tasks or []
    official_members = team_members or []

    # -------------------------------------------------------------
    # 1. Contributor Registry (Seed official team members + GitHub mapping)
    # -------------------------------------------------------------
    member_map: Dict[str, Dict[str, Any]] = {}
    gh_to_member_key: Dict[str, str] = {}
    id_to_member_key: Dict[str, str] = {}

    def register_github_account(
        login: str,
        profile: Optional[Dict[str, Any]] = None,
        role: str = "Repository Contributor",
        repository_status: str = "active"
    ) -> Optional[str]:
        clean_login = (login or "").strip()
        normalized_login = clean_login.lower()
        if not normalized_login:
            return None

        existing_key = gh_to_member_key.get(normalized_login)
        if existing_key:
            member = member_map[existing_key]
            member["repository_roles"] = list(dict.fromkeys(
                member.get("repository_roles", []) + [role]
            ))
            if repository_status == "pending_invitation":
                member["repository_status"] = repository_status
            elif member.get("repository_status") != "pending_invitation":
                member["repository_status"] = repository_status
            if profile:
                member["avatar_url"] = profile.get("avatar_url") or member["avatar_url"]
                member["github_id"] = profile.get("id") or member.get("github_id")
                member["github_url"] = profile.get("html_url") or member.get("github_url")
                member["repository_permissions"] = profile.get("permissions") or member.get("repository_permissions")
                member["source"] = profile.get("source") or member.get("source")
                if profile.get("name") and not member.get("is_mapped"):
                    member["name"] = profile["name"]
                member["email"] = profile.get("email") or member.get("email")
            return existing_key

        profile = profile or {}
        member_key = f"gh-{normalized_login}"
        member_map[member_key] = {
            "member_id": member_key,
            "user_id": "",
            "name": profile.get("name") or clean_login,
            "github_username": clean_login,
            "github_id": profile.get("id"),
            "email": profile.get("email"),
            "github_url": profile.get("html_url") or f"https://github.com/{clean_login}",
            "is_mapped": False,
            "avatar_url": profile.get("avatar_url") or f"https://avatars.githubusercontent.com/{clean_login}",
            "role": role,
            "repository_roles": [role],
            "repository_status": repository_status,
            "repository_permissions": profile.get("permissions") or {},
            "source": profile.get("source"),
            "assigned_tasks": 0,
            "completed_tasks": 0,
            "pending_tasks": 0,
            "high_priority_tasks": 0,
            "overdue_tasks": 0,
            "story_points": 0.0,
            "estimated_hours": 0.0,
            "github_activity": {
                "commits_count": 0,
                "commits_last_14d": 0,
                "prs_opened": 0,
                "prs_merged": 0,
                "reviews_conducted": 0,
                "review_comments_made": 0,
                "last_active": None
            },
            "tasks": []
        }
        gh_to_member_key[normalized_login] = member_key
        return member_key

    # Seed official team members first
    for tm in official_members:
        u_id = str(tm.get("id") or tm.get("user_id") or "")
        name = tm.get("name") or "Team Member"
        gh_user = (tm.get("github_username") or "").strip().lower()
        role = tm.get("role") or "Developer"
        key = u_id if u_id else f"tm-{name.lower()}"

        member_map[key] = {
            "member_id": key,
            "user_id": u_id,
            "name": name,
            "github_username": gh_user,
            "is_mapped": bool(gh_user),
            "avatar_url": tm.get("avatar_url") or f"https://api.dicebear.com/7.x/initials/svg?seed={name}",
            "role": role.replace("_", " ").title(),
            "repository_roles": [],
            "repository_status": "team_member",
            "repository_permissions": {},
            "assigned_tasks": 0,
            "completed_tasks": 0,
            "pending_tasks": 0,
            "high_priority_tasks": 0,
            "overdue_tasks": 0,
            "story_points": 0.0,
            "estimated_hours": 0.0,
            "github_activity": {
                "commits_count": 0,
                "commits_last_14d": 0,
                "prs_opened": 0,
                "prs_merged": 0,
                "reviews_conducted": 0,
                "review_comments_made": 0,
                "last_active": None
            },
            "tasks": []
        }

        if u_id:
            id_to_member_key[u_id] = key
        if gh_user:
            gh_to_member_key[gh_user] = key

    # Register commit authors even when this repository already has SquadSync members.
    unmapped_contributors = []
    for c in contributors_raw:
        login = (c.get("login") or "").strip().lower()
        if not login:
            continue

        if login not in gh_to_member_key:
            unmapped_contributors.append({
                "login": c.get("login"),
                "avatar_url": c.get("avatar_url"),
                "contributions": c.get("contributions", 0)
            })
        m_key = register_github_account(
            login,
            c,
            role="Repository Contributor",
            repository_status="contributor"
        )
        if m_key:
            member_map[m_key]["github_activity"]["commits_count"] += c.get("contributions") or 0

    for collaborator in collaborators_raw:
        login = collaborator.get("login") or ""
        register_github_account(
            login,
            collaborator,
            role=collaborator.get("role_name") or "Repository Collaborator",
            repository_status="collaborator"
        )

    for invitation in github_invitations_raw:
        login = invitation.get("invitee_login") or ""
        register_github_account(
            login,
            {
                "avatar_url": invitation.get("invitee_avatar"),
                "html_url": invitation.get("invitee_html_url"),
                "name": invitation.get("invitee_name"),
                "email": invitation.get("invitee_email"),
                "permissions": invitation.get("permissions") or {}
            },
            role="Pending GitHub Invitation",
            repository_status="pending_invitation"
        )

    # Incorporate commits for author activity
    for cm in commits_raw:
        c_login = (cm.get("author_login") or cm.get("author_name") or "").strip()
        if not c_login or c_login.lower() in ["unknown", ""]:
            continue
        c_key = c_login.lower()
        target_key = gh_to_member_key.get(c_key)
        if not target_key and cm.get("author_login"):
            target_key = register_github_account(
                c_login,
                role="Repository Contributor",
                repository_status="contributor"
            )
        if target_key:
            member_map[target_key]["github_activity"]["commits_count"] += 1
            cm_dt = _parse_iso(cm.get("date"))
            if cm_dt:
                cur_last = _parse_iso(member_map[target_key]["github_activity"]["last_active"])
                if not cur_last or cm_dt > cur_last:
                    member_map[target_key]["github_activity"]["last_active"] = cm.get("date")

    # Track pull request authoring, merge events, and reviews
    for pr in prs_raw:
        author = (pr.get("author") or "").strip().lower()
        if author:
            target_key = gh_to_member_key.get(author)
            if not target_key:
                target_key = register_github_account(
                    pr.get("author", author),
                    {"avatar_url": pr.get("author_avatar")},
                    role="Pull Request Author",
                    repository_status="contributor"
                )

            if target_key:
                member_map[target_key]["github_activity"]["prs_opened"] += 1
                if pr.get("merged_at"):
                    member_map[target_key]["github_activity"]["prs_merged"] += 1
                pr_dt = _parse_iso(pr.get("updated_at") or pr.get("created_at"))
                if pr_dt:
                    cur_last = _parse_iso(member_map[target_key]["github_activity"]["last_active"])
                    if not cur_last or pr_dt > cur_last:
                        member_map[target_key]["github_activity"]["last_active"] = pr.get("updated_at") or pr.get("created_at")

        # Track peer reviews
        for rev in pr.get("reviews", []):
            rev_user = (rev.get("reviewer") or "").strip().lower()
            if rev_user and not rev.get("is_self_review"):
                rev_target = gh_to_member_key.get(rev_user)
                if not rev_target:
                    rev_target = register_github_account(
                        rev_user,
                        role="Peer Reviewer",
                        repository_status="contributor"
                    )

                if rev_target:
                    member_map[rev_target]["github_activity"]["reviews_conducted"] += 1
                    member_map[rev_target]["github_activity"]["review_comments_made"] += 1
                    rev_dt = _parse_iso(rev.get("submitted_at"))
                    if rev_dt:
                        cur_last = _parse_iso(member_map[rev_target]["github_activity"]["last_active"])
                        if not cur_last or rev_dt > cur_last:
                            member_map[rev_target]["github_activity"]["last_active"] = rev.get("submitted_at")

    # -------------------------------------------------------------
    # 2. Integrate Database Tasks & GitHub Issues
    # -------------------------------------------------------------
    all_tasks_list = []

    # 1. From Database Tasks
    for t in tasks:
        t_id = t.get("id") or t.get("task_key") or f"TASK-{len(all_tasks_list)+1}"
        title = t.get("title") or "Task Item"
        pts = float(t.get("story_points", 1.0) or 1.0)
        hrs = float(t.get("estimated_hours", 0.0) or 0.0)
        status_val = (t.get("status") or "Todo").capitalize()
        priority_val = t.get("priority") or "Medium"
        is_completed = status_val.lower() in ["completed", "done", "closed"]
        is_high_pri = priority_val.lower() in ["high", "urgent"]

        due_date = t.get("due_date")
        overdue = False
        if due_date and not is_completed:
            try:
                due_clean = due_date.split("T")[0]
                today_clean = now_dt.strftime("%Y-%m-%d")
                if due_clean < today_clean:
                    overdue = True
            except Exception:
                pass

        task_item = {
            "id": t_id,
            "task_key": t.get("task_key") or t_id,
            "title": title,
            "points": pts,
            "story_points": pts,
            "estimated_hours": hrs,
            "priority": priority_val,
            "status": status_val,
            "overdue": overdue,
            "due_date": due_date,
            "source": "Team Task Board"
        }
        all_tasks_list.append(task_item)

        # Attribute to member by assignee_id or mapped github_username
        a_id = str(t.get("assignee_id") or "")
        a_gh = (t.get("assignee_github_username") or "").strip().lower()

        target_member_key = None
        if a_id and a_id in id_to_member_key:
            target_member_key = id_to_member_key[a_id]
        elif a_gh and a_gh in gh_to_member_key:
            target_member_key = gh_to_member_key[a_gh]

        if target_member_key and target_member_key in member_map:
            m = member_map[target_member_key]
            m["assigned_tasks"] += 1
            m["story_points"] += pts
            m["estimated_hours"] += hrs
            if is_completed:
                m["completed_tasks"] += 1
            else:
                m["pending_tasks"] += 1
            if is_high_pri:
                m["high_priority_tasks"] += 1
            if overdue:
                m["overdue_tasks"] += 1
            m["tasks"].append(task_item)

    # 2. From GitHub Issues (if any)
    for iss in issues_raw:
        assignees = [(a or "").strip().lower() for a in iss.get("assignees", [])]
        is_completed = iss.get("state") == "closed"
        due_overdue = False
        iss_pts = 3.0 if "bug" in str(iss.get("labels", [])).lower() else 2.0
        task_item = {
            "id": f"GH-{iss.get('number')}",
            "task_key": f"ISSUE-{iss.get('number')}",
            "title": iss.get("title", ""),
            "points": iss_pts,
            "story_points": iss_pts,
            "priority": "High" if "bug" in str(iss.get("labels", [])).lower() else "Medium",
            "status": "Completed" if is_completed else "In Progress",
            "overdue": due_overdue,
            "source": "GitHub Issue"
        }
        all_tasks_list.append(task_item)

        for a_login in assignees:
            target_key = gh_to_member_key.get(a_login)
            if not target_key:
                target_key = register_github_account(
                    a_login,
                    role="GitHub Issue Assignee",
                    repository_status="contributor"
                )
            if target_key and target_key in member_map:
                m = member_map[target_key]
                m["assigned_tasks"] += 1
                m["story_points"] += iss_pts
                if is_completed:
                    m["completed_tasks"] += 1
                else:
                    m["pending_tasks"] += 1
                m["tasks"].append(task_item)

    # -------------------------------------------------------------
    # 3. Workload Share & Health Evaluation
    # -------------------------------------------------------------
    members_list = list(member_map.values())
    total_contributors = len(members_list)
    total_story_points = sum(m["story_points"] for m in members_list)
    total_assigned_tasks = sum(m["assigned_tasks"] for m in members_list)
    total_prs_opened = sum(mem["github_activity"]["prs_opened"] for mem in members_list)
    has_workload_data = total_story_points > 0 or total_assigned_tasks > 0 or total_prs_opened > 0

    for m in members_list:
        if total_story_points > 0:
            share = round((m["story_points"] / total_story_points) * 100, 1)
        elif total_assigned_tasks > 0:
            share = round((m["assigned_tasks"] / total_assigned_tasks) * 100, 1)
        elif total_prs_opened > 0:
            share = round((m["github_activity"]["prs_opened"] / total_prs_opened) * 100, 1)
        else:
            share = 0.0

        m["estimated_workload_share"] = share
        if m.get("repository_status") == "pending_invitation":
            m["workload_status"] = "Pending Invitation"
        elif not has_workload_data or not (
            m["story_points"] > 0
            or m["assigned_tasks"] > 0
            or m["github_activity"]["prs_opened"] > 0
        ):
            m["workload_status"] = "No Task Data"
        elif total_contributors > 1 and share > 35.0:
            m["workload_status"] = "Overburdened"
        elif total_contributors > 2 and share < 8.0:
            m["workload_status"] = "Underutilized"
        else:
            m["workload_status"] = "Balanced"

    members_list.sort(key=lambda x: x["estimated_workload_share"], reverse=True)

    # -------------------------------------------------------------
    # 4. Code Review Analysis
    # -------------------------------------------------------------
    total_prs = len(prs_raw)
    open_prs = [pr for pr in prs_raw if pr.get("state") == "open"]
    reviewed_prs = [
        pr for pr in prs_raw
        if any(not r.get("is_self_review") and r.get("state") in ["APPROVED", "CHANGES_REQUESTED", "COMMENTED"] for r in pr.get("reviews", []))
    ]
    unreviewed_open_prs = [
        pr for pr in open_prs
        if not any(not r.get("is_self_review") and r.get("state") in ["APPROVED", "CHANGES_REQUESTED", "COMMENTED"] for r in pr.get("reviews", []))
    ]
    review_coverage_pct = round((len(reviewed_prs) / max(1, total_prs)) * 100, 1) if total_prs > 0 else 0.0

    wait_times = []
    attention_prs = []
    for pr in open_prs:
        pr_created = _parse_iso(pr.get("created_at"))
        reviews = [r for r in pr.get("reviews", []) if not r.get("is_self_review")]
        if reviews:
            earliest_dt = min(
                (_parse_iso(r.get("submitted_at")) for r in reviews if _parse_iso(r.get("submitted_at"))),
                default=None
            )
            wait_hours = _hours_between(pr_created, earliest_dt) if earliest_dt else _hours_between(pr_created, now_dt)
        else:
            wait_hours = _hours_between(pr_created, now_dt)

        wait_times.append(wait_hours)
        is_over_48h = wait_hours >= 48.0
        needs_attention = len(reviews) == 0 or is_over_48h

        status_label = "Needs Review"
        if any(r.get("state") == "APPROVED" for r in reviews):
            status_label = "Approved"
        elif any(r.get("state") == "CHANGES_REQUESTED" for r in reviews):
            status_label = "Changes Requested"

        attention_prs.append({
            "id": pr.get("id"),
            "number": pr.get("number"),
            "title": pr.get("title", ""),
            "author": pr.get("author", "Unknown"),
            "author_username": pr.get("author", "unknown"),
            "branch": pr.get("head_branch", ""),
            "target_branch": pr.get("base_branch", repo_meta.get("default_branch", "main")),
            "created_at": pr.get("created_at"),
            "waiting_hours": int(wait_hours),
            "status": status_label,
            "reviewers": pr.get("requested_reviewers", []),
            "review_count": len(reviews),
            "has_warning": needs_attention,
            "evidence": {
                "warning_title": f"PR awaiting peer review ({int(wait_hours)}h elapsed)" if is_over_48h else "PR awaiting initial peer review",
                "why_warning_raised": f"Pull Request #{pr.get('number')} opened on {pr.get('created_at', '')[:10]} has been open for {int(wait_hours)} hours with {len(reviews)} peer reviews.",
                "supporting_metrics": [
                    {"label": "Time Awaiting Review", "value": f"{int(wait_hours)} hours (SLA Threshold: 48h)"},
                    {"label": "Peer Reviews Submitted", "value": f"{len(reviews)} reviews"},
                    {"label": "Target Branch", "value": pr.get("base_branch", "main")}
                ],
                "suggested_action": f"Request review from an active contributor like {members_list[0]['github_username'] if members_list else 'a teammate'}."
            }
        })

    avg_wait_hours = round(sum(wait_times) / max(1, len(wait_times)), 1) if wait_times else 0.0

    total_reviews_conducted = sum(m["github_activity"]["reviews_conducted"] for m in members_list)
    review_participation_summary = [
        {
            "name": m["name"],
            "prs_authored": m["github_activity"]["prs_opened"],
            "reviews_conducted": m["github_activity"]["reviews_conducted"],
            "reviews_done": m["github_activity"]["reviews_conducted"],
            "prs_created": m["github_activity"]["prs_opened"],
            "review_ratio": round(m["github_activity"]["reviews_conducted"] / max(1, m["github_activity"]["prs_opened"]), 2),
            "participation_share": round((m["github_activity"]["reviews_conducted"] / max(1, total_reviews_conducted)) * 100, 1)
        }
        for m in members_list
    ]

    # -------------------------------------------------------------
    # 5. Integration Risk Analysis
    # -------------------------------------------------------------
    detected_risks: List[Dict[str, Any]] = []

    # Branch divergence
    long_lived_branches_count = 0
    for b_name, comp in comparisons.items():
        behind_by = comp.get("behind_by", 0)
        ahead_by = comp.get("ahead_by", 0)
        status = comp.get("status", "unknown")

        if behind_by >= 10 or status in ["diverged", "behind"]:
            long_lived_branches_count += 1
            detected_risks.append({
                "id": f"risk-branch-{b_name}",
                "category": "Integration Divergence",
                "risk_level": "High" if behind_by >= 15 else "Medium",
                "severity": "High" if behind_by >= 15 else "Medium",
                "title": f"Branch '{b_name}' has diverged from {repo_meta.get('default_branch', 'main')}",
                "identifier": b_name,
                "risk_type": "Branch Divergence",
                "branch_name": b_name,
                "author": "Active Branch",
                "explanation": f"Branch '{b_name}' is currently {behind_by} commits behind {repo_meta.get('default_branch', 'main')} and {ahead_by} commits ahead.",
                "measured_facts": [
                    f"Branch is {behind_by} commits behind target '{repo_meta.get('default_branch', 'main')}'",
                    f"Branch contains {ahead_by} unmerged commits",
                    f"Comparison status: {status}"
                ],
                "possible_risks": [
                    "High probability of code collision and merge conflicts",
                    "Divergent test runs passing on stale code that fails on main"
                ],
                "suggested_action": f"Rebase or merge '{repo_meta.get('default_branch', 'main')}' into '{b_name}' immediately.",
                "supporting_metrics": {
                    "commits_behind": behind_by,
                    "commits_ahead": ahead_by,
                    "status": status
                }
            })

    # Long-lived PRs (> 7 days) and verified conflicts
    for pr in open_prs:
        pr_created = _parse_iso(pr.get("created_at"))
        age_hours = _hours_between(pr_created, now_dt)
        age_days = round(age_hours / 24.0, 1)
        is_conflict_verified = pr.get("mergeable") is False

        if age_days >= 7.0 or is_conflict_verified:
            sev = "Critical" if (age_days >= 14.0 or is_conflict_verified) else "High"
            detected_risks.append({
                "id": f"risk-pr-{pr.get('number')}",
                "category": "Merge Conflict" if is_conflict_verified else "Integration Risk",
                "risk_level": "High" if sev in ["Critical", "High"] else "Medium",
                "severity": sev,
                "title": f"Verified merge conflicts in PR #{pr.get('number')}" if is_conflict_verified else f"Long-standing open pull request #{pr.get('number')} ({int(age_days)} days old)",
                "identifier": f"PR #{pr.get('number')}",
                "risk_type": "Verified Conflict" if is_conflict_verified else "Delayed Integration",
                "branch_name": pr.get("head_branch", ""),
                "author": pr.get("author", "Unknown"),
                "explanation": f"PR #{pr.get('number')} ('{pr.get('title')}') by {pr.get('author')} has been unmerged for {int(age_days)} days.",
                "measured_facts": [
                    f"Created on {pr.get('created_at', '')[:10]} ({int(age_days)} days ago)",
                    "Mergeable status verified as conflicting by GitHub API" if is_conflict_verified else "Branch remains unmerged into default branch",
                    f"Target branch: {pr.get('base_branch', 'main')}"
                ],
                "possible_risks": [
                    "Blocked integration for features depending on this pull request",
                    "Stale changes diverging from teammates' ongoing contributions"
                ],
                "suggested_action": f"Resolve merge conflicts locally and push an updated commit to branch '{pr.get('head_branch')}'." if is_conflict_verified else f"Prioritize reviewing and merging PR #{pr.get('number')} in this sprint.",
                "supporting_metrics": {
                    "age_days": age_days,
                    "waiting_hours": int(age_hours),
                    "mergeable": "Conflicting (Verified)" if is_conflict_verified else "Clean / Pending"
                }
            })

    # Workload Imbalance
    overburdened = [m for m in members_list if m["workload_status"] == "Overburdened"]
    for ob in overburdened:
        detected_risks.append({
            "id": f"risk-workload-{ob['github_username'] or ob['name']}",
            "category": "Workload Imbalance",
            "risk_level": "High",
            "severity": "High",
            "title": f"Workload imbalance: {ob['name']} carries {ob['estimated_workload_share']}% of work",
            "identifier": f"Contributor: {ob['name']}",
            "risk_type": "Workload Imbalance",
            "branch_name": "-",
            "author": ob["name"],
            "explanation": f"{ob['name']} is assigned {ob['assigned_tasks']} items ({ob['story_points']} points), representing {ob['estimated_workload_share']}% of team capacity.",
            "measured_facts": [
                f"Assigned {ob['assigned_tasks']} tasks / issues",
                f"Workload share is {ob['estimated_workload_share']}% (Threshold: 35.0%)",
                f"Average team member share is {round(100.0 / max(1, total_contributors), 1)}%"
            ],
            "possible_risks": [
                "Single point of failure: project milestones blocked if contributor is unavailable",
                "Burnout and decreased peer review bandwidth"
            ],
            "suggested_action": "Reallocate upcoming tasks to teammates with lighter workload.",
            "supporting_metrics": {
                "workload_share": f"{ob['estimated_workload_share']}%",
                "assigned_tasks": ob["assigned_tasks"],
                "story_points": ob["story_points"]
            }
        })

    # Overall Risk Level
    has_critical = any(r.get("severity") == "Critical" for r in detected_risks)
    has_high = any(r.get("risk_level") == "High" or r.get("severity") == "High" for r in detected_risks)
    has_medium = any(r.get("risk_level") == "Medium" or r.get("severity") == "Medium" for r in detected_risks)
    if has_critical or len([r for r in detected_risks if r.get("risk_level") == "High"]) >= 2:
        overall_risk_level = "High"
    elif has_high or has_medium:
        overall_risk_level = "Medium"
    else:
        overall_risk_level = "Low"

    # -------------------------------------------------------------
    # 6. Actionable Recommendations
    # -------------------------------------------------------------
    recent_warnings = []
    for idx, r in enumerate(detected_risks[:6]):
        recent_warnings.append({
            "id": f"warn-{idx + 101}",
            "category": r.get("category", "Collaboration Alert"),
            "level": r.get("risk_level", "Medium"),
            "title": r.get("title", ""),
            "explanation": r.get("explanation", ""),
            "suggested_action": r.get("suggested_action", "Review during daily standup."),
            "timestamp": now_iso
        })

    if not recent_warnings:
        recent_warnings.append({
            "id": "warn-healthy-100",
            "category": "Collaboration Health",
            "level": "Low",
            "title": "Healthy collaboration and code review workflow",
            "explanation": "No severe branch divergence, unreviewed PRs older than 48 hours, or workload silos detected.",
            "suggested_action": "Maintain current cadence of daily integration and prompt peer reviews.",
            "timestamp": now_iso
        })

    # Workload summary
    workload_summary = [
        {
            "name": m["name"],
            "role": m["role"],
            "tasks_assigned": m["assigned_tasks"],
            "points": m["story_points"],
            "workload_share": m["estimated_workload_share"],
            "status": m["workload_status"],
            "is_mapped": m.get("is_mapped", True)
        }
        for m in members_list
    ]

    completed_tasks_count = sum(m["completed_tasks"] for m in members_list)
    pending_tasks_count = sum(m["pending_tasks"] for m in members_list)
    overdue_tasks_count = sum(1 for t in all_tasks_list if t.get("overdue"))

    # Onboarding Checklist State
    repo_connected = bool(repo_meta.get("full_name") or repo_meta.get("name"))
    has_tasks = len(tasks) > 0
    members_count = len(official_members) if official_members else len(members_list)
    mapped_count = sum(1 for tm in official_members if tm.get("github_username")) if official_members else len(members_list)

    onboarding_checklist = {
        "team_created": True,
        "members_invited": members_count > 1,
        "tasks_created": has_tasks,
        "repo_connected": repo_connected,
        "contributors_mapped": mapped_count > 0,
        "first_analysis_completed": True,
        "is_complete": bool(members_count > 1 and has_tasks and repo_connected and mapped_count > 0)
    }

    return {
        "repository": repo_meta.get("full_name", f"{repo_meta.get('owner')}/{repo_meta.get('name')}") if repo_connected else "No Repository Connected",
        "last_updated": now_iso,
        "overall_risk_level": overall_risk_level,
        "is_demo": False,
        "onboarding_checklist": onboarding_checklist,
        "unmapped_contributors": unmapped_contributors,
        "metrics": {
            "total_members": total_contributors,
            "total_team_members": len(official_members),
            "total_tasks": len(all_tasks_list),
            "completed_tasks": completed_tasks_count,
            "in_progress_tasks": pending_tasks_count,
            "overdue_tasks": overdue_tasks_count,
            "open_pull_requests": len(open_prs),
            "reviewed_pull_requests": len([pr for pr in open_prs if pr in reviewed_prs]),
            "unreviewed_pull_requests": len(unreviewed_open_prs),
            "review_coverage_percent": review_coverage_pct,
            "average_review_wait_hours": avg_wait_hours,
            "long_running_branches_count": long_lived_branches_count
        },
        "workload_summary": workload_summary,
        "review_participation_summary": review_participation_summary,
        "integration_risk_indicators": {
            "risk_level": overall_risk_level,
            "open_unmerged_prs": len(open_prs),
            "stale_prs_over_48h": len([pr for pr in open_prs if _hours_between(_parse_iso(pr.get('updated_at')), now_dt) >= 48.0]),
            "long_lived_branches": long_lived_branches_count,
            "blocked_tasks": overdue_tasks_count,
            "top_warning": detected_risks[0]["title"] if detected_risks else "All active branches and pull requests are currently in healthy synchronization."
        },
        "recent_warnings": recent_warnings,
        "workload_data": {
            "total_story_points": total_story_points,
            "total_tasks": len(all_tasks_list),
            "methodology_note": "Workload share evaluates assigned issues, story points, and pull request activity. Commit volume is decoupled to prevent artificial bloating incentives.",
            "members": members_list
        },
        "reviews_data": {
            "total_pull_requests": total_prs,
            "reviewed_pull_requests": len(reviewed_prs),
            "unreviewed_pull_requests": len(unreviewed_open_prs),
            "review_coverage_percent": review_coverage_pct,
            "average_wait_time_hours": avg_wait_hours,
            "member_participation": review_participation_summary,
            "pull_requests_requiring_attention": attention_prs
        },
        "integration_risks_data": {
            "overall_risk_level": overall_risk_level,
            "summary": {
                "open_unmerged_prs": len(open_prs),
                "long_running_branches": long_lived_branches_count,
                "prs_waiting_over_48h": len([pr for pr in open_prs if _hours_between(_parse_iso(pr.get('created_at')), now_dt) >= 48.0]),
                "blocked_or_overdue_dependent_tasks": overdue_tasks_count,
                "average_branch_age_days": round(sum(pr["waiting_hours"] / 24.0 for pr in attention_prs) / max(1, len(attention_prs)), 1) if attention_prs else 0.0
            },
            "risks": [
                r for r in detected_risks if r.get("category") in ["Integration Divergence", "Merge Conflict", "Integration Risk"]
            ]
        },
        "risks_ledger": detected_risks
    }
