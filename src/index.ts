import * as xb from 'xrblocks';
import { SECTOR_DISTRICTS } from './constants';
import { MetropolisScene } from './scene/MetropolisScene';
import { MetropolisAppState, SectorType } from './types';
import { StudioOverlay } from './ui/StudioOverlay';
import { HUDOverlay } from './ui/HUDOverlay';

document.addEventListener('DOMContentLoaded', async () => {
  const initialSectors = new Set<SectorType>(
    Object.keys(SECTOR_DISTRICTS) as SectorType[],
  );

  const appState: MetropolisAppState = {
    shellMode: 'exploring',
    activeTab: 'metrics',
    dockCollapsed: false,
    showReferenceModal: false,
    metricMode: 'profitQ3_2026',
    scaleMode: 'logarithmic',
    themePreset: 'obsidian',
    colorCodingMode: 'growth',
    shaderStyleMode: 'monolith',
    cameraPresetMode: 'isometric',
    searchQuery: '',
    selectedSectors: initialSectors,
    profitFilterPreset: 'all',
    minProfitFilter: -5000,
    maxProfitFilter: 60000,
    hoveredCompanyId: null,
    lockedCompanyId: 'vcb',
    duelCompanyA: 'CTG',
    duelCompanyB: 'VCB',
    soundMuted: false,
    reconScore: 0,
    reconTargetTicker: null,
    reconTargetClue: '',
    reconTimeRemaining: 60,
    reconScannedCount: 0,
    reconStreak: 0,
    fps: 60,
    renderedVoxelCount: 50,
  };

  let studioOverlay: StudioOverlay | null = null;
  const metropolisScene = new MetropolisScene(appState, () => {
    studioOverlay?.render();
  });

  studioOverlay = new StudioOverlay(metropolisScene, appState);

  // Mount Cybernetic Swiss Brutalism HUDOverlay to document.body
  const hudOverlay = new HUDOverlay(() => {
    appState.dockCollapsed = !appState.dockCollapsed;
    studioOverlay?.render();
  });
  document.body.appendChild(hudOverlay.container);

  window.setInterval(() => {
    const cam = (metropolisScene as any).camera || (xb as any).camera;
    const camPos = cam?.position || { x: 0, y: 15, z: 45 };
    hudOverlay.updateTelemetry(appState.fps, camPos);
  }, 250);

  const options = new xb.Options();
  options.setAppTitle('3D Data Metropolis — Tactical Voxel Matrix Engine');
  options.setAppDescription(
    'Cybernetic Brutalist 3D financial voxel matrix engine with XR Blocks and Google Sheets.',
  );
  options.reticles.enabled = true;

  xb.add(metropolisScene);
  await xb.init(options);
});
