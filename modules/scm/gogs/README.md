# scm/gogs — Gogs + Gitoxide SCM image

- `Dockerfile.gogs` — Go Git Service with a pure-Rust Gitoxide backend.
- `gitweb.conf`     — sovereign gitweb config (LuciVerse attestation headers).

Built by the orchestration stack: `../../orchestration/podman/podman-compose.yml`
references this dir as the `scm-engine` build context.
