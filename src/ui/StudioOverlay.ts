import * as xb from 'xrblocks';
import {
  INITIAL_FINANCIAL_DATA,
  SECTOR_DISTRICTS,
  THEME_PALETTES,
} from '../constants';
import { MetropolisScene } from '../scene/MetropolisScene';
import {
  fetchFinancialDataFromSheet,
  fetchSpreadsheetMetadata,
  googleSignIn,
  initAuth,
  logoutGoogle,
} from '../services/googleSheetsService';
import { soundService } from '../services/soundService';
import {
  CameraPresetMode,
  ColorCodingMode,
  FinancialCompanyData,
  MetricMode,
  MetropolisAppState,
  ProfitFilterPreset,
  ScaleMode,
  SectorType,
  ShaderStyleMode,
  ThemePreset,
  sanitizeAndValidateFinancialDataset,
} from '../types';

export class StudioOverlay {
  private rootEl: HTMLElement;
  private sceneScript: MetropolisScene;
  private state: MetropolisAppState;

  // Google Sheets UI state
  private googleUserEmail: string | null = null;
  private needsGoogleAuth = true;
  private sheetInputUrl = '';
  private discoveredTabs: string[] = [];
  private selectedSheetTab = '';
  private sheetStatusMessage = '';
  private sheetStatusIsError = false;
  private isSheetLoading = false;
  private importStatusMessage = '';

  private telemetryTimer: number | null = null;

  constructor(sceneScript: MetropolisScene, state: MetropolisAppState) {
    this.sceneScript = sceneScript;
    this.state = state;

    let existing = document.getElementById('studio-ui-root');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'studio-ui-root';
      document.body.appendChild(existing);
    }
    this.rootEl = existing;

    initAuth(
      (user) => {
        this.googleUserEmail = user.email || user.displayName || 'Connected';
        this.needsGoogleAuth = false;
        this.render();
      },
      () => {
        this.googleUserEmail = null;
        this.needsGoogleAuth = true;
        this.render();
      },
    );

    this.telemetryTimer = window.setInterval(() => {
      this.updateLiveTelemetryDom();
    }, 500);

    this.render();
  }

  private updateLiveTelemetryDom(): void {
    const fpsEl = document.getElementById('sla-fps-readout');
    if (fpsEl) {
      fpsEl.textContent = `${this.state.fps.toFixed(1)} FPS`;
    }
    const voxelEl = document.getElementById('sla-voxel-readout');
    if (voxelEl) {
      voxelEl.textContent = `${this.state.renderedVoxelCount} / ${this.sceneScript.records.length}`;
    }
    const reconTimerEl = document.getElementById('recon-timer-readout');
    if (reconTimerEl && this.state.shellMode === 'reconGame') {
      reconTimerEl.textContent = `${Math.ceil(this.state.reconTimeRemaining)}s`;
    }
  }

  public render(): void {
    // Preserve focus & cursor if user is typing in the search box or sheet URL input
    const activeEl = document.activeElement as HTMLInputElement | null;
    const activeId = activeEl?.id;
    const selectionStart = activeEl?.selectionStart ?? null;

    const visibleTowers = this.sceneScript.towerRuntime.filter(
      (t) => t.visible,
    );
    const totalQ3 = visibleTowers.reduce(
      (acc, t) => acc + t.data.profitQ3_2026,
      0,
    );
    const total9M = visibleTowers.reduce(
      (acc, t) => acc + t.data.profit9M_2026,
      0,
    );
    const hyperCount = visibleTowers.filter(
      (t) => (t.data.growthQ3_YoY ?? 0) >= 100,
    ).length;
    const lossCount = visibleTowers.filter(
      (t) => t.data.profitQ3_2026 < 0 || t.data.profit9M_2026 < 0,
    ).length;

    const activeFocusId =
      this.state.lockedCompanyId ?? this.state.hoveredCompanyId;
    const focusedTower = activeFocusId
      ? this.sceneScript.towerRuntime.find((t) => t.data.id === activeFocusId)
      : undefined;

    this.rootEl.innerHTML = `
      <div class="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between select-none">
        ${this.state.shellMode === 'title' ? this.renderTitleScreenOverlay(totalQ3, total9M) : ''}
        ${this.state.shellMode !== 'title' ? this.renderWorkspaceHud(focusedTower, totalQ3, total9M, hyperCount, lossCount) : ''}
        ${this.state.shellMode === 'reconSummary' ? this.renderReconSummaryModal() : ''}
        ${this.state.showReferenceModal ? this.renderReferenceReportModal() : ''}
      </div>
    `;

    this.attachEventListeners();

    if (activeId) {
      const restored = document.getElementById(
        activeId,
      ) as HTMLInputElement | null;
      if (restored) {
        restored.focus();
        if (selectionStart !== null && restored.setSelectionRange) {
          restored.setSelectionRange(selectionStart, selectionStart);
        }
      }
    }
  }

  private renderTitleScreenOverlay(totalQ3: number, total9M: number): string {
    return `
      <div class="fixed inset-0 pointer-events-auto flex flex-col justify-between p-8 md:p-14 bg-gradient-to-t from-black/90 via-black/45 to-black/75">
        <!-- Top Spec Bar -->
        <div class="flex items-center justify-between border-b border-white/15 pb-4">
          <div class="flex items-center gap-4">
            <span class="font-mono-tabular text-xs tracking-widest text-cyan-400 font-semibold">ARTIFICIAL CRAFT // CAD MATRIX</span>
            <span class="text-zinc-500">·</span>
            <span class="font-mono-tabular text-xs text-zinc-400">50 CORPORATE ENTITIES LOADED</span>
          </div>
          <div class="flex items-center gap-6 font-mono-tabular text-xs text-zinc-300">
            <span>Q3/2026 SUM: <strong class="text-cyan-400">${totalQ3.toLocaleString()} TỶ</strong></span>
            <span>·</span>
            <span>9M/2026 SUM: <strong class="text-emerald-400">${total9M.toLocaleString()} TỶ</strong></span>
          </div>
        </div>

        <!-- Center Bespoke SVG Title Lockup over negative space -->
        <div class="max-w-3xl my-auto">
          <div class="mb-4">
            <svg class="w-full max-w-xl h-auto" viewBox="0 0 680 148" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="3D Data Metropolis">
              <rect x="1" y="1" width="66" height="66" stroke="#00E5FF" stroke-width="1.5" fill="rgba(0,229,255,0.06)"/>
              <path d="M16 52V28L34 16L52 28V52L34 60L16 52Z" stroke="#00E5FF" stroke-width="2"/>
              <path d="M34 16V60M16 28L34 38L52 28" stroke="#5322FF" stroke-width="1.5"/>
              <text x="84" y="34" fill="#00E5FF" font-family="JetBrains Mono, monospace" font-size="13" font-weight="600" letter-spacing="4">SWISS TACTICAL CAD // FINANCIAL VOXEL ENGINE</text>
              <text x="82" y="84" fill="#FFFFFF" font-family="Plus Jakarta Sans, sans-serif" font-size="44" font-weight="700" letter-spacing="-1">3D DATA METROPOLIS</text>
              <text x="84" y="122" fill="#A1A1AA" font-family="JetBrains Mono, monospace" font-size="16" font-weight="500" letter-spacing="1.5">PRE-TAX PROFIT (LNTT Q3 &amp; 9M 2026) SPATIAL MATRIX</text>
              <line x1="84" y1="138" x2="660" y2="138" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
              <rect x="84" y="136" width="96" height="4" fill="#00E5FF"/>
            </svg>
          </div>

          <p class="text-zinc-300 text-sm md:text-base max-w-2xl leading-relaxed mb-8">
            Explore 50 corporate earnings structures mapped across 7 industrial districts inside an Obsidian Swiss-Grid Bunker and open Starry Night Vault. Inspect YoY growth trajectories, compare head-to-head calipers, import live Google Sheets, or pilot the Tactical Anomaly Recon challenge.
          </p>

          <div class="flex flex-wrap items-center gap-4">
            <button id="btn-enter-metropolis" class="px-6 py-3.5 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-semibold text-sm rounded transition-colors cursor-pointer whitespace-nowrap">
              Enter 3D Metropolis (Enter / Space)
            </button>
            <button id="btn-start-recon-title" class="px-5 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-cyan-500/40 font-mono-tabular text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap">
              Launch Anomaly Recon Game (60s)
            </button>
            <button id="btn-open-report-title" class="px-4 py-3.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-white/15 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap">
              View Original Report Table
            </button>
          </div>
        </div>

        <!-- Single Flat Control-Hint Footer Line -->
        <div class="border-t border-white/15 pt-4 flex flex-wrap items-center justify-between gap-4 font-mono-tabular text-xs text-zinc-400">
          <span>WASD / Arrows Move Drone · Left-Drag Orbit · Scroll Zoom · Click Tower Lock · H Toggle Dock · Esc Reset</span>
          <span>WEBGL2 INSTANCED MESH · XR BLOCKS SPATIAL UI</span>
        </div>
      </div>
    `;
  }

  private renderWorkspaceHud(
    focusedTower:
      | {
          data: FinancialCompanyData;
          sectorRank: number;
          isNegative: boolean;
        }
      | undefined,
    totalQ3: number,
    total9M: number,
    hyperCount: number,
    lossCount: number,
  ): string {
    const isCollapsed = this.state.dockCollapsed;

    return `
      <div class="flex flex-1 min-h-0 relative">
        <!-- LEFT SIDEBAR: 396px Tactical Control Dock -->
        <aside
          class="pointer-events-auto h-full flex flex-col bg-[#09090B]/95 border-r border-white/12 transition-transform duration-200 ease-out"
          style="width: 396px; max-width: 92vw; transform: translateX(${isCollapsed ? '-100%' : '0'});"
        >
          <!-- Sidebar Brand Header -->
          <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 bg-[#0c0c10]">
            <div>
              <div class="font-mono-tabular text-[11px] text-cyan-400 font-semibold tracking-wider">3D DATA METROPOLIS</div>
              <div class="text-xs text-zinc-400">LNTT Q3 &amp; 9T/2026 · 50 Companies</div>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                id="btn-view-source-table"
                title="View Source Report Image"
                class="px-2.5 py-1.5 text-[11px] font-mono-tabular bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/15 rounded cursor-pointer whitespace-nowrap"
              >
                Source Table
              </button>
              <button
                id="btn-toggle-mute"
                title="Toggle Synth Audio"
                class="px-2.5 py-1.5 text-[11px] font-mono-tabular bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/15 rounded cursor-pointer whitespace-nowrap"
              >
                ${this.state.soundMuted ? 'Audio Off' : 'Audio On'}
              </button>
              <button
                id="btn-collapse-dock"
                title="Collapse Sidebar (Shortcut: H)"
                class="px-2.5 py-1.5 text-[11px] font-mono-tabular bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-cyan-500/30 rounded cursor-pointer whitespace-nowrap"
              >
                Hide [H]
              </button>
            </div>
          </div>

          <!-- 5-Tab Navigation Bar -->
          <div class="grid grid-cols-5 border-b border-white/10 bg-[#0d0d12] font-mono-tabular text-[11px]">
            ${this.renderTabButton('metrics', '01.Data')}
            ${this.renderTabButton('styling', '02.Style')}
            ${this.renderTabButton('filtering', '03.Filter')}
            ${this.renderTabButton('camera', '04.Cam')}
            ${this.renderTabButton('telemetry', '05.SLA')}
          </div>

          <!-- Active Tab Body -->
          <div class="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            ${this.state.activeTab === 'metrics' ? this.renderTab1Metrics() : ''}
            ${this.state.activeTab === 'styling' ? this.renderTab2Styling() : ''}
            ${this.state.activeTab === 'filtering' ? this.renderTab3Filtering() : ''}
            ${this.state.activeTab === 'camera' ? this.renderTab4Camera() : ''}
            ${this.state.activeTab === 'telemetry' ? this.renderTab5Telemetry(totalQ3, total9M, hyperCount, lossCount) : ''}
          </div>

          <!-- Compact Dock Footer Summary -->
          <div class="px-4 py-2.5 border-t border-white/10 bg-[#0c0c10] flex items-center justify-between font-mono-tabular text-[11px] text-zinc-400">
            <span>Q3: <strong class="text-cyan-400">${totalQ3.toLocaleString()}B</strong></span>
            <span>·</span>
            <span>9M: <strong class="text-emerald-400">${total9M.toLocaleString()}B</strong></span>
            <span>·</span>
            <button id="btn-return-title" class="text-zinc-400 hover:text-white underline cursor-pointer">Title Screen</button>
          </div>
        </aside>

        <!-- Expand Button when Dock is Collapsed -->
        ${
          isCollapsed
            ? `
          <div class="pointer-events-auto fixed top-4 left-4 z-30 flex items-center gap-2">
            <button
              id="btn-expand-dock"
              class="px-3.5 py-2 bg-[#09090B]/95 hover:bg-zinc-900 text-cyan-400 border border-cyan-500/40 rounded font-mono-tabular text-xs font-semibold shadow-lg cursor-pointer whitespace-nowrap"
            >
              ▸ Show Controls [H]
            </button>
            <button
              id="btn-view-source-collapsed"
              class="px-3 py-2 bg-[#09090B]/95 hover:bg-zinc-900 text-zinc-200 border border-white/15 rounded font-mono-tabular text-xs cursor-pointer whitespace-nowrap"
            >
              Source Table
            </button>
          </div>
        `
            : ''
        }

        <!-- RIGHT VIEWPORT PERIMETER HUD (Unobstructed 3D Canvas Center) -->
        <div class="flex-1 flex flex-col justify-between p-4 pointer-events-none">
          <!-- Top Perimeter Bar (Recon Game Banner OR Quick Status Strip) -->
          <div class="flex items-start justify-between gap-4">
            ${
              this.state.shellMode === 'reconGame'
                ? `
              <div class="pointer-events-auto bg-[#09090B]/95 border border-cyan-400/50 rounded px-4 py-3 max-w-xl shadow-xl">
                <div class="flex items-center justify-between gap-6 mb-1 font-mono-tabular text-xs">
                  <span class="text-cyan-400 font-bold">TACTICAL ANOMALY RECON MISSION</span>
                  <div class="flex items-center gap-4">
                    <span>SCORE: <strong class="text-emerald-400">${this.state.reconScore}</strong></span>
                    <span>STREAK: <strong class="text-amber-400">x${this.state.reconStreak}</strong></span>
                    <span>TIME: <strong id="recon-timer-readout" class="text-white">${Math.ceil(this.state.reconTimeRemaining)}s</strong></span>
                  </div>
                </div>
                <div class="text-xs text-zinc-100 font-mono-tabular">${this.state.reconTargetClue}</div>
                <div class="mt-2 flex items-center gap-2">
                  <button id="btn-skip-recon-target" class="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] font-mono-tabular cursor-pointer">Next Target</button>
                  <button id="btn-end-recon" class="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/30 rounded text-[11px] font-mono-tabular cursor-pointer">Finish Mission</button>
                </div>
              </div>
            `
                : '<div></div>'
            }

            <!-- Top-Right Focused / Hovered Tower Telemetry Card -->
            ${
              focusedTower
                ? this.renderFocusedTowerHudCard(
                    focusedTower.data,
                    focusedTower.sectorRank,
                  )
                : `
              <div class="pointer-events-auto bg-[#09090B]/90 border border-white/12 rounded px-3.5 py-2 font-mono-tabular text-[11px] text-zinc-400">
                Hover or click any 3D Voxel Tower to lock laser telemetry
              </div>
            `
            }
          </div>

          <!-- Bottom-Center Quick Camera & Metric Bar -->
          <div class="flex items-center justify-center">
            <div class="pointer-events-auto bg-[#09090B]/95 border border-white/15 rounded px-3 py-1.5 flex flex-wrap items-center gap-2 font-mono-tabular text-[11px] shadow-xl">
              <span class="text-zinc-400">VIEW:</span>
              <button data-cam-preset="isometric" class="px-2 py-1 rounded cursor-pointer ${this.state.cameraPresetMode === 'isometric' ? 'bg-cyan-400 text-zinc-950 font-semibold' : 'text-zinc-300 hover:bg-zinc-800'}">Isometric</button>
              <button data-cam-preset="nightVault" class="px-2 py-1 rounded cursor-pointer ${this.state.cameraPresetMode === 'nightVault' ? 'bg-cyan-400 text-zinc-950 font-semibold' : 'text-zinc-300 hover:bg-zinc-800'}">Night Vault (X&gt;+3.22m)</button>
              <button data-cam-preset="topDown" class="px-2 py-1 rounded cursor-pointer ${this.state.cameraPresetMode === 'topDown' ? 'bg-cyan-400 text-zinc-950 font-semibold' : 'text-zinc-300 hover:bg-zinc-800'}">Top-Down CAD</button>
              <button data-cam-preset="streetDrone" class="px-2 py-1 rounded cursor-pointer ${this.state.cameraPresetMode === 'streetDrone' ? 'bg-cyan-400 text-zinc-950 font-semibold' : 'text-zinc-300 hover:bg-zinc-800'}">Drone View</button>
              <button data-cam-preset="duel" class="px-2 py-1 rounded cursor-pointer ${this.state.cameraPresetMode === 'duel' ? 'bg-cyan-400 text-zinc-950 font-semibold' : 'text-zinc-300 hover:bg-zinc-800'}">Duel (${this.state.duelCompanyA} vs ${this.state.duelCompanyB})</button>
              ${
                this.state.lockedCompanyId
                  ? `<button id="btn-unlock-camera" class="ml-2 px-2.5 py-1 bg-red-500/20 border border-red-500/40 text-red-300 rounded cursor-pointer">Unlock Tower [Esc]</button>`
                  : ''
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderTabButton(
    tabId: MetropolisAppState['activeTab'],
    label: string,
  ): string {
    const active = this.state.activeTab === tabId;
    return `
      <button
        data-tab-target="${tabId}"
        class="py-2.5 text-center border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
          active
            ? 'border-cyan-400 text-cyan-400 font-semibold bg-white/[0.03]'
            : 'border-transparent text-zinc-400 hover:text-zinc-200'
        }"
      >
        ${label}
      </button>
    `;
  }

  private renderTab1Metrics(): string {
    return `
      <!-- Primary Metric Switcher -->
      <div>
        <div class="text-xs font-semibold text-zinc-100 mb-2">01. Primary Z-Axis Metric</div>
        <div class="space-y-1.5">
          ${this.renderMetricOption('profitQ3_2026', 'LNTT Q3/2026 (Tỷ đồng)', 'Pre-tax profit in Q3 2026')}
          ${this.renderMetricOption('profit9M_2026', 'LNTT 9T/2026 (Tỷ đồng)', 'Cumulative 9-month 2026 profit')}
          ${this.renderMetricOption('growthYoY', 'Tăng trưởng YoY (%)', 'Year-over-year percentage growth')}
        </div>
      </div>

      <!-- Normalization Scale Toggle -->
      <div class="pt-3 border-t border-white/10">
        <div class="text-xs font-semibold text-zinc-100 mb-2">02. Height Normalization Scale</div>
        <div class="grid grid-cols-2 gap-2">
          <button
            data-scale-mode="logarithmic"
            class="p-2.5 rounded border text-left cursor-pointer ${
              this.state.scaleMode === 'logarithmic'
                ? 'border-cyan-400 bg-cyan-950/30 text-white'
                : 'border-white/10 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'
            }"
          >
            <div class="font-mono-tabular font-semibold text-xs">Logarithmic</div>
            <div class="text-[11px] text-zinc-400 mt-0.5">Recommended for wide profit gaps</div>
          </button>
          <button
            data-scale-mode="linear"
            class="p-2.5 rounded border text-left cursor-pointer ${
              this.state.scaleMode === 'linear'
                ? 'border-cyan-400 bg-cyan-950/30 text-white'
                : 'border-white/10 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'
            }"
          >
            <div class="font-mono-tabular font-semibold text-xs">Linear Absolute</div>
            <div class="text-[11px] text-zinc-400 mt-0.5">Raw proportional height</div>
          </button>
        </div>
      </div>

      <!-- Google Sheets Live Integration -->
      <div class="pt-3 border-t border-white/10 space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="text-xs font-semibold text-zinc-100">03. Google Sheets Live Connector</div>
          ${
            !this.needsGoogleAuth && this.googleUserEmail
              ? `<button id="btn-google-logout" class="text-[11px] text-zinc-400 hover:text-red-400 underline cursor-pointer">Sign out</button>`
              : ''
          }
        </div>

        ${
          this.needsGoogleAuth
            ? `
          <p class="text-[11px] text-zinc-400 leading-relaxed">
            Sign in with Google to import corporate financial spreadsheets directly into the 3D Voxel Metropolis.
          </p>
          <button id="btn-google-signin" class="gsi-material-button">
            <div class="gsi-material-button-state"></div>
            <div class="gsi-material-button-content-wrapper">
              <div class="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style="display: block;">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span class="gsi-material-button-contents">Sign in with Google</span>
            </div>
          </button>
        `
            : `
          <div class="text-[11px] font-mono-tabular text-emerald-400">
            Connected: ${this.escapeHtml(this.googleUserEmail || 'Google Account')}
          </div>
          <div class="space-y-2">
            <input
              id="input-sheet-url"
              type="text"
              placeholder="Paste Google Sheet URL or Spreadsheet ID..."
              value="${this.escapeHtml(this.sheetInputUrl)}"
              class="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded text-xs text-white font-mono-tabular focus:outline-none focus:border-cyan-400"
            />
            <div class="flex items-center gap-2">
              <button
                id="btn-discover-sheet-tabs"
                ${this.isSheetLoading ? 'disabled' : ''}
                class="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/15 rounded font-mono-tabular text-[11px] cursor-pointer whitespace-nowrap"
              >
                ${this.isSheetLoading ? 'Loading...' : '1. Inspect Tabs'}
              </button>
              <button
                id="btn-import-google-sheet"
                ${this.isSheetLoading ? 'disabled' : ''}
                class="flex-1 py-2 px-3 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-semibold rounded font-mono-tabular text-[11px] cursor-pointer whitespace-nowrap"
              >
                2. Sync Sheet Data
              </button>
            </div>
            ${
              this.discoveredTabs.length > 0
                ? `
              <div>
                <label class="block text-[11px] text-zinc-400 mb-1">Select Discovered Sheet Tab:</label>
                <select id="select-sheet-tab" class="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/15 rounded text-xs text-white font-mono-tabular">
                  ${this.discoveredTabs
                    .map(
                      (tab) =>
                        `<option value="${this.escapeHtml(tab)}" ${tab === this.selectedSheetTab ? 'selected' : ''}>${this.escapeHtml(tab)}</option>`,
                    )
                    .join('')}
                </select>
              </div>
            `
                : ''
            }
          </div>
        `
        }

        ${
          this.sheetStatusMessage
            ? `<div class="p-2 rounded border text-[11px] font-mono-tabular ${
                this.sheetStatusIsError
                  ? 'border-red-500/40 bg-red-950/30 text-red-300'
                  : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
              }">${this.escapeHtml(this.sheetStatusMessage)}</div>`
            : ''
        }
      </div>

      <!-- In-Memory File Importer (CSV / JSON with Zod Validation) -->
      <div class="pt-3 border-t border-white/10 space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-xs font-semibold text-zinc-100">04. Local JSON / CSV Importer (Zod)</div>
          <button id="btn-reset-dataset" class="text-[11px] text-cyan-400 hover:underline cursor-pointer">Reset 50 Default</button>
        </div>
        <label
          for="file-upload-input"
          class="block p-3 border border-dashed border-white/20 hover:border-cyan-400 rounded bg-zinc-900/50 text-center cursor-pointer transition-colors"
        >
          <div class="font-mono-tabular text-xs text-zinc-200">Drop or Click to Upload .JSON / .CSV</div>
          <div class="text-[11px] text-zinc-400 mt-0.5">Validated via FinancialCompanyDataSchema</div>
          <input id="file-upload-input" type="file" accept=".json,.csv" class="hidden" />
        </label>
        ${
          this.importStatusMessage
            ? `<div class="text-[11px] font-mono-tabular text-cyan-300">${this.escapeHtml(this.importStatusMessage)}</div>`
            : ''
        }
      </div>
    `;
  }

  private renderMetricOption(
    mode: MetricMode,
    title: string,
    subtitle: string,
  ): string {
    const active = this.state.metricMode === mode;
    return `
      <button
        data-metric-mode="${mode}"
        class="w-full p-2.5 rounded border text-left flex items-center justify-between cursor-pointer transition-colors ${
          active
            ? 'border-cyan-400 bg-cyan-950/30 text-white'
            : 'border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/25'
        }"
      >
        <div>
          <div class="font-mono-tabular font-semibold text-xs">${title}</div>
          <div class="text-[11px] text-zinc-400">${subtitle}</div>
        </div>
        <span class="font-mono-tabular text-xs ${active ? 'text-cyan-400 font-bold' : 'text-zinc-500'}">${active ? 'ACTIVE' : 'SELECT'}</span>
      </button>
    `;
  }

  private renderTab2Styling(): string {
    return `
      <!-- Theme Palette Swatches -->
      <div>
        <div class="text-xs font-semibold text-zinc-100 mb-2">01. Architectural Theme Preset</div>
        <div class="space-y-1.5">
          ${(Object.keys(THEME_PALETTES) as ThemePreset[])
            .map((key) => {
              const p = THEME_PALETTES[key];
              const active = this.state.themePreset === key;
              return `
                <button
                  data-theme-preset="${key}"
                  class="w-full p-2.5 rounded border flex items-center justify-between cursor-pointer ${
                    active
                      ? 'border-cyan-400 bg-cyan-950/30 text-white'
                      : 'border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/25'
                  }"
                >
                  <span class="font-medium text-xs">${p.name}</span>
                  <div class="flex items-center gap-1.5">
                    <span class="w-3.5 h-3.5 rounded-sm border border-white/20" style="background:#${p.hyperGrowthHex.toString(16).padStart(6, '0')}"></span>
                    <span class="w-3.5 h-3.5 rounded-sm border border-white/20" style="background:#${p.positiveGrowthHex.toString(16).padStart(6, '0')}"></span>
                    <span class="w-3.5 h-3.5 rounded-sm border border-white/20" style="background:#${p.lossHex.toString(16).padStart(6, '0')}"></span>
                  </div>
                </button>
              `;
            })
            .join('')}
        </div>
      </div>

      <!-- Color Coding Mode -->
      <div class="pt-3 border-t border-white/10">
        <div class="text-xs font-semibold text-zinc-100 mb-2">02. Tower Color Mapping Mode</div>
        <div class="space-y-1.5">
          ${this.renderColorModeButton('growth', 'By YoY Growth % (Performance View)', 'Cyan (>100%) · Emerald (0-100%) · Red (<0%)')}
          ${this.renderColorModeButton('sector', 'By Industry Sector (District View)', 'Distinct color signature per spatial sector')}
          ${this.renderColorModeButton('magnitude', 'By Profit Magnitude (Scale View)', 'Tiered shading by absolute billion VND')}
        </div>
      </div>

      <!-- 3D Tower Mesh Shader Style -->
      <div class="pt-3 border-t border-white/10">
        <div class="text-xs font-semibold text-zinc-100 mb-2">03. 3D Voxel Mesh Shader Style</div>
        <div class="space-y-1.5">
          ${this.renderShaderStyleButton('monolith', 'Solid Brutalist Monolith (With 1px Edges)', 'High-precision PBR bevel shaft + CAD wireframe')}
          ${this.renderShaderStyleButton('wireframe', 'Tactical Wireframe CAD Grid', 'Structural lattice inspection mode')}
          ${this.renderShaderStyleButton('glassCore', 'Glowing Glassmorphic Optical Core', 'Translucent refractive crystal monoliths')}
        </div>
      </div>
    `;
  }

  private renderColorModeButton(
    mode: ColorCodingMode,
    title: string,
    desc: string,
  ): string {
    const active = this.state.colorCodingMode === mode;
    return `
      <button
        data-color-mode="${mode}"
        class="w-full p-2.5 rounded border text-left cursor-pointer ${
          active
            ? 'border-cyan-400 bg-cyan-950/30 text-white'
            : 'border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/25'
        }"
      >
        <div class="font-semibold text-xs">${title}</div>
        <div class="text-[11px] text-zinc-400 mt-0.5">${desc}</div>
      </button>
    `;
  }

  private renderShaderStyleButton(
    style: ShaderStyleMode,
    title: string,
    desc: string,
  ): string {
    const active = this.state.shaderStyleMode === style;
    return `
      <button
        data-shader-style="${style}"
        class="w-full p-2.5 rounded border text-left cursor-pointer ${
          active
            ? 'border-cyan-400 bg-cyan-950/30 text-white'
            : 'border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/25'
        }"
      >
        <div class="font-semibold text-xs">${title}</div>
        <div class="text-[11px] text-zinc-400 mt-0.5">${desc}</div>
      </button>
    `;
  }

  private renderTab3Filtering(): string {
    const visibleList = this.sceneScript.towerRuntime.filter((t) => t.visible);

    return `
      <!-- Instant Search Bar -->
      <div>
        <div class="text-xs font-semibold text-zinc-100 mb-1.5">01. Instant Ticker / Company Search</div>
        <div class="flex items-center gap-1.5">
          <input
            id="input-company-search"
            type="text"
            placeholder="Search VCB, CTG, BSR, PNJ, NVL..."
            value="${this.escapeHtml(this.state.searchQuery)}"
            class="flex-1 px-3 py-2 bg-zinc-900 border border-white/15 rounded text-xs text-white font-mono-tabular focus:outline-none focus:border-cyan-400"
          />
          ${
            this.state.searchQuery
              ? `<button id="btn-clear-search" class="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs cursor-pointer">Clear</button>`
              : ''
          }
        </div>
      </div>

      <!-- Industry Multi-Select Checklist -->
      <div class="pt-3 border-t border-white/10">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-zinc-100">02. Sector Districts</span>
          <div class="flex items-center gap-2 text-[11px]">
            <button id="btn-sectors-all" class="text-cyan-400 hover:underline cursor-pointer">All</button>
            <span class="text-zinc-600">/</span>
            <button id="btn-sectors-none" class="text-zinc-400 hover:underline cursor-pointer">None</button>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-1.5">
          ${(Object.keys(SECTOR_DISTRICTS) as SectorType[])
            .map((sectorKey) => {
              const cfg = SECTOR_DISTRICTS[sectorKey];
              const checked = this.state.selectedSectors.has(sectorKey);
              const count = this.sceneScript.records.filter(
                (r) => r.sector === sectorKey,
              ).length;
              return `
                <label class="flex items-center justify-between p-2 rounded border border-white/10 bg-zinc-900/50 hover:bg-zinc-900 cursor-pointer">
                  <div class="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      data-sector-checkbox="${sectorKey}"
                      ${checked ? 'checked' : ''}
                      class="accent-cyan-400 cursor-pointer"
                    />
                    <span class="w-2.5 h-2.5 rounded-xs" style="background:${cfg.cssColor}"></span>
                    <span class="text-xs text-zinc-200">${cfg.label}</span>
                  </div>
                  <span class="font-mono-tabular text-[11px] text-zinc-400">${count}</span>
                </label>
              `;
            })
            .join('')}
        </div>
      </div>

      <!-- Profit Threshold Presets -->
      <div class="pt-3 border-t border-white/10">
        <div class="text-xs font-semibold text-zinc-100 mb-2">03. Profit &amp; Growth Thresholds</div>
        <div class="grid grid-cols-2 gap-1.5 font-mono-tabular text-[11px]">
          ${this.renderProfitPresetBtn('all', 'All Entities')}
          ${this.renderProfitPresetBtn('over1000', '> 1,000B Profit')}
          ${this.renderProfitPresetBtn('over5000', '> 5,000B Titans')}
          ${this.renderProfitPresetBtn('hyperGrowth', 'YoY > +100%')}
          ${this.renderProfitPresetBtn('lossOnly', 'Sub-Basin Loss')}
        </div>
      </div>

      <!-- Live Interactive Ranked Directory (Click to Lock Camera) -->
      <div class="pt-3 border-t border-white/10">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-zinc-100">04. Filtered Directory (${visibleList.length})</span>
          <span class="text-[11px] text-zinc-400">Click row to lock 3D laser</span>
        </div>
        <div class="max-h-52 overflow-y-auto border border-white/10 rounded divide-y divide-white/8 bg-zinc-950/70">
          ${visibleList
            .map((tr) => {
              const c = tr.data;
              const isLocked = this.state.lockedCompanyId === c.id;
              const val = this.sceneScript.getMetricValue(c);
              const growth = this.sceneScript.getGrowthValue(c);
              return `
                <button
                  data-focus-company="${c.id}"
                  class="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-white/5 cursor-pointer ${
                    isLocked ? 'bg-cyan-950/40 text-cyan-300' : 'text-zinc-200'
                  }"
                >
                  <div>
                    <span class="font-mono-tabular font-bold text-xs">${c.ticker}</span>
                    <span class="text-[11px] text-zinc-400 ml-1.5">${this.escapeHtml(c.companyName)}</span>
                  </div>
                  <div class="font-mono-tabular text-right text-[11px]">
                    <div class="${val < 0 ? 'text-red-400' : 'text-zinc-100'}">${val.toLocaleString()}${this.state.metricMode === 'growthYoY' ? '%' : 'B'}</div>
                    <div class="${growth >= 0 ? 'text-emerald-400' : 'text-red-400'}">${growth > 0 ? '+' : ''}${growth}% YoY</div>
                  </div>
                </button>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  private renderProfitPresetBtn(
    preset: ProfitFilterPreset,
    label: string,
  ): string {
    const active = this.state.profitFilterPreset === preset;
    return `
      <button
        data-profit-preset="${preset}"
        class="py-2 px-2.5 rounded border text-left cursor-pointer ${
          active
            ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300 font-semibold'
            : 'border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/25'
        }"
      >
        ${label}
      </button>
    `;
  }

  private renderTab4Camera(): string {
    const compA =
      this.sceneScript.records.find(
        (r) => r.ticker === this.state.duelCompanyA,
      ) || this.sceneScript.records[0];
    const compB =
      this.sceneScript.records.find(
        (r) => r.ticker === this.state.duelCompanyB,
      ) || this.sceneScript.records[1];

    const deltaQ3 = compA.profitQ3_2026 - compB.profitQ3_2026;
    const delta9M = compA.profit9M_2026 - compB.profit9M_2026;

    return `
      <!-- Camera View Presets -->
      <div>
        <div class="text-xs font-semibold text-zinc-100 mb-2">01. Camera Choreography Presets</div>
        <div class="space-y-1.5">
          ${this.renderCamPresetCard('isometric', '45° Isometric Overview', 'Balanced architectural view across all 7 districts')}
          ${this.renderCamPresetCard('nightVault', 'Exterior Night Sky Vault (X > +3.22m)', 'East Transition Bulkhead, 900 GLSL stars & skyward telemetry laser')}
          ${this.renderCamPresetCard('topDown', 'Top-Down Tactical Map (CAD View)', 'Orthographic-style Swiss grid alignment plan')}
          ${this.renderCamPresetCard('streetDrone', 'Street-Level Drone Flythrough', 'Low-altitude canyon perspective (WASD / Arrows)')}
          ${this.renderCamPresetCard('duel', 'Head-to-Head Duel Caliper Framing', 'Dual-focus laser measurement between two companies')}
        </div>
      </div>

      <!-- Head-to-Head Duel Mode -->
      <div class="pt-3 border-t border-white/10 space-y-2.5">
        <div class="text-xs font-semibold text-zinc-100">02. Head-to-Head Duel Calipers</div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[11px] text-zinc-400 mb-1">Company A</label>
            <select id="select-duel-a" class="w-full px-2.5 py-2 bg-zinc-900 border border-white/15 rounded text-xs text-white font-mono-tabular">
              ${this.sceneScript.records
                .map(
                  (r) =>
                    `<option value="${r.ticker}" ${r.ticker === this.state.duelCompanyA ? 'selected' : ''}>${r.ticker} — ${this.escapeHtml(r.companyName)}</option>`,
                )
                .join('')}
            </select>
          </div>
          <div>
            <label class="block text-[11px] text-zinc-400 mb-1">Company B</label>
            <select id="select-duel-b" class="w-full px-2.5 py-2 bg-zinc-900 border border-white/15 rounded text-xs text-white font-mono-tabular">
              ${this.sceneScript.records
                .map(
                  (r) =>
                    `<option value="${r.ticker}" ${r.ticker === this.state.duelCompanyB ? 'selected' : ''}>${r.ticker} — ${this.escapeHtml(r.companyName)}</option>`,
                )
                .join('')}
            </select>
          </div>
        </div>

        <!-- Duel Comparison Readout Table -->
        <div class="p-3 rounded border border-cyan-500/30 bg-zinc-950/90 font-mono-tabular text-[11px] space-y-1.5">
          <div class="flex justify-between text-zinc-400 border-b border-white/10 pb-1">
            <span>METRIC</span>
            <span class="text-cyan-400 font-bold">${compA.ticker}</span>
            <span class="text-indigo-400 font-bold">${compB.ticker}</span>
            <span>DELTA</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-400">Q3/26</span>
            <span>${compA.profitQ3_2026.toLocaleString()}B</span>
            <span>${compB.profitQ3_2026.toLocaleString()}B</span>
            <span class="${deltaQ3 >= 0 ? 'text-emerald-400' : 'text-red-400'}">${deltaQ3 > 0 ? '+' : ''}${deltaQ3.toLocaleString()}B</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-400">9M/26</span>
            <span>${compA.profit9M_2026.toLocaleString()}B</span>
            <span>${compB.profit9M_2026.toLocaleString()}B</span>
            <span class="${delta9M >= 0 ? 'text-emerald-400' : 'text-red-400'}">${delta9M > 0 ? '+' : ''}${delta9M.toLocaleString()}B</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-400">Q3 YoY</span>
            <span>${compA.growthQ3_YoY ?? 0}%</span>
            <span>${compB.growthQ3_YoY ?? 0}%</span>
            <span class="text-cyan-300">${(compA.growthQ3_YoY ?? 0) - (compB.growthQ3_YoY ?? 0)}%</span>
          </div>
        </div>
      </div>

      <!-- Tactical Anomaly Recon Challenge (Game Mode) -->
      <div class="pt-3 border-t border-white/10 space-y-2">
        <div class="text-xs font-semibold text-zinc-100">03. Tactical Anomaly Recon Challenge</div>
        <p class="text-[11px] text-zinc-400 leading-relaxed">
          Test your spatial data mastery: locate target corporate towers across the 7 sectors before the 60-second clock expires.
        </p>
        <button
          id="btn-launch-recon-game"
          class="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-mono-tabular font-semibold text-xs rounded cursor-pointer"
        >
          ${this.state.shellMode === 'reconGame' ? 'Restart Recon Mission (60s)' : 'Start Recon Challenge (60s)'}
        </button>
      </div>
    `;
  }

  private renderCamPresetCard(
    preset: CameraPresetMode,
    title: string,
    desc: string,
  ): string {
    const active = this.state.cameraPresetMode === preset;
    return `
      <button
        data-cam-preset="${preset}"
        class="w-full p-2.5 rounded border text-left cursor-pointer ${
          active
            ? 'border-cyan-400 bg-cyan-950/30 text-white'
            : 'border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/25'
        }"
      >
        <div class="font-semibold text-xs">${title}</div>
        <div class="text-[11px] text-zinc-400 mt-0.5">${desc}</div>
      </button>
    `;
  }

  private renderTab5Telemetry(
    totalQ3: number,
    total9M: number,
    hyperCount: number,
    lossCount: number,
  ): string {
    return `
      <!-- Live System SLA -->
      <div>
        <div class="text-xs font-semibold text-zinc-100 mb-2">01. Live System &amp; Matrix Telemetry</div>
        <div class="grid grid-cols-2 gap-2 font-mono-tabular">
          <div class="p-2.5 rounded border border-white/10 bg-zinc-900/70">
            <div class="text-[10px] text-zinc-400">FRAME PACING</div>
            <div id="sla-fps-readout" class="text-sm font-bold text-emerald-400 mt-0.5">${this.state.fps.toFixed(1)} FPS</div>
          </div>
          <div class="p-2.5 rounded border border-white/10 bg-zinc-900/70">
            <div class="text-[10px] text-zinc-400">ACTIVE VOXELS</div>
            <div id="sla-voxel-readout" class="text-sm font-bold text-cyan-400 mt-0.5">${this.state.renderedVoxelCount} / ${this.sceneScript.records.length}</div>
          </div>
          <div class="p-2.5 rounded border border-white/10 bg-zinc-900/70">
            <div class="text-[10px] text-zinc-400">Q3/2026 PROFIT SUM</div>
            <div class="text-sm font-bold text-white mt-0.5">${totalQ3.toLocaleString()} Tỷ</div>
          </div>
          <div class="p-2.5 rounded border border-white/10 bg-zinc-900/70">
            <div class="text-[10px] text-zinc-400">9M/2026 PROFIT SUM</div>
            <div class="text-sm font-bold text-white mt-0.5">${total9M.toLocaleString()} Tỷ</div>
          </div>
          <div class="p-2.5 rounded border border-white/10 bg-zinc-900/70">
            <div class="text-[10px] text-zinc-400">HYPER-GROWTH (&gt;100%)</div>
            <div class="text-sm font-bold text-cyan-400 mt-0.5">${hyperCount} Entities</div>
          </div>
          <div class="p-2.5 rounded border border-white/10 bg-zinc-900/70">
            <div class="text-[10px] text-zinc-400">SUB-BASIN LOSSES</div>
            <div class="text-sm font-bold text-red-400 mt-0.5">${lossCount} Entities</div>
          </div>
        </div>
      </div>

      <!-- Export Actions -->
      <div class="pt-3 border-t border-white/10 space-y-2">
        <div class="text-xs font-semibold text-zinc-100">02. Tactical Data &amp; Viewport Export</div>
        <button
          id="btn-export-png"
          class="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-cyan-500/40 rounded font-mono-tabular text-xs font-semibold text-left flex items-center justify-between cursor-pointer"
        >
          <span>Export 3D Viewport Snapshot</span>
          <span class="text-zinc-400">.PNG</span>
        </button>
        <button
          id="btn-export-json"
          class="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-white/15 rounded font-mono-tabular text-xs font-semibold text-left flex items-center justify-between cursor-pointer"
        >
          <span>Export Validated Financial AST</span>
          <span class="text-zinc-400">.JSON</span>
        </button>
        <button
          id="btn-export-csv"
          class="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-white/15 rounded font-mono-tabular text-xs font-semibold text-left flex items-center justify-between cursor-pointer"
        >
          <span>Export Executive Summary Report</span>
          <span class="text-zinc-400">.CSV</span>
        </button>
      </div>
    `;
  }

  private renderFocusedTowerHudCard(
    c: FinancialCompanyData,
    sectorRank: number,
  ): string {
    const sectorCfg = SECTOR_DISTRICTS[c.sector];
    const q3Growth = c.growthQ3_YoY;
    const m9Growth = c.growth9M_YoY;

    return `
      <div class="pointer-events-auto bg-[#09090B]/95 border border-cyan-400/50 rounded p-4 w-80 shadow-2xl font-mono-tabular">
        <div class="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
          <div>
            <div class="text-base font-bold text-cyan-400">${c.ticker}</div>
            <div class="text-xs text-zinc-200 font-sans font-medium">${this.escapeHtml(c.companyName)}</div>
          </div>
          <span class="text-[11px] text-zinc-300">#${sectorRank} in ${sectorCfg.sector}</span>
        </div>

        <div class="mt-2.5 space-y-1.5 text-xs">
          <div class="flex justify-between">
            <span class="text-zinc-400">Sector:</span>
            <span style="color:${sectorCfg.cssColor}">${sectorCfg.label} (${this.escapeHtml(c.industryLabel || c.sector)})</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-400">LNTT Q3/2026:</span>
            <span class="font-bold ${c.profitQ3_2026 < 0 ? 'text-red-400' : 'text-white'}">${c.profitQ3_2026.toLocaleString()} Tỷ</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-400">Q3 YoY Growth:</span>
            <span class="font-bold ${(q3Growth ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}">${q3Growth !== null ? `${q3Growth > 0 ? '+' : ''}${q3Growth}%` : 'Turnaround'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-400">LNTT 9T/2026:</span>
            <span class="font-bold ${c.profit9M_2026 < 0 ? 'text-red-400' : 'text-white'}">${c.profit9M_2026.toLocaleString()} Tỷ</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-400">9T YoY Growth:</span>
            <span class="font-bold ${(m9Growth ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}">${m9Growth !== null ? `${m9Growth > 0 ? '+' : ''}${m9Growth}%` : 'Turnaround'}</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderReconSummaryModal(): string {
    return `
      <div class="fixed inset-0 pointer-events-auto z-40 bg-black/80 flex items-center justify-center p-4">
        <div class="bg-[#09090B] border border-cyan-400/60 rounded max-w-md w-full p-6 space-y-4 shadow-2xl">
          <div class="font-mono-tabular text-xs text-cyan-400 tracking-wider font-semibold">RECONNAISSANCE DEBRIEF</div>
          <h2 class="text-2xl font-bold text-white">Tactical Anomaly Scan Complete</h2>
          <div class="grid grid-cols-2 gap-3 font-mono-tabular">
            <div class="p-3 bg-zinc-900 border border-white/10 rounded">
              <div class="text-[11px] text-zinc-400">FINAL SCORE</div>
              <div class="text-xl font-bold text-emerald-400 mt-1">${this.state.reconScore}</div>
            </div>
            <div class="p-3 bg-zinc-900 border border-white/10 rounded">
              <div class="text-[11px] text-zinc-400">TOWERS VERIFIED</div>
              <div class="text-xl font-bold text-cyan-400 mt-1">${this.state.reconScannedCount}</div>
            </div>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button id="btn-replay-recon" class="flex-1 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-semibold text-xs rounded cursor-pointer">Play Again</button>
            <button id="btn-close-recon-summary" class="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded cursor-pointer">Return to Metropolis</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderReferenceReportModal(): string {
    return `
      <div class="fixed inset-0 pointer-events-auto z-50 bg-black/85 flex items-center justify-center p-4 md:p-8">
        <div class="bg-[#09090B] border border-white/20 rounded max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          <div class="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
            <div>
              <div class="font-mono-tabular text-xs text-cyan-400 font-semibold">SOURCE FINANCIAL REPORT REFERENCE</div>
              <div class="text-xs text-zinc-400">Lợi nhuận trước thuế (Tỷ đồng) — Q3/2026 &amp; 9T/2026 (50 Companies)</div>
            </div>
            <button id="btn-close-reference-modal" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-mono-tabular text-xs cursor-pointer">Close [Esc]</button>
          </div>
          <div class="p-4 overflow-y-auto flex-1 flex justify-center bg-zinc-950">
            <img
              src="/assets/aistudio/10-31-2026-9-06-09-am-1793412526843733535245_66b0c07e.png"
              alt="Lợi nhuận trước thuế Q3 và 9T 2026"
              referrerpolicy="no-referrer"
              class="max-w-full h-auto rounded border border-white/10"
            />
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Title screen buttons
    document
      .getElementById('btn-enter-metropolis')
      ?.addEventListener('click', () => {
        this.state.shellMode = 'exploring';
        this.sceneScript.applyCameraPreset('isometric');
        soundService.playMetricMorph();
        this.render();
      });

    document
      .getElementById('btn-start-recon-title')
      ?.addEventListener('click', () => {
        this.sceneScript.startReconGame();
      });

    document
      .getElementById('btn-open-report-title')
      ?.addEventListener('click', () => {
        this.state.showReferenceModal = true;
        this.render();
      });

    document
      .getElementById('btn-return-title')
      ?.addEventListener('click', () => {
        this.state.shellMode = 'title';
        this.render();
      });

    // Collapse / Expand Dock
    document
      .getElementById('btn-collapse-dock')
      ?.addEventListener('click', () => {
        this.state.dockCollapsed = true;
        this.render();
      });
    document
      .getElementById('btn-expand-dock')
      ?.addEventListener('click', () => {
        this.state.dockCollapsed = false;
        this.render();
      });

    // Reference Report Table Modal
    document
      .getElementById('btn-view-source-table')
      ?.addEventListener('click', () => {
        this.state.showReferenceModal = true;
        this.render();
      });
    document
      .getElementById('btn-view-source-collapsed')
      ?.addEventListener('click', () => {
        this.state.showReferenceModal = true;
        this.render();
      });
    document
      .getElementById('btn-close-reference-modal')
      ?.addEventListener('click', () => {
        this.state.showReferenceModal = false;
        this.render();
      });

    // Audio Mute Toggle
    document
      .getElementById('btn-toggle-mute')
      ?.addEventListener('click', () => {
        this.state.soundMuted = !this.state.soundMuted;
        soundService.muted = this.state.soundMuted;
        this.render();
      });

    // Tab Navigation
    this.rootEl.querySelectorAll('[data-tab-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute(
          'data-tab-target',
        ) as MetropolisAppState['activeTab'];
        if (target) {
          this.state.activeTab = target;
          soundService.playHoverTick();
          this.render();
        }
      });
    });

    // Metric Switcher
    this.rootEl.querySelectorAll('[data-metric-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-metric-mode') as MetricMode;
        if (mode) {
          this.state.metricMode = mode;
          soundService.playMetricMorph();
          this.sceneScript.rebuildMetropolisLayout(false);
          this.render();
        }
      });
    });

    // Scale Mode Toggle
    this.rootEl.querySelectorAll('[data-scale-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const scale = btn.getAttribute('data-scale-mode') as ScaleMode;
        if (scale) {
          this.state.scaleMode = scale;
          soundService.playMetricMorph();
          this.sceneScript.rebuildMetropolisLayout(false);
          this.render();
        }
      });
    });

    // Google Sign-In / Sign-Out / Sheet Import
    document
      .getElementById('btn-google-signin')
      ?.addEventListener('click', async () => {
        try {
          this.sheetStatusMessage = 'Signing in with Google...';
          this.sheetStatusIsError = false;
          this.render();
          const res = await googleSignIn();
          if (res) {
            this.googleUserEmail =
              res.user.email || res.user.displayName || 'Connected';
            this.needsGoogleAuth = false;
            this.sheetStatusMessage =
              'Authenticated with Google Sheets. Paste a Spreadsheet URL or ID below.';
            this.render();
          }
        } catch (err: unknown) {
          this.sheetStatusIsError = true;
          this.sheetStatusMessage =
            err instanceof Error ? err.message : 'Google Sign-In failed.';
          this.render();
        }
      });

    document
      .getElementById('btn-google-logout')
      ?.addEventListener('click', async () => {
        await logoutGoogle();
        this.googleUserEmail = null;
        this.needsGoogleAuth = true;
        this.sheetStatusMessage = '';
        this.render();
      });

    const sheetUrlInput = document.getElementById(
      'input-sheet-url',
    ) as HTMLInputElement | null;
    sheetUrlInput?.addEventListener('input', (e) => {
      this.sheetInputUrl = (e.target as HTMLInputElement).value;
    });

    const sheetTabSelect = document.getElementById(
      'select-sheet-tab',
    ) as HTMLSelectElement | null;
    sheetTabSelect?.addEventListener('change', (e) => {
      this.selectedSheetTab = (e.target as HTMLSelectElement).value;
    });

    document
      .getElementById('btn-discover-sheet-tabs')
      ?.addEventListener('click', async () => {
        if (!this.sheetInputUrl.trim()) {
          this.sheetStatusIsError = true;
          this.sheetStatusMessage =
            'Enter a Google Spreadsheet URL or ID first.';
          this.render();
          return;
        }
        try {
          this.isSheetLoading = true;
          this.sheetStatusIsError = false;
          this.sheetStatusMessage = 'Discovering spreadsheet tabs...';
          this.render();
          const meta = await fetchSpreadsheetMetadata(this.sheetInputUrl);
          this.discoveredTabs = meta.sheetNames;
          this.selectedSheetTab = meta.sheetNames[0] || '';
          this.sheetStatusMessage = `Found "${meta.spreadsheetTitle}" (${meta.sheetNames.length} tabs).`;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg === 'AUTH_REQUIRED') {
            this.needsGoogleAuth = true;
            this.sheetStatusMessage =
              'Session expired. Please sign in with Google again.';
          } else {
            this.sheetStatusMessage = msg;
          }
          this.sheetStatusIsError = true;
        } finally {
          this.isSheetLoading = false;
          this.render();
        }
      });

    document
      .getElementById('btn-import-google-sheet')
      ?.addEventListener('click', async () => {
        if (!this.sheetInputUrl.trim()) {
          this.sheetStatusIsError = true;
          this.sheetStatusMessage =
            'Enter a Google Spreadsheet URL or ID first.';
          this.render();
          return;
        }
        try {
          this.isSheetLoading = true;
          this.sheetStatusIsError = false;
          this.sheetStatusMessage = 'Reading and validating rows with Zod...';
          this.render();
          const result = await fetchFinancialDataFromSheet(
            this.sheetInputUrl,
            this.selectedSheetTab || undefined,
          );
          this.discoveredTabs = result.availableTabs;
          this.selectedSheetTab = result.activeTab;
          this.sceneScript.setDataset(result.records);
          this.sheetStatusMessage = `Imported ${result.records.length} companies from "${result.title}" (${result.activeTab}).`;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg === 'AUTH_REQUIRED') {
            this.needsGoogleAuth = true;
            this.sheetStatusMessage =
              'Please sign in with Google to read this spreadsheet.';
          } else {
            this.sheetStatusMessage = msg;
          }
          this.sheetStatusIsError = true;
        } finally {
          this.isSheetLoading = false;
          this.render();
        }
      });

    // Local JSON/CSV File Upload
    const fileInput = document.getElementById(
      'file-upload-input',
    ) as HTMLInputElement | null;
    fileInput?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        let rawRows: unknown[] = [];
        if (file.name.toLowerCase().endsWith('.json')) {
          const parsed = JSON.parse(text);
          rawRows = Array.isArray(parsed) ? parsed : parsed.data || [];
        } else {
          rawRows = this.parseCsvToObjects(text);
        }
        const { valid, errors } = sanitizeAndValidateFinancialDataset(rawRows);
        if (valid.length > 0) {
          this.sceneScript.setDataset(valid);
          this.importStatusMessage = `Loaded ${valid.length} valid companies (${errors.length} skipped).`;
        } else {
          this.importStatusMessage = `Validation failed: ${errors.slice(0, 2).join('; ')}`;
        }
      } catch (err: unknown) {
        this.importStatusMessage =
          err instanceof Error ? err.message : 'Failed to parse file.';
      }
      this.render();
    });

    document
      .getElementById('btn-reset-dataset')
      ?.addEventListener('click', () => {
        this.sceneScript.setDataset(INITIAL_FINANCIAL_DATA);
        this.importStatusMessage =
          'Restored default 50 corporate entities from Q3/9M 2026 report.';
        this.render();
      });

    // Theme, Color Mode & Shader Style
    this.rootEl.querySelectorAll('[data-theme-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-theme-preset') as ThemePreset;
        if (preset) {
          this.state.themePreset = preset;
          this.sceneScript.rebuildMetropolisLayout(false);
          this.render();
        }
      });
    });

    this.rootEl.querySelectorAll('[data-color-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-color-mode') as ColorCodingMode;
        if (mode) {
          this.state.colorCodingMode = mode;
          this.sceneScript.rebuildMetropolisLayout(false);
          this.render();
        }
      });
    });

    this.rootEl.querySelectorAll('[data-shader-style]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const style = btn.getAttribute('data-shader-style') as ShaderStyleMode;
        if (style) {
          this.state.shaderStyleMode = style;
          this.sceneScript.rebuildMetropolisLayout(false);
          this.render();
        }
      });
    });

    // Search & Filtering
    const searchInput = document.getElementById(
      'input-company-search',
    ) as HTMLInputElement | null;
    searchInput?.addEventListener('input', (e) => {
      this.state.searchQuery = (e.target as HTMLInputElement).value;
      this.sceneScript.rebuildMetropolisLayout(false);
      // If exact ticker match, auto-focus camera
      const exact = this.sceneScript.records.find(
        (r) =>
          r.ticker.toLowerCase() ===
          this.state.searchQuery.trim().toLowerCase(),
      );
      if (exact) {
        this.sceneScript.focusOnCompanyById(exact.id);
      } else {
        this.render();
      }
    });

    document
      .getElementById('btn-clear-search')
      ?.addEventListener('click', () => {
        this.state.searchQuery = '';
        this.sceneScript.focusOnCompanyById(null);
        this.sceneScript.rebuildMetropolisLayout(false);
        this.render();
      });

    this.rootEl.querySelectorAll('[data-sector-checkbox]').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const sector = chk.getAttribute('data-sector-checkbox') as SectorType;
        const isChecked = (e.target as HTMLInputElement).checked;
        if (isChecked) {
          this.state.selectedSectors.add(sector);
        } else {
          this.state.selectedSectors.delete(sector);
        }
        this.sceneScript.rebuildMetropolisLayout(false);
        this.render();
      });
    });

    document
      .getElementById('btn-sectors-all')
      ?.addEventListener('click', () => {
        (Object.keys(SECTOR_DISTRICTS) as SectorType[]).forEach((s) =>
          this.state.selectedSectors.add(s),
        );
        this.sceneScript.rebuildMetropolisLayout(false);
        this.render();
      });

    document
      .getElementById('btn-sectors-none')
      ?.addEventListener('click', () => {
        this.state.selectedSectors.clear();
        this.sceneScript.rebuildMetropolisLayout(false);
        this.render();
      });

    this.rootEl.querySelectorAll('[data-profit-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute(
          'data-profit-preset',
        ) as ProfitFilterPreset;
        if (preset) {
          this.state.profitFilterPreset = preset;
          this.sceneScript.rebuildMetropolisLayout(false);
          this.render();
        }
      });
    });

    this.rootEl.querySelectorAll('[data-focus-company]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-focus-company');
        if (id) {
          const next = this.state.lockedCompanyId === id ? null : id;
          this.sceneScript.focusOnCompanyById(next);
        }
      });
    });

    // Camera Presets & Duel Mode
    this.rootEl.querySelectorAll('[data-cam-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-cam-preset') as CameraPresetMode;
        if (preset) {
          this.sceneScript.applyCameraPreset(preset);
        }
      });
    });

    document
      .getElementById('btn-unlock-camera')
      ?.addEventListener('click', () => {
        this.sceneScript.focusOnCompanyById(null);
      });

    const duelSelectA = document.getElementById(
      'select-duel-a',
    ) as HTMLSelectElement | null;
    duelSelectA?.addEventListener('change', (e) => {
      this.state.duelCompanyA = (e.target as HTMLSelectElement).value;
      this.sceneScript.applyCameraPreset('duel');
    });

    const duelSelectB = document.getElementById(
      'select-duel-b',
    ) as HTMLSelectElement | null;
    duelSelectB?.addEventListener('change', (e) => {
      this.state.duelCompanyB = (e.target as HTMLSelectElement).value;
      this.sceneScript.applyCameraPreset('duel');
    });

    // Recon Game Actions
    document
      .getElementById('btn-launch-recon-game')
      ?.addEventListener('click', () => {
        this.sceneScript.startReconGame();
      });
    document
      .getElementById('btn-skip-recon-target')
      ?.addEventListener('click', () => {
        this.sceneScript.pickNextReconTarget();
        this.render();
      });
    document.getElementById('btn-end-recon')?.addEventListener('click', () => {
      this.state.shellMode = 'reconSummary';
      this.render();
    });
    document
      .getElementById('btn-replay-recon')
      ?.addEventListener('click', () => {
        this.sceneScript.startReconGame();
      });
    document
      .getElementById('btn-close-recon-summary')
      ?.addEventListener('click', () => {
        this.state.shellMode = 'exploring';
        this.render();
      });

    // Export Actions (.PNG, .JSON, .CSV)
    document.getElementById('btn-export-png')?.addEventListener('click', () => {
      this.exportSnapshotPng();
    });
    document
      .getElementById('btn-export-json')
      ?.addEventListener('click', () => {
        this.exportProcessedJson();
      });
    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      this.exportSummaryCsv();
    });
  }

  private parseCsvToObjects(csvText: string): Record<string, string>[] {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = cols[i] ?? '';
      });
      return obj;
    });
  }

  private exportSnapshotPng(): void {
    const renderer = xb.core?.renderer;
    const scene = xb.core?.scene;
    const camera = xb.core?.camera;
    if (!renderer || !scene || !camera || !renderer.domElement) return;

    // Render synchronously right before toDataURL so the buffer is populated
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `3d-data-metropolis-${Date.now()}.png`;
    a.click();
  }

  private exportProcessedJson(): void {
    const visible = this.sceneScript.towerRuntime
      .filter((t) => t.visible)
      .map((t) => ({
        ...t.data,
        sectorRank: t.sectorRank,
        voxelHeightMeters: Number(t.targetHeight.toFixed(3)),
      }));
    const blob = new Blob([JSON.stringify(visible, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'metropolis-financial-ast.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private exportSummaryCsv(): void {
    const headers = [
      'Ticker',
      'CompanyName',
      'Sector',
      'Industry',
      'Profit_Q3_2026_BillionVND',
      'Growth_Q3_YoY_Pct',
      'Profit_9M_2026_BillionVND',
      'Growth_9M_YoY_Pct',
      'SectorRank',
    ];
    const rows = this.sceneScript.towerRuntime
      .filter((t) => t.visible)
      .map((t) => {
        const d = t.data;
        return [
          d.ticker,
          `"${d.companyName.replace(/"/g, '""')}"`,
          d.sector,
          `"${(d.industryLabel || d.sector).replace(/"/g, '""')}"`,
          d.profitQ3_2026,
          d.growthQ3_YoY ?? '',
          d.profit9M_2026,
          d.growth9M_YoY ?? '',
          t.sectorRank,
        ].join(',');
      });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'metropolis-profit-summary-2026.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  public dispose(): void {
    if (this.telemetryTimer !== null) {
      clearInterval(this.telemetryTimer);
    }
  }
}
