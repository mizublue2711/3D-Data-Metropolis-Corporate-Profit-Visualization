import { BrutalistButton } from './BrutalistButton';

export class HUDOverlay {
  public container: HTMLDivElement;
  private fpsLabel!: HTMLSpanElement;
  private camPosLabel!: HTMLDivElement;
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
      zIndex: '40',
      fontFamily: 'monospace',
      userSelect: 'none',
      overflow: 'hidden',
    });
  }

  private build4Corners(): void {
    // Top Left: Corner A
    const topLeft = document.createElement('div');
    topLeft.style.cssText =
      'position: absolute; top: 12px; left: 16px; font-size: 10px; color: rgba(0,229,255,0.7); letter-spacing: 0.1em;';
    topLeft.textContent = '[ A // 01 • DATA_METROPOLIS_SUBSTRATE ]';
    this.container.appendChild(topLeft);

    // Top Right: Corner B + Telemetry
    const topRight = document.createElement('div');
    topRight.style.cssText =
      'position: absolute; top: 12px; right: 16px; font-size: 10px; color: rgba(0,229,255,0.7); letter-spacing: 0.1em; display: flex; gap: 12px; align-items: center;';

    this.fpsLabel = document.createElement('span');
    this.fpsLabel.textContent = '[ ⏣ GPU_LOCK • 60 FPS ]';
    topRight.appendChild(this.fpsLabel);

    const cornerB = document.createElement('span');
    cornerB.textContent = '[ B // 02 ]';
    topRight.appendChild(cornerB);
    this.container.appendChild(topRight);

    // Bottom Left: Corner D + Cam Pos
    this.camPosLabel = document.createElement('div');
    this.camPosLabel.style.cssText =
      'position: absolute; bottom: 12px; left: 16px; font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 0.1em;';
    this.camPosLabel.textContent = '[ D // 04 • CAM_POS: X:0 Y:15 Z:45 ]';
    this.container.appendChild(this.camPosLabel);

    // Bottom Right: Corner C + Hotkey Hint
    const bottomRight = document.createElement('div');
    bottomRight.style.cssText =
      'position: absolute; bottom: 12px; right: 16px; font-size: 10px; color: rgba(0,229,255,0.7); letter-spacing: 0.1em;';
    bottomRight.textContent = '[ C // 03 • PRESS "H" TO TOGGLE DOCK ]';
    this.container.appendChild(bottomRight);
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
    this.fpsLabel.textContent = `[ ⏣ GPU_LOCK • ${Math.round(fps)} FPS ]`;
    this.camPosLabel.textContent = `[ D // 04 • CAM_POS: X:${Math.round(camPos.x)} Y:${Math.round(camPos.y)} Z:${Math.round(camPos.z)} ]`;
  }
}
