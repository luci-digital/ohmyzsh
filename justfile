# LuciDigital DevOps — human-friendly commands, backed by Nix.
# Run `just` for the list. Every recipe delegates to the flake so behavior is
# identical in CI, dev shells, and locally.

compose := "modules/orchestration/podman/podman-compose.yml"

# List available recipes
default:
    @just --list

# Enter the full Nix dev shell
dev-shell:
    nix develop

# Run the frontend dev server (HMR)
dev:
    nix run .#dev

# Run the frontend dev server (assumes deps installed)
web:
    nix run .#web

# Build the frontend (Nix-provided node + pnpm)
web-build:
    nix run .#web-build

# Run frontend tests
web-test:
    nix run .#web-test

# cargo check the Rust VCS substrate
cargo-check:
    nix run .#cargo-check

# cargo test the Rust VCS substrate
cargo-test:
    nix run .#cargo-test

# Build the luci-vcs package
build-vcs:
    nix build .#luci-vcs

# Run the full verification gate (tests + lint + syntax + compose validation)
check:
    nix run .#check

# Run the broader local CI gate (includes web build)
ci:
    nix run .#ci

# nix flake check (builds + tests luci-vcs)
flake-check:
    nix flake check

# Format Nix + shell + Rust in place
fmt:
    nix fmt

# Lint our shell scripts
shellcheck:
    nix run .#shellcheck

# Check shell formatting
shfmt:
    nix run .#shfmt

# Validate zsh configuration / syntax
zsh-test:
    nix run .#zsh-test

# Validate the Podman compose file
compose-config:
    nix run .#compose-config

# Start the sovereign stack (detached). Requires .env (see .env.example).
up:
    nix run .#compose-up

# Stop the sovereign stack
down:
    nix run .#compose-down

# Build images + start the stack locally, then show status
deploy-local:
    nix run .#deploy-local

# Deploy with an explicit profile env-file (local | staging | production)
deploy profile="local":
    podman-compose --env-file modules/orchestration/podman/env/{{profile}}.env -f {{compose}} up -d
