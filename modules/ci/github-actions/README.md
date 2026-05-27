# ci/github-actions

GitHub Actions only execute from the canonical `/.github/workflows/` path, so
the live workflows remain there. This module documents the CI subsystem:

| Workflow | Purpose |
|---|---|
| `main.yml`         | primary build/test |
| `installer*`       | OMZ installer checks |
| `dependencies*`    | dependency hygiene |
| `project.yml`      | project automation |
| `scorecard.yml`    | OSSF security scorecard |

Nix-based checks live in `../checks/`.
