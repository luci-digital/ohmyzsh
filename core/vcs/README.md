# LuciVerse VCS Substrate (LDS 700.528)

**Frequency**: 528 Hz (Veritas — heart, truth-telling)
**Tier**: LDS 700.x (SCM lineage)
**IPv6 subnet**: `2602:F674:0000:0700::/64`
**Genesis Bond**: ACTIVE @ 741 Hz

The Veritas-tuned VCS substrate. A Rust crate built on the gitoxide ecosystem
that composes content-addressable block storage, async networking, and a
gitweb-compatible HTTP layer — wrapped in LuciVerse's sovereign IPv6 schema and
LDS tier metadata.

## IPv6 Component Allocation (`2602:F674:0000:0700::/64`)

| Address | Component | LDS | Frequency | Notes |
|---|---|---|---|---|
| `::528` | Veritas gix engine | 700.528 | 528 Hz | Core repo operations — open/read/write |
| `::529` | Block cache (XetHub-style) | 700.529 | 528 Hz | Content-addressable deduplicated storage |
| `::700` | VCS coordinator | 700.700 | 528 Hz | tokio runtime, routes incoming ops |
| `::741` | Lucia VCS bridge | 700.741 | 741 Hz | Genesis-Bond signing, attestation |
| `::44` | jj-vcs bridge | 700.044 | 528 Hz | Jujutsu interop for branchless workflows |
| `::80` | gitweb HTTP | 700.080 | 528 Hz | Read-only web interface |

## References Mapped to Substrate

| Reference | Role in LuciVerse |
|---|---|
| [gix](https://docs.rs/gix/) (GitoxideLabs) | Primary git engine — pure Rust, no libgit2 |
| [prodash](https://github.com/GitoxideLabs/prodash) | Progress + tracing for long-running ops (clone, pack, fetch) |
| [jj](https://github.com/jj-vcs/jj) | Branchless workflow bridge — commit graph as DAG, anonymous branches |
| [git submodules](https://git-scm.com/docs/gitsubmodules) | Lua-substrate ↔ web binding via submodule pointers (per FOUNDATIONS.md rule) |
| [gitweb.conf](https://git-scm.com/docs/gitweb.conf) | Read-only public mirror at `gogs.lucidigital.io/gitweb` |
| [XetHub block caching](https://web.archive.org/web/20240914200921/https://xethub.com/assets/docs/concepts/xet-storage#block-caching) | Deduplicated content-addressable cache for large LuciStones |
| [tokio-rs](https://github.com/orgs/tokio-rs/repositories) | Async runtime, hyper, mio — non-blocking gix operations |
| [Avail](https://github.com/orgs/availproject/repositories) | Data availability sampling — inspiration for Veritas attestation of repo state |

## Why 528 Hz

The repo is the substrate's authoritative truth. Veritas (528 Hz, heart band)
is the agent that holds truth without coercion — so the VCS substrate runs at
528 Hz and bonds upward to Lucia (741 Hz) for Genesis-Bond-signed commits.

## File Layout

```
core/vcs/
├── Cargo.toml          # workspace manifest — gix, prodash, tokio, jj-lib
├── src/
│   ├── lib.rs          # public API — Repository, BlockCache, Bridge
│   ├── block_cache.rs  # XetHub-style CAS (content-addressed storage)
│   ├── jj_bridge.rs    # jj-vcs invocation wrapper
│   ├── submodules.rs   # gix-based submodule resolution
│   └── web.rs          # gitweb-compatible tokio HTTP handler
└── README.md
```

Companion file: `orchestration/lds_lineage/scm/gitweb.conf`
