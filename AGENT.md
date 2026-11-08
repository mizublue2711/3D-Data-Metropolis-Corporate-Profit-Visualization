# AGENT GOVERNANCE DIRECTIVE: WEBAPP-PRESENTATION-ENGINE (VITE EDITION)
**System Identity:** ARTIFICIAL CRAFT (CRAFT//CODE) Architecture Substrate  
**Target Domain:** https://metropolis.artificialcraft.space/  
**Primary Paradigm:** Vite + React + TypeScript (SPA) · 0-Code JSON-Driven Architecture · 3-Tier System  
**Core Visual Identity:** Cybernetic Swiss Brutalism, Graphic Precision & Parametric Line-Art

---

### 🏛️ SECTION 1: ARCHITECTURAL PARADIGM & SYSTEM GOVERNANCE

#### 1.1 The 3-Tier Decoupled Operational Model
All code written or modified for this repository MUST strictly adhere to the 3-Tier Decoupled Infrastructure:
1. **Tier 1: Reasoning Core (Dify Cloud / Vertex AI)**: Emits structured JSON Abstract Syntax Tree (AST) payloads. Never outputs raw TSX/JSX code.
2. **Tier 2: Execution Orchestrator & Edge API Proxy (n8n / Cloudflare Workers / Vite Proxy)**: Handles deterministic fanout, webhook proxying (`import.meta.env.VITE_N8N_WEBHOOK_URL`), and strict Zod validation.
3. **Tier 3: Presentation Canvas (Vite React SPA Substrate)**: Operates strictly as a lightweight "Data Projector" on the client's GPU ($0.00 Server Render Cost, 60 FPS SLA).

#### 1.2 Zero-Code Policy & Single Source of Truth (SSOT) Registry
- **Zero-Code Content Policy**: Routine updates (3D showcases, financial layouts, spatial metropolis nodes) MUST be executed by pushing lightweight JSON AST payloads (~50 tokens). DO NOT alter existing TSX component files in `src/components/` to perform content edits.
- **SSOT Registry**: All 3D procedural components, HUD overlays, and Canvas routines MUST be registered centrally in `src/core/registry.ts`.
- **Strict React DOM Component Hierarchy**: 100% of UI overlay elements (HUD overlays, Brutalist buttons, info panels, tooltips) MUST be imported and rendered directly within the main React DOM tree (`src/App.tsx`). Creating standalone, unreferenced Vanilla DOM script entry points is strictly prohibited.

---

### ✂️ SECTION 2: SURGICAL EDIT CONSTRAINT & STRICT BUILD GATE SLA

#### 2.1 Surgical Edit Constraint (Token & File Integrity SLA)
- **NO FULL-FILE REWRITES**: Autonomous AI Workers (Cursor, Antigravity, Claude Code, Cline) are STRICTLY FORBIDDEN from rewriting or replacing entire source files exceeding 100 lines.
- **Surgical Snippet / Diff Delivery**: Output ONLY the targeted component or function snippet requiring modification.
- **Placeholder Syntax**: Always preserve untouched code blocks above and below the edit using standard comment placeholders: `// ... keep existing code unchanged ...`.

#### 2.2 Vite Path Aliases & Environment Variables
- **NO Relative Imports**: Never use relative paths such as `../../components` or `../../types`.
- **Standard Alias (`@/`)**: Convert all imports to use the configured Vite path alias (`@/components/...`, `@/core/...`, `@/types/...`, `@/lib/...`, `@/data/...`).
- **Vite Environment Variables**: MUST use `import.meta.env.VITE_*` (e.g., `import.meta.env.VITE_N8N_WEBHOOK_URL`). NEVER use `process.env` or `process.env.NEXT_PUBLIC_*`.

#### 2.3 Strict Build Gate Protocol
- **TypeScript Verification**: Prior to committing or pushing code, execute:
  ```bash
  npx tsc --noEmit
  ```
  The execution MUST yield exactly **Found 0 errors**.
- **No Build Artifact Commits**: DO NOT manually edit or commit files inside the Vite build output directory `dist/`.

---

### 🚀 SECTION 3: ENTRY POINT, CACHE EVICTION & DEPLOYMENT SLA (FROZEN BUILD PREVENTION)

#### 3.1 Rule 1: Mandatory Entry Point & Root Wiring Audit
Before declaring any UI or module task complete, verify that every newly created or refactored component is explicitly imported and rendered within `src/App.tsx`. Unreferenced orphan files will be excluded by the Vite bundler.

#### 3.2 Rule 2: Deterministic Cache Eviction & Clean Build
- Purge all local bundler caches before running production builds:
  ```bash
  rm -rf node_modules/.vite dist && npm run build
  ```
- Enforce the clean build command in `package.json`: `"build": "rimraf node_modules/.vite dist && tsc && vite build"`.

#### 3.3 Rule 3: Bundle Hash Change & Asset Audit
After building, inspect `dist/index.html` to confirm that the generated JavaScript bundle hash has CHANGED (e.g., from `index-BCmU4M2c.js` to a new unique hash). If the hash remains identical, treat it as a **Stale Asset Event**, halt execution, and clear cache.

#### 3.4 Rule 4: Cloudflare Edge & Custom Domain Release Protocol
- Custom domain `https://metropolis.artificialcraft.space/` exclusively serves production builds from the `main` branch.
- To release updates to the live custom domain, feature branches MUST be merged into `main` and deployed via:
  ```bash
  git checkout main && git merge <feature-branch> --no-ff
  npx wrangler deploy --routes "metropolis.artificialcraft.space/*"
  ```
- Ensure `wrangler.toml` explicitly defines static asset directory `[assets] directory = "./dist"` and preview variables `[previews.vars] ENVIRONMENT = "preview"`.

---

### 🎨 SECTION 4: 3D SPATIAL ENGINE & VRAM MEMORY LEAK SLA

#### 4.1 Cybernetic Swiss Brutalism Visual Tokens
- **Color Palette**: Base Obsidian `#05030A` / `#09090B`, Structural Charcoal `#18181E`, Electric Indigo `#5322FF`, Neon Cyan `#00E5FF`, Emerald `#10B981`, Red `#EF4444`.
- **Zero Radius & Geometry**: Enforce `border-radius: 0px !important` on all UI panels, buttons, tooltips, and modals. Use 45° chiseled geometry (`clip-path: polygon(...)`).
- **Typography & Grid**: JetBrains Mono / Space Grotesk font stack, 1px Swiss coordinate grid overlays, 60 FPS blinking crosshairs.

#### 4.2 Negative Geometry & Zero-G Spatial Matrix
- **STRICT NEGATIVE GEOMETRY BAN**: DO NOT attach plastic `THREE.ConeGeometry` or `THREE.CylinderGeometry` caps on top of 3D data columns.
- **Mandatory 3D Inverted Monoliths ($Y < 0$)**: Integrate `InvertedSubStructureModule.ts` to render 45° inverted pyramids underneath the floor ($Y < 0$) with 1px glowing sensor cores (`#00E5FF` / `#5322FF`) at each apex.
- **1px CAD Datum Glass Floor**: Render a transparent glass floor at $Y = 0$ (`opacity: 0.35`, 1px grid `#2D2D44`).
- **Obsidian Volumetric Fog**: Attach `THREE.FogExp2('#05050A', 0.012)` to seamlessly blend floor boundaries into the obsidian background.

#### 4.3 `ISceneModule` Lifecycle & VRAM Memory Leak SLA
Every custom 3D spatial module MUST implement the `ISceneModule` interface:
```typescript
export interface ISceneModule {
  id: string;
  init(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void;
  update(deltaTime: number, elapsedTime: number): void;
  onResize(width: number, height: number): void;
  dispose(): void; // MANDATORY VRAM cleanup ($0.00 Memory Leak SLA)
}
```
*Mandatory VRAM Disposal*: Empty `dispose()` methods are strictly forbidden. The `dispose()` function MUST explicitly call `.dispose()` on all `THREE.BufferGeometry`, `THREE.Material`, and `THREE.Texture` instances, clear `THREE.InstancedMesh` buffers, and remove child nodes from `THREE.Scene`.

#### 4.4 Central Camera Mediator & Priority Stack
- **Priority 100 (`NODE_INSPECT_MODE`)**: Raycast click lerps camera to focus offset (`nodeWorldPos + [0, 0.2, 1.5]`).
- **Priority 50 (`BEZIER_SPLINE_MODE`)**: Scroll-driven Z-axis tunnel flight.
- **Priority 10 (`IDLE_AUTO_FLY`)**: Continuous sine-wave cruise.
- **Anchor Memory**: Store `anchorCamPos` on focus entry; restore position and vanishing point target `(0, 0, -20)` when ESC is pressed.

---

### 🛡️ SECTION 5: RELIABILITY, ZOD SCHEMAS, VISUAL AUDIT & AGENT HYGIENE

#### 5.1 Zod AST Ingestion Gate & 2-Tier Graceful Fallback
- All incoming JSON AST payloads MUST be validated via `ZodSchema.safeParse(body)` before rendering.
- Use `.passthrough()` on object schemas to support extensible metadata.
- **2-Tier Fallback Policy (Zero-Crash SLA)**:
  - *Tier 1 (Compilation)*: Unregistered `componentKey` reassigns to `"swiss-hud"` with a deterministic seed string.
  - *Tier 2 (Runtime)*: Unmapped keys render a procedural 2D/3D canvas generator driven by seed string. Unhandled exceptions are prohibited.

#### 5.2 Rule 5: Visual Acceptance Criteria (Anti-False-Positive Audit)
Never confirm task completion based solely on HTTP 200 responses or clean console logs. AI Workers MUST perform a single-shot headless browser capture on the live URL and verify **3 mandatory visual markers**:
1. Presence of 4-corner CAD HUD telemetry labels: `[ A // 01 ]`, `[ B // 02 ]`, `[ C // 03 ]`, `[ D // 04 ]`.
2. Presence of inverted 3D sub-structures below floor ($Y < 0$) and falling Cyber Pollen particles.
3. Interactive hotkey action: Pressing `[H]` toggles side dock visibility.

#### 5.3 Micro-Ticket Granularity & Fresh Session Hygiene
- **Micro-Tickets**: Limit execution turns to 1-2 core responsibilities (max 15-20 minutes). Each ticket must achieve `npm run build` exit code `0`.
- **Session Hygiene**: Discard long-running chat sessions with accumulated terminal logs to prevent context bloat, zombie process deadlocks, and confirmation bias.
