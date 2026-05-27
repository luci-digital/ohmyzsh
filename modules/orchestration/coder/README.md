# orchestration/coder

Coder CDE workspace template (Terraform):
- `main.tf`              — provisions LuciVerse workspace containers
- `Dockerfile.workspace` — Lua 5.4 + Node 22 + code-server image

The Coder control plane + Postgres are defined in `../podman/podman-compose.yml`.
