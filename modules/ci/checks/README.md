# ci/checks — Nix flake checks

Reproducible checks run via `nix flake check`. Currently:
- `luci-vcs-tests` — builds + tests the Rust VCS substrate (16 handle tests).

Add new checks under `flake.nix` `checks.<system>.*`.
