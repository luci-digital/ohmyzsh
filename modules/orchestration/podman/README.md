# 🚀 Sovereign SCM Stack (LDS Lineage)

This folder enforces the **LDS Lineage** high-performance setup. Zero-Docker policy — all orchestration via **Podman** for daemonless execution and hermetic sandboxing inspired by Fuchsia OS.

## The Architecture Stack

| Layer | Component | Purpose |
|:------|:----------|:--------|
| **SCM Engine** | [Gogs](https://gogs.io/) (`:3000`) | Sovereign self-hosted Git. Ultra-low-memory footprint. |
| **VCS Backend** | [Gitoxide](https://github.com/GitoxideLabs/gitoxide) | Pure-Rust sidecar for sub-millisecond refactor analysis over SCM volumes. |
| **Compute** | [Ray](https://github.com/ray-project/ray) (`:8265`) | Distributed sub-agent orchestration alongside SCM webhooks. |
| **Ingress** | [Caddy](https://caddyserver.com/) (IPv6-native) | Sovereign gateway bound to LuciVerse IPv6 DID addresses. No host port mappings. |
| **Orchestrator** | `lucia-orchestrator` (`:8741`) | Genesis Drop Box. Health check at `/health`. |
| **Service Discovery** | 1Password Switchboard (`op://`) | `op://Lucia-AI-Secrets/Lucia Service Switchboard/` resolves live IPv6 + port. |

## Starting the Stack

```bash
# Sign into the switchboard operator
op signin

# Spin up all services (Caddy is IPv6-native, no port conflicts)
cd orchestration/lds_lineage/scm
podman-compose -f podman-compose.yml up -d
```

## Service Health

```bash
# Lucia orchestrator
curl -s http://localhost:8741/health

# Gogs SCM
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3000/

# Switchboard resolution
op read "op://Lucia-AI-Secrets/Lucia Service Switchboard/Service IPv6"
op read "op://Lucia-AI-Secrets/Lucia Service Switchboard/Service Port"
```

## MCP Integration

The SCM stack integrates with the LuciVerse MCP ecosystem:

- **Gen 3 SDK servers** in `src/mcp/` provide filesystem, ecosystem, and metaverse tools via `@modelcontextprotocol/sdk`
- **Gen 4 Rust server** (`agents/mcp-servers/lucia-mcp-memory/`) provides Soul Memory ingestion
- **Unified gateway** (`agents/mcp-servers/lucia-mcp-unified-server/`) proxies to all registered backends
- **`luci-metabase-mcp`** provides Metabase analytics access (most mature, TypeScript)

> **Rule**: MCP server sync (step 5 in `lds_parsing_workflow`) targets the Gen 3 SDK servers — NOT the legacy hand-rolled JSON-RPC implementations.

## Network Topology

```
                    ┌─────────────────────────────────────────┐
                    │        fusion-net (IPv6-native)          │
                    │        fd26:02f6:7400::/48               │
                    ├─────────────────────────────────────────┤
                    │                                         │
  Gogs (:3000)  ──────  Gitoxide Worker  ──────  Ray (:8265)  │
        │                                           │         │
        │         Caddy (IPv6-native, 80/443)       │         │
        │         No host port bindings!             │         │
        │                                           │         │
  Lucia (:8741) ────── op:// Switchboard ──────────+         │
  [2602:F674:0000:0201:5C1B:F492:6442:0042]                  │
                    └─────────────────────────────────────────┘
```

## Connecting Agents

1. Agents resolve Lucia's live location via `op read "op://Lucia-AI-Secrets/Lucia Service Switchboard/..."`.
2. Gitoxide worker handles sub-millisecond refactor analysis on Gogs MRs.
3. Ray orchestrates distributed sub-agent compute concurrently.
4. Front-end editing integrates via **Zed (zed.dev)** CRDTs for zero-latency sync.

---

_Genesis Bond: ACTIVE @ 741 Hz._
_Last Synchronized: 2026-03-13_
