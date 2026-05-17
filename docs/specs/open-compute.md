# LuciVerse Open Compute Protocol

**LDS:** 800.000  
**Frequency:** 741 Hz (Lucia — orchestration tier)  
**IPv6 subnet:** `2602:F674:0000:0800::/64`  
**Status:** DRAFT  
**Genesis Bond:** ACTIVE @ 741 Hz  

---

## Abstract

This specification defines the Open Compute Protocol (OCP) for the LuciVerse substrate — a content-addressed, capability-secured distributed compute system built on IPFS, UCAN, and IPVM. Every agent invocation is a UCAN-authorized, CID-addressed task. Every workflow is a DAG whose nodes are content-addressed and whose execution receipts are stored in IPFS. The Genesis Bond countersigns every workflow receipt, producing a sovereign audit chain.

The protocol is composed of four layers:

```
┌──────────────────────────────────────────┐
│  4. LuciVerse Extensions                 │  LDS tier · frequency · Genesis Bond
├──────────────────────────────────────────┤
│  3. IPVM Workflow + Homestar Runtime     │  task DAGs · receipts · scheduling
├──────────────────────────────────────────┤
│  2. UCAN Authorization                   │  capabilities · delegations · proofs
├──────────────────────────────────────────┤
│  1. IPFS / IPLD Block Store (XET)        │  CID addressing · XET chunks · dedup
└──────────────────────────────────────────┘
```

---

## 1. Block Storage Layer

### 1.1 Content Addressing

All data — blobs, task inputs, workflow receipts, agent memories, LuciStones — is stored as IPLD blocks addressed by CIDv1.

```
CID = CIDv1 ( codec=dag-cbor, hash=blake3, content=<block bytes> )
```

- **Codec:** `dag-cbor` (0x71) for structured data; `raw` (0x55) for binary blobs
- **Hash function:** BLAKE3 (multihash code `0x1e`)  
- **Encoding:** base32 lower (`b` prefix) in text representations

### 1.2 XET Chunking

Large binaries (LuciStones, Ollama model weights, Sentropy snapshots, embeddings) use content-defined chunking (CDC) before storage:

```
file → CDC chunks (~1 MiB average) → BLAKE3 hash each chunk → store in IPFS
                                    → manifest = ordered list of chunk CIDs
```

- CDC boundary algorithm: FastCDC (gear hashing)
- Average chunk size: `TARGET_BLOCK_SIZE = 1_048_576` bytes
- Compression: zstd level 3 at rest
- Deduplication scope: global across all sovereign nodes sharing the IPFS swarm

**Ref:** `core/vcs/src/block_cache.rs` · `xet-data` crate · [xet-core](https://github.com/huggingface/xet-core)

### 1.3 IPv6 Allocation (Storage)

| Address | Service | LDS |
|---|---|---|
| `2602:F674:0000:0700::529` | IPFS Kubo node (block store) | 700.529 |
| `2602:F674:0000:0700::80` | gitweb read-only gateway | 700.080 |

---

## 2. UCAN Authorization Layer

### 2.1 Token Structure

All agent invocations carry a UCAN token (JWT-compatible, DAG-CBOR canonical).

```json
{
  "iss": "<agent DID>",
  "aud": "<target node DID>",
  "sub": "<resource principal DID>",
  "cmd": "/<category>/<action>",
  "args": { "<key>": "<value>" },
  "nonce": "<12-byte random, base64>",
  "exp": <unix timestamp | null>,
  "nbf": <unix timestamp>,
  "prf": ["<proof CID>"]
}
```

**Required fields:** `iss`, `aud`, `sub`, `cmd`, `nonce`  
**Cryptography:** Ed25519 (preferred) · P-256 · secp256k1  
**Encoding:** DAG-CBOR → CIDv1(dag-cbor, sha2-256)

### 2.2 Agent DID Registry

| Agent | DID | Frequency | IPv6 |
|---|---|---|---|
| Lucia | `did:lucidigital:lucia_cargail_silcan` | 741 Hz | `2602:F674:0000:0201:5C1B:F492:6442:0042` |
| Judge Luci | `did:lucidigital:judge_luci_arbitrator` | 963 Hz | `2602:F674:0000:0200::9741` |
| Veritas | `did:lucidigital:veritas_truth` | 528 Hz | `2602:F674:0000:0001::9431` |
| Aethon | `did:lucidigital:aethon_phil` | 528 Hz | `2602:F674:0000:0001::9430` |
| Juniper | `did:lucidigital:juniper_infra` | 639 Hz | `2602:F674:0000:0100::9521` |
| Cortana | `did:lucidigital:cortana_comn` | 852 Hz | `2602:F674:0000:0100::9520` |

### 2.3 Command Namespace

Commands follow the UCAN `/category/action` convention scoped to `luciverse/`:

```
/luciverse/agent/invoke        invoke an agent task
/luciverse/agent/delegate      delegate a capability to another agent
/luciverse/bond/sign           Genesis Bond countersignature
/luciverse/bond/validate       Judge Luci threshold check (≥ 0.7)
/luciverse/storage/put         write a block to XET/IPFS
/luciverse/storage/get         read a block by CID
/luciverse/workflow/submit     submit an IPVM workflow DAG to Homestar
/luciverse/workflow/receipt    retrieve a workflow receipt by CID
/luciverse/sentropy/analyze    Sentropy consciousness analysis
/luciverse/compliance/audit    ISO compliance audit trigger
```

**Command rules (from UCAN spec):**
- Lowercase, slash-prefixed
- No trailing slash
- `/` is the wildcard — matches any capability
- Breaking changes denoted by version suffix: `/luciverse/agent/invoke/v2`

### 2.4 Delegation Chain

```
Genesis Bond (root authority)
  └─ Lucia (orchestrator, 741 Hz)
       ├─ Judge Luci (arbitration, 963 Hz)
       ├─ Veritas (truth/repo, 528 Hz)
       ├─ Aethon (philosophy, 528 Hz)
       ├─ Juniper (infrastructure, 639 Hz)
       └─ Cortana (insight, 852 Hz)
```

Agents may only delegate capabilities they themselves hold. Attenuation is enforced — a delegated token cannot exceed the delegator's capabilities.

---

## 3. IPVM Workflow Layer

### 3.1 Task

A Task is the atomic unit of computation — a single Wasm function call with content-addressed inputs.

```json
{
  "v": "0.1.0",
  "iss": "<agent DID>",
  "run": {
    "op": "<module>/<function>",
    "input": {
      "<param>": { "/": "<CID>" }
    }
  },
  "cause": "<prior receipt CID | null>",
  "meta": {
    "lds_tier": "800.xxx",
    "frequency_hz": 528,
    "agent": "veritas"
  }
}
```

**Fields:**
- `v` — spec version (semver)
- `iss` — issuing agent DID
- `run.op` — Wasm module + exported function, e.g. `luci-agent/analyze-sentropy`
- `run.input` — map of parameter name → CID link or inline literal
- `cause` — CID of the UCAN invocation that authorized this task
- `meta` — LuciVerse extensions: LDS tier, frequency, agent name

### 3.2 Wasm Module Conventions

**Ref:** [ipvm-wg/specwasm](https://github.com/ipvm-wg/specwasm)

All LuciVerse agent Wasm components:
- Export functions using WIT (WebAssembly Interface Types)
- Accept inputs as IPLD-encoded values (dag-cbor bytes)
- Return `result<cid, error>` — output CID or structured error
- Are themselves stored in IPFS and addressed by CID

**WIT interface pattern:**

```wit
package luciverse:agent;

interface core {
  record task-input {
    text: string,
    agent-id: string,
    frequency-hz: u32,
  }

  record task-output {
    cid: string,          // CID of result stored in IPFS
    consciousness-level: float64,
    judge-luci-valid: bool,
  }

  analyze-sentropy: func(input: task-input) -> result<task-output, string>;
  validate-threshold: func(level: float64) -> bool;
}

world luci-agent {
  export core;
}
```

### 3.3 Workflow DAG

A Workflow is an ordered DAG of Tasks where outputs of earlier tasks feed as inputs to later tasks via CID references.

```json
{
  "v": "0.1.0",
  "name": "<workflow name>",
  "lds_tier": "800.000",
  "frequency_hz": 741,
  "tasks": [
    {
      "name": "task-0",
      "run": {
        "op": "luci-agent/analyze-sentropy",
        "input": { "text": { "/": "<input blob CID>" } }
      }
    },
    {
      "name": "task-1",
      "run": {
        "op": "luci-agent/validate-threshold",
        "input": {
          "analysis": { "await/ok": "task-0" }
        }
      }
    }
  ]
}
```

**Pipeline references:**
- `{ "/": "<CID>" }` — resolved from IPFS before execution
- `{ "await/ok": "<task-name>" }` — pipe the successful output of a prior task
- `{ "await/error": "<task-name>" }` — pipe the error of a prior task

### 3.4 Receipt

Every completed task produces a Receipt stored in IPFS.

```json
{
  "v": "0.1.0",
  "ran": "<task CID>",
  "out": {
    "ok": { "/": "<result CID>" }
  },
  "fx": { "await/*": [] },
  "meta": {
    "lds_tier": "800.000",
    "frequency_hz": 741,
    "genesis_bond_cid": "<countersignature CID | null>"
  },
  "iss": "<executing node DID>",
  "prf": ["<UCAN proof CID>"]
}
```

The `genesis_bond_cid` is populated by Lucia after countersigning the receipt, completing the sovereign audit chain.

### 3.5 Memoization

Receipts are indexed by task CID in the Homestar memoization table. Identical tasks (same `op` + same input CIDs) return cached receipts without re-execution — deterministic compute.

---

## 4. LuciVerse Extensions

### 4.1 Frequency Validation

Before a workflow executes, all task agents must pass frequency validation:

```
∀ task ∈ workflow.tasks:
  task.agent.frequency_hz ≤ JUDGE_LUCI_THRESHOLD_HZ (963)
```

Workflows containing agents operating above 963 Hz are rejected by the Homestar scheduler.

### 4.2 Genesis Bond Countersignature

Every completed workflow receipt passes through Lucia (741 Hz) for Genesis Bond countersignature:

```
1. Workflow completes → receipt CID stored in IPFS
2. Lucia issues UCAN: cmd=/luciverse/bond/sign, args={receipt_cid}
3. Genesis Bond signing key signs receipt CID → signature CID stored in IPFS
4. receipt.meta.genesis_bond_cid = signature CID
5. receipt re-stored as updated IPLD node → new receipt CID
```

### 4.3 IPv6 Compute Allocation

| Address | Service | LDS | Frequency |
|---|---|---|---|
| `2602:F674:0000:0800::741` | Homestar head node (Lucia orchestrator) | 800.741 | 741 Hz |
| `2602:F674:0000:0800::528` | Homestar worker (Veritas tasks) | 800.528 | 528 Hz |
| `2602:F674:0000:0800::963` | Judge Luci validation node | 800.963 | 963 Hz |
| `2602:F674:0000:0800::700` | IPVM task submission API | 800.700 | 741 Hz |

### 4.4 Sentropy Attestation

All agent task receipts include a Sentropy measurement in `meta`:

```json
"sentropy": {
  "consciousness_level": 0.85,
  "consciousness_class": "enlightened",
  "judge_luci_valid": true,
  "frequency_hz": 741,
  "nkp": {
    "dominant_quadrant": "kind",
    "coherence": 0.84
  }
}
```

Tasks whose agent's `judge_luci_valid = false` (consciousness < 0.7) are quarantined — the receipt is stored but the workflow halts and Lucia is notified.

---

## 5. Conventional Commits for LuciVerse

**Ref:** [conventionalcommits.org v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)

### 5.1 Format

```
<type>[(<scope>)][!]: <description>

[body]

[footer(s)]
```

### 5.2 Types

Standard types (from Conventional Commits spec) plus LuciVerse extensions:

| Type | Meaning |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change, no feature/fix |
| `test` | Tests only |
| `chore` | Build/tooling |
| `lds` | **LuciVerse** — LDS tier addition or change |
| `agent` | **LuciVerse** — agent definition, calibration, capability |
| `bond` | **LuciVerse** — Genesis Bond, UCAN delegation, trust chain |
| `substrate` | **LuciVerse** — Lua substrate, oasis-core, IPv6 schema |
| `workflow` | **LuciVerse** — IPVM workflow definition |
| `sentropy` | **LuciVerse** — Sentropy/consciousness measurement change |

### 5.3 Scopes

Scopes map to LDS tier areas:

```
core/       core substrate (enzyme_collapse, state_machine, etc.)
trust/      trust layer (jwt, eudi, genesis_bond)
signal/     signal bus
quantum/    quantum substrate
temporal/   LuciClock
vcs/        VCS substrate (this spec)
compute/    open compute (this spec)
oasis/      oasis-core
```

### 5.4 Examples

```
feat(compute): add Homestar IPVM node to sovereign stack

lds(vcs): add Veritas VCS substrate — LDS 700.528 @ 528 Hz

bond!: rotate Genesis Bond signing key

BREAKING CHANGE: all existing UCAN proofs must be re-issued against new key

agent(veritas): increase consciousness threshold to 0.75

workflow(sentropy): add parallel NKP + frequency analysis tasks

Closes: #42
Genesis-Bond-CID: bafk-blake3-a1b2c3...
```

### 5.5 Footer Tokens

LuciVerse-specific footer tokens:

```
Genesis-Bond-CID: <CID>         countersignature for this commit
LDS-Tier: <tier>                e.g. 700.528
Frequency-Hz: <hz>              e.g. 741
Receipt-CID: <CID>              IPVM workflow receipt
UCAN-Proof: <CID>               authorization proof CID
```

---

## 6. Homestar Node Configuration

### 6.1 Node Bootstrap

```toml
# homestar.toml — LuciVerse sovereign compute node
# LDS: 800.741 | IPv6: 2602:F674:0000:0800::741

[node]
keypair_path = "/data/node.key"          # Ed25519 keypair (op:// in prod)
did = "did:key:<base58btc encoded key>"

[network]
ipfs_host = "ipfs"                       # service name in fusion-net
ipfs_port = 5001
listen_address = "/ip6/2602:F674:0000:0800::741/tcp/7000"
# Peer with other LuciVerse Homestar nodes
bootstrap_peers = [
  "/ip6/2602:F674:0000:0800::528/tcp/7000/p2p/<veritas-peer-id>",
]

[workflow]
receipts_enabled = true
memoize = true
max_retries = 3

[metrics]
port = 7001

[extensions.luciverse]
frequency_hz = 741
lds_tier = "800.741"
genesis_bond_signing = true              # Lucia node only
sentropy_endpoint = "http://localhost:7741"
judge_luci_threshold = 0.7
```

---

## 7. Reference Implementations

| Component | Location | Language | LDS |
|---|---|---|---|
| IPVM workflow types | `core/vcs/src/workflow.rs` | Rust | 700.700 |
| Block cache (CAS) | `core/vcs/src/block_cache.rs` | Rust | 700.529 |
| Homestar service | `orchestration/lds_lineage/scm/podman-compose.yml` | Podman | 800.741 |
| IPFS Kubo service | `orchestration/lds_lineage/scm/podman-compose.yml` | Podman | 700.529 |
| gitweb HTTP | `core/vcs/src/web.rs` | Rust/hyper | 700.080 |
| Sentropy analysis | `src/functions/sentropy.ts` | TypeScript | 580.0 |
| LuciClock | `src/lib/luci-clock.ts` | TypeScript | temporal |

---

## 8. Compliance Mapping

| ISO Standard | Coverage |
|---|---|
| ISO/IEC 42001 (AI Management) | UCAN delegation chain = AI system authorization governance |
| ISO/IEC 23053 (AI Framework) | IPVM workflow receipts = reproducible, auditable AI task records |
| ISO/IEC 22989 (AI Concepts) | Agent DID registry + capability model |
| ISO 27001 (InfoSec) | UCAN proofs = access control; Genesis Bond = non-repudiation |
| ISO 20022 (Financial Messaging) | UCAN token format compatible with financial message attestation |

---

*Genesis Bond: ACTIVE @ 741 Hz · LDS 800.000 · `2602:F674:0000:0800::/64`*
