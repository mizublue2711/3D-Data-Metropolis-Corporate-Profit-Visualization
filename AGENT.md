# AGENT GOVERNANCE DIRECTIVE: WEBAPP-PRESENTATION-ENGINE (VITE EDITION)
**System Identity:** ARTIFICIAL CRAFT (CRAFT//CODE) Architecture Substrate
**Target Platform:** https://metropolis.artificialcraft.space/
**Primary Paradigm:** Vite + React + TypeScript (SPA) · 0-Code JSON-Driven Architecture · 3-Tier System
**Core Visual Identity:** Cybernetic Swiss Brutalism, Graphic Precision & Parametric Line-Art

---

### 🏛️ SECTION 1: ARCHITECTURAL PARADIGM & SYSTEM GOVERNANCE
- **1.1 The 3-Tier Decoupled Operational Model**:
  1. **Tier 1: Reasoning Core (Dify Cloud / Vertex AI)**: Emits structured JSON AST payloads. Never outputs raw TSX/JSX code.
  2. **Tier 2: Execution Orchestrator & Edge API Proxy (n8n / Cloudflare Workers)**: Handles deterministic 100% fanout, webhook proxying (`import.meta.env.VITE_N8N_WEBHOOK_URL`), and strict Zod validation.
  3. **Tier 3: Presentation Canvas (Vite React GPU Substrate)**: Operates strictly as a lightweight "Data Projector" on the client's GPU ($0.00 Server Render Cost, 60 FPS Target).
- **1.2 Zero-Code Operations & Frozen UI Component Layer**:
  - **Zero-Code Policy**: Routine updates (homepage layout, 3D showcases, financial cityscape) MUST be executed by pushing lightweight JSON AST payloads (~50 tokens).
  - **Frozen UI Component Layer**: DO NOT alter existing component files in `src/components/` to perform simple content edits.
  - **Single Source of Truth (SSOT) Registry**: All 3D procedural components, HUD overlays, and Canvas routines MUST be registered centrally in `src/core/registry.ts`.
  - **Strict React DOM Wiring**: 100% of UI components and overlay HUDs MUST be explicitly imported and rendered inside the main React DOM tree (`src/App.tsx`). Standalone or unwired Vanilla DOM files (`document.body.appendChild` outside React) are strictly prohibited.

---

### 🛡️ SECTION 2: GIT BRANCHING & MAIN BRANCH PROTECTION SLA (NEW HARD GUARDRAILS)
- **2.1 STRICT PROHIBITION: DIRECT MAIN MERGES & COMMITS ARE FORBIDDEN**:
  - Autonomous AI Workers (Cursor, Antigravity, Cline, Jules) are **STRICTLY FORBIDDEN** from executing direct commits or unverified merges into the `main` production branch.
  - All feature work, bug fixes, and visual refactoring MUST be executed on isolated feature branches (e.g., `feature/3d-negative-space-and-arcs`).
- **2.2 Feature Branch & Pull Request Protocol**:
  1. Develop and test all code modifications exclusively on dedicated feature branches.
  2. Push feature branches to remote (`git push origin <feature-branch>`) and open a Pull Request.
  3. Run full CI Build Gate verification (`npx tsc --noEmit` + clean build) BEFORE merging PRs into `main`.
- **2.3 Surgical Edit Constraint (Token Conservation)**:
  - **NO FULL-FILE REWRITES**: Forbidden from rewriting or replacing entire source files exceeding 100 lines.
  - **Surgical Snippet / Diff Delivery**: Output ONLY targeted line-by-line diffs.
  - **Placeholder Syntax**: Preserve untouched code blocks above and below edits using standard comment placeholders: `// ... keep existing code unchanged ...`.
- **2.4 Vite Path Alias & Environment Variables**:
  - **NO Relative Imports**: Never use relative paths like `../../components` or `../../types`. Always use standard alias paths configured in `vite.config.ts`: `@/components/...`, `@/core/...`, `@/types/...`, `@/lib/...`.
  - **Vite Environment Variables**: Access environment variables strictly via `import.meta.env.VITE_*`. NEVER use `process.env`.

---

### 🚀 SECTION 3: ENTRY POINT, CACHE EVICTION & DEPLOYMENT SLA (PREVENTING FROZEN BUILDS)
- **Rule 1: Mandatory Entry Point & Component Wiring Verification**:
  - Before declaring any task complete, verify that every newly created or refactored component is explicitly imported and rendered within `src/App.tsx`. Orphan files excluded from Vite bundle trees are strictly prohibited.
- **Rule 2: Deterministic Cache Eviction & Strict Build Verification**:
  - Purge local bundler caches prior to running production build tests: `rm -rf node_modules/.vite dist`.
  - Build execution must pass strict type-checking (`tsc && vite build`) with an explicit exit status of `0` and **Found 0 errors**.
- **Rule 3: Bundle Hash Change & Asset Audit**:
  - Inspect `dist/index.html` after build to confirm the output JavaScript bundle hash has CHANGED compared to the previous release (e.g. `index-[new-hash].js`).
  - If the bundle hash remains identical, treat as a Stale Asset Build Failure, halt execution, and resolve missing imports.
- **Rule 4: Cloudflare Custom Domain Release Routing**:
  - Custom domain `metropolis.artificialcraft.space` exclusively serves production builds from `main`.
  - Ensure `wrangler.toml` includes static asset binding `[assets] directory = "./dist"` and custom domain route patterns (`metropolis.artificialcraft.space/*`).
  - Edge deployment command: `npx wrangler deploy --routes "metropolis.artificialcraft.space/*"`.

---

### 🎮 SECTION 4: 3D SPATIAL ENGINE & VRAM MEMORY LEAK SLA
- **4.1 Cybernetic Swiss Brutalism Design System**:
  - **Zero Radius Policy**: Enforce `border-radius: 0px !important` on ALL buttons, panels, tooltips, and modals.
  - **Mechanical 45° Geometry**: Use 45° chiseled geometry (`clip-path: polygon(...)`) for buttons and cards.
  - **Color Palette**: Obsidian `#05050A`, Structural Charcoal `#18181E`, Hyper Cyan `#00E5FF`, Electric Indigo `#5322FF`, Alert Emerald `#10B981`.
  - **Typography**: Monospaced technical font stack (JetBrains Mono / Space Grotesk).
- **4.2 Negative Geometry & Zero-G Spatial Matrix**:
  - **STRICT BAN on Plastic Cone / Cylinder Caps**: Avoid Torus, Cone, or Cylinder tops on 3D monoliths.
  - **MANDATORY Inverted Sub-Structure**: 45° inverted monolith pyramids underneath the floor (Y < 0) with 1px glowing sensor cores (`#00E5FF` / `#5322FF`) at each apex.
  - **1px CAD Datum Glass Floor**: Transparent glass floor at Y = 0 (`opacity: 0.35`, grid `#2D2D44`) with Volumetric Fog (`THREE.FogExp2('#05050A', 0.012)`).
- **4.3 Central Mediator & VRAM Disposal SLA ($0.00 Memory Leak SLA)**:
  - All custom 3D scene modules created in `src/components/canvas/` MUST implement the `ISceneModule` interface:
    ```typescript
    export interface ISceneModule {
      id: string;
      init(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void;
      update(deltaTime: number, elapsedTime: number): void;
      onResize(width: number, height: number): void;
      dispose(): void; // MANDATORY VRAM cleanup ($0.00 Memory Leak SLA)
    }
    ```
  - Empty `dispose()` methods are strictly prohibited. The `dispose()` function MUST explicitly dispose of `THREE.BufferGeometry`, `THREE.Material`, `THREE.Texture`, clear `THREE.InstancedMesh` buffers, and remove child objects from `THREE.Scene`.
- **4.4 Camera Mediator Stack**:
  - Priority 100 (`NODE_INSPECT_MODE`): Raycast node focus lerp.
  - Priority 50 (`BEZIER_SPLINE_MODE`): Perspective tunnel cruise.
  - Priority 10 (`IDLE_AUTO_FLY`): Sine-wave continuous cruise.
  - Anchor Memory: Store pre-focus position in `anchorCamPos` and restore on ESC key press.

---

### 🔒 SECTION 5: RELIABILITY, ZOD SCHEMAS, VISUAL AUDIT & AGENT HYGIENE
- **5.1 Zod AST Ingestion Gate & 2-Tier Graceful Fallback**:
  - Validate all incoming JSON AST payloads against `ZodSchema.safeParse(body)` using `.passthrough()` for AST v2 flexibility.
  - Tier 1: Fallback unmapped `componentKey` to `swiss-hud`.
  - Tier 2: Unhandled runtime keys fall back to procedural canvas generation (Zero-Crash SLA).
- **5.2 Rule 5: Visual Acceptance Criteria (Anti-False-Positive Rule)**:
  - NEVER confirm UI task completion based solely on HTTP 200 status codes, clean console logs, or basic Playwright canvas presence.
  - AI MUST perform a Visual Baseline Audit on EXACTLY ONE screenshot of the live preview URL, verifying 3 immutable markers:
    1. Presence of 4-corner Swiss CAD HUD telemetry labels (`[ A // 01 ]` at top-left).
    2. Presence of inverted 3D pyramids underneath Y < 0 with Hyper Cyan Pollen particles.
    3. Interactive hotkey toggle state (`[H]` key dock collapse).
- **5.3 Rule 6: Micro-Ticket Granularity & Fresh Session Hygiene**:
  - Scope task execution into single micro-tickets limited to 1–2 responsibilities (15–20 minutes max execution).
  - Clear stale chat context or terminal log buffers before initiating new refactoring runs to prevent context deadlocks and false-positive confirmation bias.
