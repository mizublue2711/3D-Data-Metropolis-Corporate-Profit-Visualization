# AGENT GOVERNANCE DIRECTIVE: WEBAPP-PRESENTATION-ENGINE (VITE EDITION)
> **System Identity:** ARTIFICIAL CRAFT (CRAFT//CODE) Architecture Substrate
> **Target Platform:** https://artificialcraft.space/
> **Primary Paradigm:** Vite + React + TypeScript (SPA) · 0-Code JSON-Driven Architecture · 3-Tier System
> **Core Visual Identity:** Cybernetic Swiss Brutalism, Graphic Precision & Parametric Line-Art

---

## 🏛️ SECTION 1: ARCHITECTURAL PARADIGM & SYSTEM GOVERNANCE

### 1.1 The 3-Tier Decoupled Operational Model (Vite Architecture)
All code written or modified for this repository MUST strictly respect the 3-Tier Decoupled Infrastructure built on **Vite + React + TypeScript**:
1. **Tier 1: Reasoning Core (Dify Cloud / Vertex AI)**: Emits structured JSON Abstract Syntax Tree (AST) payloads. Never outputs raw TSX/JSX code.
2. **Tier 2: Execution Orchestrator & Edge API Proxy (n8n / Cloudflare Workers / Vite Proxy)**: Handles deterministic 100% fanout, webhook proxying (`import.meta.env.VITE_N8N_WEBHOOK_URL`), and strict Zod validation.
3. **Tier 3: Presentation Canvas (Vite React SPA Substrate)**: Operates strictly as a lightweight "Data Projector" on the client's GPU ($0.00 Server Render Cost, 60 FPS Target).

### 1.2 0-Code Website Operations (Context Bloat Elimination)
- **Zero-Code Policy**: Routine updates (homepage layout, 3D showcases, directory trees, flipbooks) MUST be executed by pushing lightweight JSON AST payloads (~50 tokens).
- **Frozen UI Component Layer**: DO NOT alter existing `.tsx` component files in `src/components/` to perform content edits.
- **Single Source of Truth (SSOT) Registry**: All 3D procedural components, HUD overlays, and Canvas routines MUST be registered centrally in `src/core/registry.ts`.

---

## 📐 SECTION 2: SCOPED REFACTORING & AI WORKER DIRECTIVES

### 2.1 Surgical Edit Constraint (Token Conservation)
- **NO FULL-FILE REWRITES**: Autonomous AI Workers (Cursor, Antigravity, Claude Code, Jules) are STRICTLY FORBIDDEN from rewriting entire files exceeding 100 lines.
- **Snippet / Diff Delivery**: Output ONLY the exact target function/component snippet requiring modification.
- **Placeholder Syntax**: Use comments like `// ... keep existing code unchanged ...` for untouched sections above and below the edit.

### 2.2 Vite Path Alias & Environment Variables
- **NO Relative Imports**: Never use relative paths like `../../components` or `../../types`.
- **Standard Alias Path `@/`**: Configured in `vite.config.ts` and `tsconfig.json`. Convert all imports to standard alias paths:
  - `@/components/...`
  - `@/core/...`
  - `@/types/...`
  - `@/lib/...`
  - `@/data/...`
- **Vite Environment Variables**: MUST use `import.meta.env.VITE_*` (e.g. `import.meta.env.VITE_N8N_WEBHOOK_URL`). NEVER use `process.env` or `process.env.NEXT_PUBLIC_*`.

### 2.3 Stripping Shell Protocol
- **No Duplicate Wrappers**: When adding new landing modules or components into `src/components/`, DO NOT include duplicate `<Navbar />` or `<Footer />` elements. The top-level React root (`App.tsx` / `Layout.tsx`) already provides global navigation.

### 2.4 Strict Build Gate Protocol & Git Rules
- **TypeScript Verification**: Prior to creating Pull Requests or commits, execute:
  ```bash
  npx tsc --noEmit
  ```
  The execution MUST pass with exactly **`Found 0 errors`**.
- **NO Build Artifact Commits**: DO NOT manually edit or commit files inside the Vite build output directory `dist/`.

---

## 🎨 SECTION 3: BRANDING, DESIGN SYSTEM & NEGATIVE GEOMETRY RULES

### 3.1 Cybernetic Swiss Brutalism Tokens
- **Color Palette**:
  - Base Obsidian: `#09090B` / `#05030A`
  - Structural Charcoal: `#18181E`
  - Electric Indigo: `#5322FF`
  - Neon Cyan: `#00E5FF`
  - Alert Emerald: `#10B981`
  - Alert Red: `#EF4444`
- **Typography & Grid**:
  - JetBrains Mono / Space Grotesk monospaced technical font stack.
  - 1px Swiss coordinate grid overlays, 60 FPS blinking anchor crosshairs.

### 3.2 STRICT NEGATIVE GEOMETRY BAN
- **BAN Plastic Cone / Cylinder Caps**: DO NOT attach `THREE.ConeGeometry`, `THREE.CylinderGeometry`, or `THREE.TorusGeometry` caps on top of 3D data columns or monolith structures. Avoid any visual resemblance to condiment bottle caps or glossy plastic highlights.
- **MANDATORY Architectural Top Alternatives**:
  - **Flat Recessed Sensor Dock**: Flat top face with a 1px recessed glass inset emitting an Electric Cyan (`#00E5FF`) or Electric Indigo (`#5322FF`) grid core.
  - **Chamfered Brutalist Monolith**: 45-degree bevelled top edges (`THREE.EdgesGeometry` wireframe) over matte obsidian concrete or brushed charcoal metal.

---

## 🎮 SECTION 4: 3D SPATIAL ENGINE & CAMERA STATE CONTROLLER

### 4.1 Central Mediator Pattern (`PresentationEngine`)
- **No Direct Scene/Camera Mutating**: Individual components MUST NOT directly manipulate `scene` or `camera` instances.
- **`ISceneModule` Lifecycle Contract**: Every custom 3D scene module MUST implement the strict interface:
  ```typescript
  export interface ISceneModule {
    id: string;
    init(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void;
    update(deltaTime: number, elapsedTime: number): void;
    onResize(width: number, height: number): void;
    dispose(): void; // MANDATORY VRAM cleanup ($0.00 Memory Leak SLA)
  }
  ```

### 4.2 Camera Control Priority Stack & Dual-State Inspector
To prevent camera jitter and state conflicts, enforce the following priority stack:
1. **Priority 100 (`NODE_INSPECT_MODE`)**: Triggered via Raycasting Click. Camera lerps to a close-up focus position (`nodeWorldPos + offset [0, 0.2, 1.5]`) and centers the target node regardless of radial dispersion.
2. **Priority 50 (`BEZIER_SPLINE_MODE`)**: Scroll/Slider driven perspective tunnel flight along the Z-axis.
3. **Priority 10 (`IDLE_AUTO_FLY`)**: Sine-wave continuous cruise.

**Anchor Memory & Un-focus Protocol**:
- Upon entering `NODE_INSPECT_MODE`, store the pre-focus position in `anchorCamPos`.
- When the user presses `ESC` or clicks the canvas background, animate camera position back to `anchorCamPos` and restore `lookAt` toward the horizon vanishing point `(0, 0, -20)`.

### 4.3 Radial Dispersion & Perspective Tunnel Mechanics
- **4 Spatial Z-Zones**:
  - Zone 01 (`Z = +10m -> +5m`): Surface UI Glass Viewport.
  - Zone 02 (`Z = +5m -> 0m`): Exploded Component Matrix (`DynamicSectionRenderer`, `VideoShowcase`, `FlipBookEngine`).
  - Zone 03 (`Z = 0m -> -5m`): Interactive 3D Digital Line-Branching Directory Tree & Zod Gate.
  - Zone 04 (`Z = -5m -> -10m`): Deep AI Reasoning Horizon (Dify & n8n Monolith under 900-star GLSL skyvault).
- **Radial Dispersion Math**: As camera Z approaches any layer, dynamically offset X/Y coordinates of objects toward screen margins (`xOffset = ±Math.pow(1 / deltaZ, 1.5)`), maintaining an unobstructed central flight corridor.

---

## 🔒 SECTION 5: RELIABILITY, ZOD SCHEMAS & CLIENT EXPORTER

### 5.1 Zod AST Ingestion Gate & 2-Tier Graceful Fallback
- **Zod safeParse Validation**: Every incoming JSON AST payload MUST be validated against `ZodSchema.safeParse(body)` before rendering.
- **2-Tier Fallback Policy (Zero-Crash SLA)**:
  - *Tier 1 (Compilation Phase)*: If an unregistered `componentKey` is provided, reassign `componentKey = "swiss-hud"` and generate a deterministic seed string from the section title.
  - *Tier 2 (Runtime Phase)*: If an unmapped key reaches `<GenerativeVisual />`, fall back to a procedural 2D/3D Canvas generator driven by the seed string. The UI MUST NOT throw unhandled exceptions.

### 5.2 Client-Side Auto-Fly Motion Video Exporter (.WebM)
- **Zero Server Fee ($0.00)**: Video recording MUST execute 100% on the client's browser.
- **Capture Specs**: Capture the HTML5 WebGL `<canvas>` stream using `MediaRecorder` API:
  - Codec: `video/webm;codecs=vp9`
  - Target Bitrate: `3000000` (3.0 Mbps -> ultra-light ~1.5MB to 3.5MB file size)
  - Frame Rate: 60 FPS Target
  - Filename: `artificialcraft-autofly-motion-[timestamp].webm`


--------------------------------------------------------------------------------
🏛️ AUTOMATED AGENT GOVERNANCE PROTOCOL (ANTIGRAVITY & CLINE ORCHESTRATION SLA)
--------------------------------------------------------------------------------

All autonomous AI Agents (Orchestrators like Antigravity and Workers like Cline) interacting with this repository MUST strictly enforce and adhere to the following infrastructure rules:

#### 1. SURGICAL EDIT CONSTRAINT (TOKEN & FILE INTEGRITY SLA)
- **NO FULL-FILE REWRITES**: AI Workers are STRICTLY FORBIDDEN from rewriting or replacing entire source files exceeding 100 lines.
- **SURGICAL DIFF DELIVERABLES**: All code modifications must be delivered as targeted line-by-line diffs.
- **PLACEHOLDER SYNTAX**: Always preserve untouched code blocks above and below the edit using standard comment placeholders: `// ... keep existing code unchanged ...`.
- **INFRASTRUCTURE PROTECTION**: Never delete system comments, path aliases (`@/`), or refactor core infrastructure components (`PresentationEngine.ts`) unless explicitly commanded.

#### 2. STRICT BUILD GATE & INFINITE LOOP PREVENTION PROTOCOL
- **MANDATORY TYPESCRIPT CHECK**: Immediately following ANY file creation or modification, the execution worker MUST run:
  ```bash
  npx tsc --noEmit
ZERO-ERROR REQUIREMENT: The execution output MUST yield exactly: Found 0 errors.
CIRCUIT BREAKER & REVERT RULE: If compilation returns errors (> 0 errors), the worker MUST NOT switch tasks or commit code. Fix the TypeScript errors immediately. If the error remains unresolved after 3 attempts, execute git checkout -- . to revert to the last stable state and notify the Orchestrator.


3. THREE.JS VRAM MEMORY LEAK SLA ($0.00 MEMORY LEAK SLA)
ISCENEMODULE INTERFACE CONTRACT: Every custom 3D scene module created in src/components/canvas/ MUST implement the ISceneModule interface:
export interface ISceneModule {
  id: string;
  init(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void;
  update(deltaTime: number, elapsedTime: number): void;
  onResize(width: number, height: number): void;
  dispose(): void; // MANDATORY VRAM cleanup (\$0.00 Memory Leak SLA)
}
MANDATORY VRAM DISPOSAL: Empty dispose() methods are STRICTLY PROHIBITED. The dispose() function MUST explicitly dispose of all THREE.BufferGeometry, THREE.Material, THREE.Texture instances, clear THREE.InstancedMesh buffers, and remove all child objects from THREE.Scene.


5. ZERO-CODE JSON AST POLICY & SINGLE SOURCE OF TRUTH (SSOT) REGISTRY
3-TIER DECOUPLED ARCHITECTURE: Respect the 3-Tier model: Tier 1 Reasoning (Emit JSON AST) ➔ Tier 2 Orchestrator (n8n/Cloudflare/Vite Proxy Route & Validate) ➔ Tier 3 Presentation Canvas (Vite React GPU Client 60 FPS).
FROZEN UI COMPONENT LAYER: Content and spatial layout updates MUST be executed strictly by emitting lightweight JSON AST payloads (~50 tokens). DO NOT alter existing TSX component files in src/components/ to perform content updates.
SSOT REGISTRY ENFORCEMENT: All 3D procedural components, HUD overlays, and Canvas routines MUST be registered centrally in src/core/registry.ts.


7. PATH ALIASES & VITE ENVIRONMENT VARIABLES
NO RELATIVE IMPORTS: Never use relative paths such as ../../components or ../../types.
STANDARD ALIAS @/: Convert all imports to use the configured Vite path alias (@/components/..., @/core/..., @/types/..., @/lib/...).
VITE ENV VARS: All environment variables MUST be accessed via import.meta.env.VITE_* (e.g., import.meta.env.VITE_N8N_WEBHOOK_URL). NEVER use process.env.

-----------------------------------------------------------

# AGENT OPERATIONAL & DEPLOYMENT GUARDRAILS

## Rule 1: Mandatory Entry Point & Component Wiring Verification
- Before declaring any UI or module task complete, you MUST verify that every newly created or refactored component is explicitly imported and rendered within the main application tree (e.g., `src/App.tsx` or `src/main.tsx`).
- Creating standalone component files without connecting them to the root React/DOM tree is strictly prohibited, as bundlers (Vite/Webpack) will treat them as unreferenced orphan files and exclude them from the output build.

## Rule 2: Deterministic Cache Eviction & Strict Build Verification
- Prior to running any production build test (`npm run build`), you MUST purge all local bundler caches (`rm -rf node_modules/.vite dist`).
- Executing `npm run build` without cache eviction is forbidden to prevent stale pre-bundled chunks.
- Builds must pass strict type-checking (`tsc && vite build`) with an explicit exit status of `0`. `Found 0 errors` is mandatory.

## Rule 3: Bundle Hash Change & Asset Audit
- After building, you MUST inspect `dist/index.html` or `dist/assets/` to confirm that the JavaScript bundle hash has changed compared to the previous deployment build.
- If the bundle hash remains identical to the previous build, treat the build as a **Build Failure / Stale Asset Event**, halt execution, and trace missing imports.

## Rule 4: Visual Acceptance Criteria (Anti-False-Positive Rule)
- Never confirm UI task completion based solely on HTTP 200 status codes, clean console logs, or basic Playwright canvas presence.
- You MUST verify UI changes using a strict **Visual Baseline Audit** consisting of at least 3 immutable, unique visual markers:
  1. Presence of new explicit UI text labels or IDs 
  2. Distinct unique CSS color values 
  3. Interactive DOM element state changes verified on the actual preview/live URL with browser cache disabled.

## Rule 5: Micro-Ticket Granularity & Task Scope Limit
- Tasks assigned to execution turns MUST be scoped as single **Micro-Tickets** limited to 1-2 core responsibilities (maximum 15-20 minutes of agent execution).
- Complex multi-feature prompts MUST be decomposed into sequential micro-tickets. Every micro-ticket must achieve an `npm run build exit 0` state before proceeding to the next.

## Rule 6: Fresh Session & Process Hygiene Protocol
- *Run* *./deployment-audit.sh* *and confirm exit code 0.*
- Long-running chat sessions with accumulated terminal log buffers or Playwright background processes must be discarded to prevent context overload, zombie process deadlocks, and confirmation bias.


9. ZOD SCHEMAS & ZERO-CRASH FALLBACK POLICY
MANDATORY INGESTION GATE: All incoming JSON AST payloads MUST be validated against ZodSchema.safeParse(body) prior to rendering.
2-TIER GRACEFUL FALLBACK: If an unmapped or unregistered componentKey is ingested, fallback to swiss-hud or procedural canvas generators. The application MUST NOT throw unhandled exceptions or crash the WebGL context.
