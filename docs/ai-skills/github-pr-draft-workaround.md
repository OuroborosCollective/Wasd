# GitHub PR Draft State Workaround

## Problem

When creating a PR via the GitHub API (or `create_pr` tool), the PR is created as a **draft** by default if created from a bot account or certain API contexts.

Draft PRs cannot be merged via the API until they're marked as "ready for review".

## Symptoms

```json
{
  "message": "Pull Request is still a draft",
  "status": "405"
}
```

## Solutions

### 1. Mark as Ready via API (before merge)

```python
# Convert draft to ready
curl -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/OWNER/REPO/pulls/PR_NUMBER/ready-for-review"
```

Then merge:

```python
curl -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{"merge_method":"merge"}' \
  "https://api.github.com/repos/OWNER/REPO/pulls/PR_NUMBER/merge"
```

### 2. Use GraphQL (more reliable)

```python
mutation {
  convertPullRequestToNotDraft(input: {pullRequestId: "PR_ID"}) {
    pullRequest { isDraft }
  }
}
```

### 3. Manual (User clicks "Ready for review" button)

- Navigate to PR page
- Click "Ready for review" button in PR header

### 4. Set `draft: false` in PATCH request

```python
curl -X PATCH \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{"draft":false}' \
  "https://api.github.com/repos/OWNER/REPO/pulls/PR_NUMBER"
```

## Prevention

When creating a PR via `create_pr` tool, check if there's a way to specify `draft: false`.

Alternatively, use the `ready-for-review` endpoint immediately after creation.

## Quick Script

```python
#!/usr/bin/env python3
"""Convert draft PR to ready and merge"""
import sys
import subprocess

def merge_pr(owner, repo, pr_number, token):
    # Step 1: Convert to ready
    subprocess.run([
        'curl', '-s', '-X', 'PUT',
        '-H', f'Authorization: token {token}',
        '-H', 'Accept: application/vnd.github.v3+json',
        f'https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/ready-for-review'
    ])
    
    # Step 2: Merge
    result = subprocess.run([
        'curl', '-s', '-X', 'PUT',
        '-H', f'Authorization: token {token}',
        '-H', 'Accept: application/vnd.github.v3+json',
        '-d', '{"merge_method":"merge"}',
        f'https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/merge'
    ], capture_output=True, text=True)
    
    import json
    data = json.loads(result.stdout)
    print(f"Merged: {data.get('merged')}, Message: {data.get('message', '')}")
    
    if not data.get('merged'):
        print(f"Error: {data.get('message')}")
        sys.exit(1)

if __name__ == "__main__":
    merge_pr("OuroborosCollective", "Wasd", 1586, "$GITHUB_TOKEN")
```

## Related

- [GitHub Actions Repair](./wasd-github-actions-repair.md)