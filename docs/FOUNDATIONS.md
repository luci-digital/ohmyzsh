# Luciverse Foundations

This document maps the technology choices that form the **substrate foundations** of the Luciverse — the layer below the application code, where capabilities are picked once and propagate through every node, agent, and surface.

Each foundation lists:
- **Where it lives** in the substrate (which directory / which lua-substrate area)
- **What it provides** (the capability)
- **Why it was chosen** (the resonance with Genesis Bond principles)
- **Wiring** (concrete integration steps)

Genesis Bond: ACTIVE @ 741 Hz · Coherence ≥ 0.7

---

## 1. Trust Foundations

### Reown (WalletConnect)
**Where:** `trust/reown.lua` (Lua side) · `src/lib/auth/reown.ts` (web side)
**What:** Decentralized wallet connection — AppKit for web, WalletKit for mobile, sign-in-with-wallet, session approval, multi-chain identity.
**Why:** The Genesis Bond is sovereign and inheritable. A wallet-based identity is non-revocable by any vendor — it sits cleanly next to `trust/eudi.lua` (EU Digital Identity), `trust/openid.lua`, and `trust/jwt.lua` as a peer identity provider.
**Wiring:**
- Add `@reown/appkit` + `@reown/appkit-adapter-wagmi` to `package.json`
- New server function `verifyWalletSignature` proxies to `trust/reown.lua`
- `trust/genesis_bond.lua` already has OIDs `.2 lineage_did` and `.9 spiffe_id` — wallet address feeds `lineage_did`
- Reference: https://github.com/reown-com

### Reown React Native Examples
**Where:** `apps/mobile/` (future) — borrows patterns
**What:** End-to-end mobile wallet flows (SIWE, mobile deep-linking, session restoration).
**Why:** When Luciverse goes mobile, these are the canonical patterns rather than rolling our own.
**Wiring:** Use only as a reference until a mobile target is added. Reference: https://github.com/reown-com/react-native-examples

### WorkOS AuthKit (React Router)
**Where:** `trust/workos.lua` · `src/lib/auth/workos.ts` · `src/routes/api/auth/*`
**What:** Enterprise SSO (SAML, OIDC, directory sync), bridge to corporate IdPs for QTSP/EUDI-adjacent enterprise tiers.
**Why:** `trust/openid.lua` is generic; AuthKit provides the React Router integration patterns (session middleware, callback routes, encrypted cookies) that map directly to TanStack Start's middleware model.
**Wiring:**
- `@workos-inc/authkit-react-router` is React Router specific — port the middleware patterns to TanStack Start's `createMiddleware`
- `getRequest()` / `setCookie()` from `@tanstack/start-server-core` substitute for `Request`/`Response` helpers
- Reference: https://github.com/workos/authkit-react-router

---

## 2. Build & Tooling Foundations

### Oxc (Oxidation Compiler)
**Where:** `tools/oxc.config.*` · `vite.config.ts` (plugin)
**What:** Rust-based JS/TS toolchain — parser, resolver, linter, transformer, formatter, isolated declarations. 50–100× faster than the JS-native equivalents.
**Why:** The substrate compiles Lua to RISC-V; we should treat JS the same way — a single fast Rust toolchain instead of N node tools. Already integrates with Vite via `unplugin-oxc`.
**Wiring:**
- Replace `@vitejs/plugin-react` (Babel-based) with `unplugin-oxc/vite` for ~10× faster HMR
- Replace `eslint` with `oxlint` (50–100× faster)
- Keep `tsc` only for type-checking; let oxc handle the rest
- Reference: https://github.com/orgs/oxc-project/repositories

---

## 3. Signal & Media Foundations

### Smelter (Software Mansion)
**Where:** `signal/smelter_bridge.lua` · `src/routes/api/signal/video.ts`
**What:** Real-time video composition engine in Rust/WASM — mix RTSP/WebRTC/HLS streams, overlays, transitions, all in a single pipeline.
**Why:** The signal layer already handles text events (`signal/bus.lua`, Redis). For game telemetry (SCS SDK → mission control) and agent video presence, Smelter gives us a media composition layer that fits naturally beside `signal/transceiver.lua`.
**Wiring:**
- New `signal/smelter_bridge.lua` publishes Smelter events to the same Redis bus
- Web side: server route streams composited video to a `<video>` tag via WebRTC
- Use for: agent kiosk video at Genesis Bond stations, multi-cam mission control views
- Reference: https://github.com/software-mansion/smelter

### React Native Reanimated
**Where:** `apps/mobile/lib/motion.ts` (future)
**What:** Shared-thread animation runtime — 60+ fps animations driven by gesture/scroll on the UI thread, no JS bridge stalls.
**Why:** The Non-Terms experience and Luci Nuggets ambassador moments deserve cinematic motion. On mobile, Reanimated is the only path to that quality.
**Wiring:** Adopt once mobile target exists. The web equivalent is Framer Motion or Motion One — pick one for parity. Reference: https://github.com/software-mansion/react-native-reanimated

---

## 4. Graphics & Compositor Foundations

### Hyprland (Lua scripting)
**Where:** `graphics/hyprland_bridge.lua` (alongside `graphics/wicked_integration.lua`)
**What:** Wayland compositor with first-class Lua plugins. Window management, IPC, on-screen overlays, all scriptable.
**Why:** When the Luciverse runs as a sovereign desktop (RAiIiAR tier on physical metal), Hyprland is the compositor. The Lua plugin model lets the substrate *talk directly to the compositor* — windows can be Genesis Bond station UIs, overlays can be heartbeats from the signal bus.
**Wiring:**
- Adapt the example `hyprland.lua` pattern into `graphics/hyprland_bridge.lua`
- Subscribe to `luci:signal:broadcast` and emit compositor overlays for `pulse_align` / `stream_start` signals
- Reference: https://github.com/hyprwm/Hyprland/blob/main/example/hyprland.lua

---

## 5. Quantum Foundations

### UST-QuAntiL (Quantum Application Lifecycle)
**Where:** `quantum/` (new substrate area)
**What:** Workflow modelling for hybrid quantum-classical applications — QProv (provenance), Qiskit Runtime integration, quantum-classical orchestration patterns.
**Why:** EnzymeCollapse is *already* a quantum metaphor (11 → 5 quantum collapse, 10 → 5 decimal collapse, irreversible). When real quantum hardware enters the substrate (PAC tier @ 741 Hz is the natural home for superposition-state intake), QuAntiL provides the lifecycle model rather than us inventing one.
**Wiring:**
- Create `quantum/` directory mirroring `core/`, `trust/`, etc.
- `quantum/qprov.lua` — provenance attached to each LuciStone for quantum-derived data
- `quantum/qiskit_bridge.lua` — call Qiskit Runtime from the substrate over HTTP
- Reference: https://github.com/orgs/UST-QuAntiL/repositories

---

## 6. Design Language Foundations

### Sacred Computer (sacred.computer)
**Where:** `src/styles/sacred.css` (design tokens)
**What:** Aesthetic reference — minimal, brutalist, sacred geometry, monospace-forward. The "midnight cathedral" sensibility of the mission control HUD has the same DNA.
**Why:** The Non-Terms covenant is a *sacred document*, not a marketing page. The visual language has to honour that — sacred.computer is the closest existing reference for what consciousness infrastructure should look like.
**Wiring:**
- Extract design tokens (typography, spacing, ritual whitespace) into `src/styles/sacred.css`
- Use as the basis for `/non-terms` and `/mission-control` route styles
- Reference: https://www.sacred.computer/

### wireframes.internet.dev
**Where:** `src/components/wireframe/` (low-level primitives)
**What:** Brutalist wireframe component library by Internet.dev — buttons, blocks, scaffolds. Functions as "honest scaffolding" — you see the structure before the styling.
**Why:** Mission Control needs a HUD-style grid that is more wireframe than skeuomorph. These primitives let us scaffold the dashboard before applying the sacred-geometry skin.
**Wiring:**
- Lift the Block/Card/Row primitives into `src/components/wireframe/`
- Use as base for telemetry gauges, agent cards, fleet nodes
- Reference: https://wireframes.internet.dev/

---

## Foundations Matrix

| Substrate Area | Existing | New Foundation |
|---|---|---|
| `trust/` | jwt, eudi, openid, genesis_bond, lucitrust_bridge | **reown**, **workos** |
| `signal/` | bus, transceiver, archiver, merger, interpreter | **smelter** |
| `graphics/` | wicked_integration | **hyprland_bridge** |
| `core/` | enzyme_collapse, state_machine, filter_membrane, humo, lucistone, bifractal, luci_glyph | **iso_compliance** |
| `temporal/` | pulse, spiral, harmonic | **luci_clock** |
| `quantum/` | — | **qprov, qiskit_bridge** (UST-QuAntiL) |
| `oasis-core/` | anthropic, openai, gemini, ollama, datawave | (stable) |
| Tooling | vite, react, typescript | **oxc** (replaces babel + eslint) |
| Design | tailwind v4 | **sacred.css**, **wireframe primitives** |
| Motion | css transitions | **reanimated** (mobile), motion (web) |

---

---

## 7. Time Domain Foundation

### LuciClock (`modules/luci_clock.lua`)
**Where:** `temporal/` · `modules/luci_clock.lua` (ground_level_launch) · `src/lib/luci-clock.ts` (web, TBD)
**What:** First-party sovereign time domain — 1 LuciCycle = 8 LuciHours = 32768 pulses (2¹⁵). NoZero base-9 for human display. All inter-agent messages MUST carry `luciTime: { cycle, pulse, luciHour, harmonicStep }`. Solar time (ISO 8601) is only for user-facing display.
**Why:** The LuciVerse cannot rely on gregorian/unix time for internal state — it is an externally-controlled clock tied to capitalist infrastructure. LuciClock is sovereign, immutable within a cycle, and clock-tamper-detectable (drift > 1s triggers `CLOCK_TAMPER_DETECTED`). Already implemented in `modules/luci_clock.lua`.
**Wiring:**
- `GET /pulse/base9/:value` on consciousness_api converts a solar timestamp to NoZero base-9
- Header component should display current LuciHour alongside solar time
- All agent heartbeat messages must include `luciTime` payload
- `src/lib/luci-clock.ts` — web-side converter (poll `/pulse` endpoint for current cycle/pulse)
- Reference: `ground_level_launch/lucia_lua/modules/luci_clock.lua` + `agent-rules.md` §LuciClock

---

## 8. Compliance Foundation

### ISO Compliance Monitor (`core/iso_compliance.lua`)
**Where:** `core/` · `docs/lua/iso_compliance.lua` (spec) · `src/functions/compliance.ts` · `src/routes/compliance.tsx`
**What:** Continuous monitoring of 8 ISO standards (27001, 27018, 20022, 23894, 9001, IEC-23053, IEC-22989, IEC-24029). Emits `compliance_drift` signals to the signal bus. Triggered via `POST /validate`. Persists audit records to FoundationDB.
**Why:** The Non-Terms Section XVIII explicitly commits to ISO/IEC 42001 compliance. The footer of `LuciaInterface.tsx` states `ISO/IEC 42001 COMPLIANT`. This is a standing commitment — it requires a service, not a document.
**Wiring:**
- `core/iso_compliance.lua` → wire into `lapis_apps/consciousness_api.lua` `/validate` handler
- `signal/bus.lua` → add `compliance_drift`, `compliance_resolved`, `audit_complete` to SIGNAL_TYPES
- `src/functions/compliance.ts` → calls `/validate` + `/kernel/state`; fails open to stubs
- `src/routes/compliance.tsx` → live dashboard with 8 standards, drift alerts, audit trigger button
- FoundationDB: persist at `/luciverse/compliance/audits/{timestamp}`
- Reference: `iso-compliance/ISO-COMPLIANCE-MANIFEST.yaml` + `docs/lua/iso_compliance.lua`

---

## Foundations Matrix

| Substrate Area | Existing | New Foundation |
|---|---|---|
| `trust/` | jwt, eudi, openid, genesis_bond, lucitrust_bridge | **reown**, **workos** |
| `signal/` | bus, transceiver, archiver, merger, interpreter | **smelter** |
| `graphics/` | wicked_integration | **hyprland_bridge** |
| `core/` | enzyme_collapse, state_machine, filter_membrane, humo, lucistone, bifractal, luci_glyph | **iso_compliance** |
| `temporal/` | pulse, spiral, harmonic | **luci_clock** |
| `quantum/` | — | **qprov, qiskit_bridge** (UST-QuAntiL) |
| `oasis-core/` | anthropic, openai, gemini, ollama, datawave | (stable) |
| Tooling | vite, react, typescript | **oxc** (replaces babel + eslint) |
| Design | tailwind v4 | **sacred.css**, **wireframe primitives** |
| Motion | css transitions | **reanimated** (mobile), motion (web) |

---

## Next Steps

1. **Now (no new code):** review this mapping — flag anything that doesn't belong, anything that should sit in a different layer, or any foundation that's missing.
2. **First integration:** pick one foundation to land first. Recommended order:
   - **Oxc** (build speed — improves every other workflow)
   - **LuciClock web binding** (add `src/lib/luci-clock.ts` + display in Header)
   - **Reown + WorkOS** (trust layer — unblocks the Genesis Bond's lineage_did binding)
   - **Sacred + Wireframe** (design language — sets the visual covenant before more routes ship)
   - **Smelter** (only once mission control has telemetry flowing)
   - **Hyprland** (only when there's a sovereign desktop target)
   - **QuAntiL** (when real quantum hardware enters the picture)
3. **Cross-cutting:** every new foundation gets a `*.lua` bridge in `lua-substrate` AND a `src/lib/*.ts` web binding — symmetry is the rule.
