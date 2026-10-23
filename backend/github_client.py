"""
GitHub REST API Client for SquadSync.
Handles authenticated and unauthenticated queries to api.github.com.
Fetches repository metadata, contributors, commits, branches, pull requests,
submitted reviews, branch comparisons, and issues with rate-limit and error safeguards.
"""

import os
import time
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
import httpx
from dotenv import load_dotenv

# Load environment variables from workspace root and backend directory
load_dotenv(Path(__file__).parent.parent / ".env")
load_dotenv(Path(__file__).parent / ".env")

GITHUB_API_BASE = "https://api.github.com"
DEFAULT_USER_AGENT = "SquadSync-Collaboration-Intelligence/2.0"
REQUEST_TIMEOUT = 15.0  # seconds

def _get_headers(token: Optional[str] = None) -> Dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": DEFAULT_USER_AGENT,
        "X-GitHub-Api-Version": "2022-11-28"
    }
    # Priority: explicitly passed token -> environment variable GITHUB_TOKEN -> SQUADSYNC_GITHUB_TOKEN
    effective_token = token or os.getenv("GITHUB_TOKEN") or os.getenv("SQUADSYNC_GITHUB_TOKEN")
    if effective_token and effective_token.strip():
        headers["Authorization"] = f"Bearer {effective_token.strip()}"
    return headers

def validate_repository(
    owner: str,
    repo: str,
    token: Optional[str] = None
) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """
    Validate that a repository exists and is accessible.
    Returns (is_valid, repo_data, error_message).
    """
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"
    headers = _get_headers(token)

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT, headers=headers) as client:
            resp = client.get(url)

            if resp.status_code == 200:
                data = resp.json()
                summary = {
                    "id": data.get("id"),
                    "name": data.get("name"),
                    "full_name": data.get("full_name"),
                    "owner": data.get("owner", {}).get("login"),
                    "default_branch": data.get("default_branch", "main"),
                    "is_private": data.get("private", False),
                    "description": data.get("description"),
                    "open_issues_count": data.get("open_issues_count", 0),
                    "created_at": data.get("created_at"),
                    "updated_at": data.get("updated_at"),
                    "pushed_at": data.get("pushed_at")
                }
                return True, summary, None

            if resp.status_code == 404:
                return False, None, f"Repository '{owner}/{repo}' not found. If it is private, please provide a valid Personal Access Token."

            if resp.status_code == 401:
                return False, None, "GitHub authentication failed. Please verify that your Personal Access Token is valid and has not expired."

            if resp.status_code == 403:
                # Check for rate limit
                remaining = resp.headers.get("x-ratelimit-remaining")
                body_msg = ""
                try:
                    body_msg = resp.json().get("message", "")
                except Exception:
                    pass
                if remaining == "0" or "rate limit exceeded" in body_msg.lower():
                    reset_time = int(resp.headers.get("x-ratelimit-reset", time.time() + 3600))
                    reset_str = time.strftime("%H:%M:%S UTC", time.gmtime(reset_time))
                    return False, None, f"GitHub API rate limit exceeded for unauthenticated requests from this IP (resets at {reset_str}). Please enter a GitHub Personal Access Token in Data Sources to increase your limit to 5,000 requests/hour."
                return False, None, f"Access to '{owner}/{repo}' forbidden: {resp.json().get('message', 'Insufficient permissions')}."

            return False, None, f"GitHub API error (HTTP {resp.status_code}): {resp.text[:150]}"

    except httpx.TimeoutException:
        return False, None, f"Connection to GitHub timed out after {REQUEST_TIMEOUT}s. Please check your network connection."
    except Exception as e:
        return False, None, f"Failed to contact GitHub: {str(e)}"

def fetch_repository_contributors(
    owner: str,
    repo: str,
    token: Optional[str] = None,
    max_pages: Optional[int] = None
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Fetch repository contributors using GitHub REST API.
    Handles pagination, rate limits, empty repos, and error reporting.
    Returns (contributors_list, warning_message).
    """
    headers = _get_headers(token)
    repo_url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"
    contributors = []
    warning = None

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT, headers=headers) as client:
            page = 1
            while max_pages is None or page <= max_pages:
                resp = client.get(f"{repo_url}/contributors", params={"per_page": 100, "page": page})

                if resp.status_code == 200:
                    items = resp.json()
                    if not items or not isinstance(items, list):
                        break

                    for c in items:
                        if not isinstance(c, dict):
                            continue
                        login = c.get("login")
                        if not login:
                            continue
                        contributors.append({
                            "id": c.get("id"),
                            "login": login,
                            "name": c.get("name"),
                            "avatar_url": c.get("avatar_url") or f"https://avatars.githubusercontent.com/{login}",
                            "html_url": c.get("html_url") or f"https://github.com/{login}",
                            "contributions": c.get("contributions", 0),
                            "type": c.get("type", "User")
                        })

                    # If fewer than 100, no more pages
                    if len(items) < 100:
                        break
                    page += 1

                elif resp.status_code == 202:
                    # GitHub is calculating contributor statistics in the background
                    time.sleep(1.0)
                    retry_resp = client.get(f"{repo_url}/contributors", params={"per_page": 100, "page": page})
                    if retry_resp.status_code == 200:
                        items = retry_resp.json()
                        if isinstance(items, list):
                            for c in items:
                                login = c.get("login")
                                if login:
                                    contributors.append({
                                        "id": c.get("id"),
                                        "login": login,
                                        "avatar_url": c.get("avatar_url") or f"https://avatars.githubusercontent.com/{login}",
                                        "html_url": c.get("html_url") or f"https://github.com/{login}",
                                        "contributions": c.get("contributions", 0),
                                        "type": c.get("type", "User")
                                    })
                    else:
                        warning = "GitHub is currently calculating contributor statistics for this repository. Please try again in a few moments."
                    break

                elif resp.status_code == 204:
                    # No content / empty repository
                    break

                elif resp.status_code == 403:
                    remaining = resp.headers.get("x-ratelimit-remaining")
                    reset_time = int(resp.headers.get("x-ratelimit-reset", time.time() + 3600))
                    reset_str = time.strftime("%H:%M:%S UTC", time.gmtime(reset_time))
                    if remaining == "0" or "rate limit" in resp.text.lower():
                        warning = (
                            f"GitHub API rate limit exceeded (resets at {reset_str}). "
                            "Please configure a GitHub Personal Access Token in Data Sources to get 5,000 requests/hour."
                        )
                    else:
                        warning = f"Access to repository contributors forbidden: {resp.text[:100]}"
                    break

                elif resp.status_code == 404:
                    warning = f"Repository '{owner}/{repo}' not found. If private, please provide a GitHub Personal Access Token."
                    break

                elif resp.status_code == 401:
                    warning = "GitHub authentication failed. Please verify that your Personal Access Token is valid and has not expired."
                    break

                else:
                    warning = f"GitHub API responded with status {resp.status_code} while fetching contributors."
                    break

    except httpx.TimeoutException:
        warning = "GitHub connection timed out while fetching contributors."
    except Exception as e:
        warning = f"Error fetching contributors: {str(e)}"

    return contributors, warning

def fetch_repository_collaborators(
    owner: str,
    repo: str,
    token: Optional[str] = None,
    max_pages: int = 3
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Fetch repository collaborators using GitHub REST API.
    Requires push (write) access; if unauthenticated or unauthorized, returns graceful notice.
    Returns (collaborators_list, warning_message).
    """
    headers = _get_headers(token)
    repo_url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"
    collaborators = []
    warning = None

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT, headers=headers) as client:
            page = 1
            while page <= max_pages:
                resp = client.get(f"{repo_url}/collaborators", params={"per_page": 100, "page": page})

                if resp.status_code == 200:
                    items = resp.json()
                    if not items or not isinstance(items, list):
                        break

                    for c in items:
                        if not isinstance(c, dict):
                            continue
                        login = c.get("login")
                        if not login:
                            continue
                        perms = c.get("permissions", {})
                        collaborators.append({
                            "id": c.get("id"),
                            "login": login,
                            "avatar_url": c.get("avatar_url") or f"https://avatars.githubusercontent.com/{login}",
                            "html_url": c.get("html_url") or f"https://github.com/{login}",
                            "permissions": perms,
                            "role_name": c.get("role_name", "write" if perms.get("push") else "read"),
                            "type": c.get("type", "User")
                        })

                    if len(items) < 100:
                        break
                    page += 1

                elif resp.status_code in [401, 403]:
                    body_msg = ""
                    try:
                        body_msg = resp.json().get("message", "")
                    except Exception:
                        pass
                    accepted_permissions = resp.headers.get("x-accepted-github-permissions")
                    permissions_detail = (
                        f" GitHub says this endpoint accepts: {accepted_permissions}."
                        if accepted_permissions else ""
                    )
                    warning = (
                        "Listing collaborators requires an authenticated GitHub account with write, maintain, or admin access "
                        "and a token authorized for collaborator listing. "
                        f"GitHub message: {body_msg or 'Access forbidden'}."
                        f"{permissions_detail}"
                    )
                    break
                elif resp.status_code == 404:
                    warning = f"Repository '{owner}/{repo}' collaborators not accessible or private."
                    break
                else:
                    warning = f"GitHub API responded with status {resp.status_code} while fetching collaborators."
                    break

    except httpx.TimeoutException:
        warning = "GitHub connection timed out while fetching collaborators."
    except Exception as e:
        warning = f"Error fetching collaborators: {str(e)}"

    return collaborators, warning

def fetch_repository_invitations(
    owner: str,
    repo: str,
    token: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Fetch pending repository invitations from GitHub REST API.
    Requires admin access; returns (invitations_list, warning_message).
    """
    headers = _get_headers(token)
    repo_url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"
    invitations = []
    warning = None

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT, headers=headers) as client:
            resp = client.get(f"{repo_url}/invitations", params={"per_page": 100})
            if resp.status_code == 200:
                items = resp.json()
                if isinstance(items, list):
                    for inv in items:
                        if not isinstance(inv, dict):
                            continue
                        invitee = inv.get("invitee", {}) or {}
                        inviter = inv.get("inviter", {}) or {}
                        invitations.append({
                            "id": inv.get("id"),
                            "invitee_login": invitee.get("login") if isinstance(invitee, dict) else str(invitee),
                            "invitee_name": invitee.get("name") if isinstance(invitee, dict) else None,
                            "invitee_avatar": invitee.get("avatar_url") if isinstance(invitee, dict) else None,
                            "invitee_html_url": invitee.get("html_url") if isinstance(invitee, dict) else None,
                            "invitee_email": inv.get("email"),
                            "inviter_login": inviter.get("login") if isinstance(inviter, dict) else None,
                            "permissions": inv.get("permissions"),
                            "created_at": inv.get("created_at")
                        })
            elif resp.status_code in [401, 403, 404]:
                warning = "Pending GitHub invitations require a Personal Access Token with admin permissions."
            else:
                warning = f"GitHub API responded with status {resp.status_code} while fetching repo invitations."
    except Exception as e:
        warning = f"Error fetching repository invitations: {str(e)}"

    return invitations, warning

def fetch_full_repository_data(
    owner: str,
    repo: str,
    default_branch: Optional[str] = None,
    token: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fetch comprehensive repository dataset including metadata, contributors,
    recent commits, branches, pull requests with peer reviews, branch divergence,
    and open/closed issues.
    """
    headers = _get_headers(token)
    repo_url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"

    with httpx.Client(timeout=REQUEST_TIMEOUT, headers=headers) as client:
        # 1. Repository metadata
        resp_repo = client.get(repo_url)
        if resp_repo.status_code != 200:
            if resp_repo.status_code == 403:
                body_msg = ""
                try:
                    body_msg = resp_repo.json().get("message", "")
                except Exception:
                    pass
                if "rate limit exceeded" in body_msg.lower() or resp_repo.headers.get("x-ratelimit-remaining") == "0":
                    reset_time = int(resp_repo.headers.get("x-ratelimit-reset", time.time() + 3600))
                    reset_str = time.strftime("%H:%M:%S UTC", time.gmtime(reset_time))
                    raise RuntimeError(f"GitHub API rate limit exceeded for unauthenticated requests from this IP (resets at {reset_str}). Please provide a GitHub Personal Access Token in Data Sources to unlock 5,000 requests/hour.")
            raise RuntimeError(f"Failed to fetch repo '{owner}/{repo}' (HTTP {resp_repo.status_code}): {resp_repo.text[:120]}")
        repo_raw = resp_repo.json()
        active_default_branch = default_branch or repo_raw.get("default_branch", "main")

        rate_limit_info = {
            "remaining": resp_repo.headers.get("x-ratelimit-remaining"),
            "limit": resp_repo.headers.get("x-ratelimit-limit"),
            "reset": resp_repo.headers.get("x-ratelimit-reset")
        }

        # 2. Contributors, Collaborators & Invitations
        contributors, contrib_warning = fetch_repository_contributors(owner=owner, repo=repo, token=token)
        collaborators, collab_warning = fetch_repository_collaborators(owner=owner, repo=repo, token=token)
        github_invitations, inv_warning = fetch_repository_invitations(owner=owner, repo=repo, token=token)

        # 3. Recent Commits (Up to 100)
        commits = []
        try:
            resp_commits = client.get(f"{repo_url}/commits", params={"per_page": 100})
            if resp_commits.status_code == 200:
                for cm in resp_commits.json():
                    author_login = cm.get("author", {}).get("login") if cm.get("author") else None
                    commit_author = cm.get("commit", {}).get("author", {})
                    commits.append({
                        "sha": cm.get("sha", "")[:8],
                        "full_sha": cm.get("sha", ""),
                        "author_login": author_login or commit_author.get("name", "Unknown"),
                        "author_name": commit_author.get("name", "Unknown"),
                        "author_email": commit_author.get("email"),
                        "date": commit_author.get("date"),
                        "message": cm.get("commit", {}).get("message", "").split("\n")[0]
                    })
        except Exception:
            pass

        # 4. Branches
        branches = []
        try:
            resp_branches = client.get(f"{repo_url}/branches", params={"per_page": 100})
            if resp_branches.status_code == 200:
                for b in resp_branches.json():
                    branches.append({
                        "name": b.get("name"),
                        "sha": b.get("commit", {}).get("sha", "")[:8],
                        "protected": b.get("protected", False)
                    })
        except Exception:
            pass

        # 5. Pull Requests (open and recent closed)
        pull_requests = []
        try:
            resp_prs = client.get(
                f"{repo_url}/pulls",
                params={"state": "all", "per_page": 100, "sort": "updated", "direction": "desc"}
            )
            if resp_prs.status_code == 200:
                raw_prs = resp_prs.json()
                # For open PRs or top 15 most recent, fetch review details
                for idx, pr in enumerate(raw_prs[:30]):
                    pr_num = pr.get("number")
                    pr_author = pr.get("user", {}).get("login", "unknown")
                    pr_author_avatar = pr.get("user", {}).get("avatar_url")

                    # Fetch submitted peer reviews for this PR
                    reviews_data = []
                    try:
                        resp_reviews = client.get(f"{repo_url}/pulls/{pr_num}/reviews")
                        if resp_reviews.status_code == 200:
                            for r in resp_reviews.json():
                                reviewer_login = r.get("user", {}).get("login")
                                # Skip automated or duplicate state events if desired, keep track
                                reviews_data.append({
                                    "id": r.get("id"),
                                    "reviewer": reviewer_login,
                                    "state": r.get("state"),  # APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED
                                    "submitted_at": r.get("submitted_at"),
                                    "is_self_review": reviewer_login == pr_author
                                })
                    except Exception:
                        pass

                    requested_reviewers = [
                        u.get("login") for u in pr.get("requested_reviewers", []) if isinstance(u, dict)
                    ]

                    pull_requests.append({
                        "id": f"pr-{pr_num}",
                        "number": pr_num,
                        "title": pr.get("title", ""),
                        "state": pr.get("state"),  # "open" or "closed"
                        "is_draft": pr.get("draft", False),
                        "created_at": pr.get("created_at"),
                        "updated_at": pr.get("updated_at"),
                        "closed_at": pr.get("closed_at"),
                        "merged_at": pr.get("merged_at"),
                        "author": pr_author,
                        "author_avatar": pr_author_avatar,
                        "head_branch": pr.get("head", {}).get("ref", "unknown"),
                        "base_branch": pr.get("base", {}).get("ref", active_default_branch),
                        "head_sha": pr.get("head", {}).get("sha", "")[:8],
                        "mergeable": pr.get("mergeable"),  # True, False, or None
                        "requested_reviewers": requested_reviewers,
                        "reviews": reviews_data
                    })
        except Exception:
            pass

        # 6. Branch Comparison (for up to 5 non-default branches to prevent rate limit starvation)
        branch_comparisons = {}
        non_default_branches = [b["name"] for b in branches if b["name"] != active_default_branch][:5]
        for b_name in non_default_branches:
            try:
                comp_url = f"{repo_url}/compare/{active_default_branch}...{b_name}"
                resp_comp = client.get(comp_url)
                if resp_comp.status_code == 200:
                    cdata = resp_comp.json()
                    branch_comparisons[b_name] = {
                        "status": cdata.get("status"),  # 'ahead', 'behind', 'diverged', 'identical'
                        "ahead_by": cdata.get("ahead_by", 0),
                        "behind_by": cdata.get("behind_by", 0),
                        "total_commits": cdata.get("total_commits", 0)
                    }
            except Exception:
                pass

        # 7. GitHub Issues (Filtering out pull requests)
        issues = []
        try:
            resp_issues = client.get(
                f"{repo_url}/issues",
                params={"state": "all", "per_page": 100, "sort": "updated", "direction": "desc"}
            )
            if resp_issues.status_code == 200:
                for item in resp_issues.json():
                    # GitHub API includes pull requests in issues endpoint; filter them out:
                    if "pull_request" in item:
                        continue
                    assignees = [a.get("login") for a in item.get("assignees", []) if isinstance(a, dict)]
                    labels = [l.get("name") for l in item.get("labels", []) if isinstance(l, dict)]
                    issues.append({
                        "id": f"issue-{item.get('number')}",
                        "number": item.get("number"),
                        "title": item.get("title", ""),
                        "state": item.get("state"),  # "open" or "closed"
                        "author": item.get("user", {}).get("login"),
                        "assignees": assignees,
                        "labels": labels,
                        "created_at": item.get("created_at"),
                        "updated_at": item.get("updated_at"),
                        "closed_at": item.get("closed_at")
                    })
        except Exception:
            pass

        return {
            "repository": {
                "id": repo_raw.get("id"),
                "name": repo_raw.get("name"),
                "full_name": repo_raw.get("full_name"),
                "owner": repo_raw.get("owner", {}).get("login"),
                "default_branch": active_default_branch,
                "is_private": repo_raw.get("private", False),
                "description": repo_raw.get("description"),
                "open_issues_count": repo_raw.get("open_issues_count", 0),
                "stargazers_count": repo_raw.get("stargazers_count", 0),
                "forks_count": repo_raw.get("forks_count", 0),
                "created_at": repo_raw.get("created_at"),
                "updated_at": repo_raw.get("updated_at"),
                "pushed_at": repo_raw.get("pushed_at")
            },
            "contributors": contributors,
            "contributors_warning": contrib_warning,
            "collaborators": collaborators,
            "collaborators_warning": collab_warning,
            "github_invitations": github_invitations,
            "github_invitations_warning": inv_warning,
            "commits": commits,
            "branches": branches,
            "pull_requests": pull_requests,
            "branch_comparisons": branch_comparisons,
            "issues": issues,
            "rate_limit": rate_limit_info,
            "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
