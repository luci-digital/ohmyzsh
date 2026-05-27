# infra/ipv6 — Sovereign IPv6 schema

LuciVerse addressing under `2602:F674::/40`. Tier suffixes (e.g. VCS
`2602:F674:0000:0700::/64`) are encoded in `../../scm/luci-vcs/src/lib.rs`
(`VcsComponent::ipv6`) and surfaced by Caddy in `../../orchestration/caddy/Caddyfile`.
