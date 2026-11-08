import { BrutalistButton } from './BrutalistButton';

export class HUDOverlay {
  public container: HTMLDivElement;
  private bottomTelemetryBar!: HTMLDivElement;
  private isDockCollapsed: boolean = false;
  private onToggleDockCallback: () => void;

  constructor(onToggleDock: () => void) {
    this.onToggleDockCallback = onToggleDock;
    this.container = document.createElement('div');
    this.container.className = 'hud-overlay';
    this.setupStyles();
    this.build4Corners();
    this.setupHotkeyListener();
  }

  private setupStyles(): void {
    Object.assign(this.container.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '9999',
      fontFamily: "'Space Grotesk', 'JetBrains Mono', monospace",
      userSelect: 'none',
      overflow: 'hidden',
    });
  }

  private build4Corners(): void {
    // Corner A: Top Left
    const cornerA = document.createElement('div');
    cornerA.style.cssText =
      'position: absolute; top: 12px; left: 16px; font-size: 11px; font-weight: 600; color: #00E5FF; letter-spacing: 0.12em; text-shadow: 0 0 8px rgba(0,229,255,0.4);';
    cornerA.textContent = '[ A // 01 ]';
    this.container.appendChild(cornerA);

    // Corner B: Top Right
    const cornerB = document.createElement('div');
    cornerB.style.cssText =
      'position: absolute; top: 12px; right: 16px; font-size: 11px; font-weight: 600; color: #00E5FF; letter-spacing: 0.12em; text-shadow: 0 0 8px rgba(0,229,255,0.4);';
    cornerB.textContent = '[ B // 02 ]';
    this.container.appendChild(cornerB);

    // Corner C: Bottom Right
    const cornerC = document.createElement('div');
    cornerC.style.cssText =
      'position: absolute; bottom: 12px; right: 16px; font-size: 11px; font-weight: 600; color: #00E5FF; letter-spacing: 0.12em; text-shadow: 0 0 8px rgba(0,229,255,0.4);';
    cornerC.textContent = '[ C // 03 ]';
    this.container.appendChild(cornerC);

    // Corner D: Bottom Left
    const cornerD = document.createElement('div');
    cornerD.style.cssText =
      'position: absolute; bottom: 12px; left: 16px; font-size: 11px; font-weight: 600; color: #00E5FF; letter-spacing: 0.12em; text-shadow: 0 0 8px rgba(0,229,255,0.4);';
    cornerD.textContent = '[ D // 04 ]';
    this.container.appendChild(cornerD);

    // Center Bottom Telemetry Bar: [ ⏣ GPU_LOCK • 60 FPS // LOC: X+3.22m Y-1.04m ]
    this.bottomTelemetryBar = document.createElement('div');
    this.bottomTelemetryBar.style.cssText =
      'position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); font-size: 11px; font-family: "JetBrains Mono", monospace; color: #8A8FA3; letter-spacing: 0.1em; white-space: nowrap; pointer-events: none;';
    this.bottomTelemetryBar.textContent =
      '[ ⏣ GPU_LOCK • 60 FPS // LOC: X+3.22m Y-1.04m ]';
    this.container.appendChild(this.bottomTelemetryBar);
  }

  private setupHotkeyListener(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        const active = document.activeElement?.tagName;
        if (active !== 'INPUT' && active !== 'TEXTAREA') {
          this.toggleDock();
        }
      }
    });
  }

  public toggleDock(): void {
    this.isDockCollapsed = !this.isDockCollapsed;
    this.onToggleDockCallback();
  }

  public updateTelemetry(
    fps: number,
    camPos: { x: number; y: number; z: number },
  ): void {
    const formatCoord = (val: number) =>
      val >= 0 ? `+${val.toFixed(2)}m` : `${val.toFixed(2)}m`;
    if (this.bottomTelemetryBar) {
      this.bottomTelemetryBar.textContent = `[ ⏣ GPU_LOCK • ${Math.round(fps)} FPS // LOC: X${formatCoord(camPos.x)} Y${formatCoord(camPos.y)} ]`;
    }
  }
}
