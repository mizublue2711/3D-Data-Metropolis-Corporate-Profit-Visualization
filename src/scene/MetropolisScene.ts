import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as xb from 'xrblocks';
import {
  INITIAL_FINANCIAL_DATA,
  SECTOR_DISTRICTS,
  THEME_PALETTES,
} from '../constants';
import { soundService } from '../services/soundService';
import {
  CameraPresetMode,
  FinancialCompanyData,
  MetropolisAppState,
  SectorType,
} from '../types';
import { ArchitectureEnvironment } from './ArchitectureEnvironment';

// Pre-allocated module-scope scratch objects to ensure zero GC in the 60fps loop
const _dummy = new THREE.Object3D();
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _color = new THREE.Color();
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();

export interface TowerRuntimeRecord {
  data: FinancialCompanyData;
  index: number;
  worldX: number;
  worldZ: number;
  currentHeight: number;
  targetHeight: number;
  isNegative: boolean;
  visible: boolean;
  sectorRank: number;
  colorHex: number;
}

export class MetropolisScene extends xb.Script {
  public records: FinancialCompanyData[] = [...INITIAL_FINANCIAL_DATA];
  public towerRuntime: TowerRuntimeRecord[] = [];
  public state: MetropolisAppState;
  public onStateUpdated?: () => void;

  private archEnv?: ArchitectureEnvironment;
  private maxInstances = 160;

  // Multi-part Composite InstancedMeshes for Voxel Towers
  private shaftInstanced!: THREE.InstancedMesh;
  private plinthInstanced!: THREE.InstancedMesh;
  private crownInstanced!: THREE.InstancedMesh;
  private wireInstanced!: THREE.InstancedMesh;
  private basinInstanced!: THREE.InstancedMesh;

  // Materials for shader style switching
  private shaftMat!: THREE.MeshPhysicalMaterial;
  private plinthMat!: THREE.MeshStandardMaterial;
  private crownMat!: THREE.MeshStandardMaterial;
  private wireMat!: THREE.MeshBasicMaterial;
  private basinMat!: THREE.MeshStandardMaterial;

  // Hyper-growth particle aura
  private auraPoints!: THREE.Points;
  private auraGeo!: THREE.BufferGeometry;
  private auraMat!: THREE.PointsMaterial;

  // Selection laser beam & Head-to-Head Duel Calipers
  private lockLaserMesh!: THREE.Mesh;
  private duelGroup!: THREE.Group;
  private duelLine!: THREE.Line;
  private duelPillarA!: THREE.Mesh;
  private duelPillarB!: THREE.Mesh;

  // Built-in XR Blocks Spatial UI Card (xb.UICard) for 3D Hover/Selection Inspection
  private spatialCard!: xb.UICard;
  private cardTickerText!: xb.UIText;
  private cardSectorText!: xb.UIText;
  private cardMetricText!: xb.UIText;
  private cardGrowthText!: xb.UIText;
  private cardRankText!: xb.UIText;

  // Camera choreography & smooth damping state
  private cameraTargetPos = new THREE.Vector3(0, 4.8, 7.8);
  private cameraTargetLookAt = new THREE.Vector3(0, 0.8, -0.4);
  private currentLookAt = new THREE.Vector3(0, 0.8, -0.4);
  private cameraTransitionActive = true;
  private orbitYaw = 0;
  private orbitPitch = 0.48;
  private orbitDistance = 9.2;
  private isDraggingOrbit = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Continuous held keys for Drone Flythrough / Recon Game
  private heldKeys = new Set<string>();
  private elapsedTime = 0;
  private frameCounter = 0;
  private fpsAccumTime = 0;
  private lastPointerRaycastTime = 0;

  constructor(
    initialState: MetropolisAppState,
    onStateUpdated?: () => void,
  ) {
    super();
    this.state = initialState;
    this.onStateUpdated = onStateUpdated;
  }

  public init(): void {
    const renderer = xb.core?.renderer as THREE.WebGLRenderer | undefined;
    const scene = xb.core?.scene;

    if (renderer && scene && 'outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      if (renderer.shadowMap) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }

      // Studio PBR Environment Reflection via RoomEnvironment + PMREMGenerator
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(
        new RoomEnvironment(),
        0.04,
      ).texture;
      pmremGenerator.dispose();

      // Deep Midnight (#050508) atmosphere with Electro-Volumetric Fog (density 0.012)
      scene.background = new THREE.Color(0x050508);
      scene.fog = new THREE.FogExp2(0x050508, 0.012);
    }

    this.setupLightingRig();

    const maxAniso =
      renderer && 'capabilities' in renderer
        ? renderer.capabilities.getMaxAnisotropy()
        : 4;
    this.archEnv = new ArchitectureEnvironment(maxAniso);
    this.add(this.archEnv);

    this.createCompositeVoxelInstancedMeshes();
    this.createHyperGrowthParticleAura();
    this.createLockLaserAndDuelCalipers();
    this.createSpatialInspectionCard();
    this.setupDesktopInputListeners();

    this.rebuildMetropolisLayout(true);
    this.applyCameraPreset(this.state.cameraPresetMode);
  }

  private setupLightingRig(): void {
    // Cool sky/ground HemisphereLight fill
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x09090b, 1.35);
    hemiLight.position.set(0, 12, 0);
    this.add(hemiLight);

    // 6500K industrial overhead key light with tight shadow frustum
    const keyLight = new THREE.DirectionalLight(0xf8fafc, 2.6);
    keyLight.position.set(4.5, 11.5, 6.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    const d = 8.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 28;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.add(keyLight);

    // Dual Electric Indigo (#5322FF) rim lights
    const rimLightWest = new THREE.PointLight(0x5322ff, 8, 16, 1.6);
    rimLightWest.position.set(-6.5, 3.8, -3.5);
    this.add(rimLightWest);

    const rimLightEast = new THREE.PointLight(0x00e5ff, 7, 16, 1.6);
    rimLightEast.position.set(5.2, 3.6, 2.5);
    this.add(rimLightEast);
  }

  /**
   * Builds Composite Multi-Part Voxel Towers using InstancedMeshes:
   * 1. Beveled ExtrudeGeometry Monolith Shaft
   * 2. Grounded Base Plinth Collar
   * 3. Stepped Rooftop Crown
   * 4. 1px CAD Wireframe Cage
   * 5. Sub-Level Red Basement Basin Collar (for negative profit towers)
   */
  private createCompositeVoxelInstancedMeshes(): void {
    // Part 1: Beveled architectural shaft geometry (unit height 1.0, bottom-pivoted at y = 0)
    const size = 0.34;
    const bevel = 0.035;
    const shape = new THREE.Shape();
    shape.moveTo(-size / 2 + bevel, -size / 2);
    shape.lineTo(size / 2 - bevel, -size / 2);
    shape.lineTo(size / 2, -size / 2 + bevel);
    shape.lineTo(size / 2, size / 2 - bevel);
    shape.lineTo(size / 2 - bevel, size / 2);
    shape.lineTo(-size / 2 + bevel, size / 2);
    shape.lineTo(-size / 2, size / 2 - bevel);
    shape.lineTo(-size / 2, -size / 2 + bevel);
    shape.closePath();

    const shaftGeo = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: 1.0,
      bevelEnabled: false,
    });
    shaftGeo.rotateX(-Math.PI / 2);
    shaftGeo.computeVertexNormals();

    this.shaftMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.24,
      metalness: 0.62,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
    });

    this.shaftInstanced = new THREE.InstancedMesh(
      shaftGeo,
      this.shaftMat,
      this.maxInstances,
    );
    this.shaftInstanced.castShadow = true;
    this.shaftInstanced.receiveShadow = true;
    this.shaftInstanced.frustumCulled = false;

    // Part 2: Grounded Base Plinth Collar (contrasting roughness/metalness)
    const plinthGeo = new THREE.BoxGeometry(0.44, 0.06, 0.44);
    plinthGeo.translate(0, 0.03, 0);
    this.plinthMat = new THREE.MeshStandardMaterial({
      color: 0x18181e,
      roughness: 0.75,
      metalness: 0.3,
    });
    this.plinthInstanced = new THREE.InstancedMesh(
      plinthGeo,
      this.plinthMat,
      this.maxInstances,
    );
    this.plinthInstanced.receiveShadow = true;
    this.plinthInstanced.frustumCulled = false;
    this.plinthInstanced.xb = { pointerEvents: 'none' };

    // Part 3: Stepped Rooftop Crown + Spire
    const crownPoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.16, 0.0),
      new THREE.Vector2(0.14, 0.06),
      new THREE.Vector2(0.06, 0.08),
      new THREE.Vector2(0.015, 0.24),
      new THREE.Vector2(0.0, 0.24),
    ];
    const crownGeo = new THREE.LatheGeometry(crownPoints, 8);
    this.crownMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.88,
    });
    this.crownInstanced = new THREE.InstancedMesh(
      crownGeo,
      this.crownMat,
      this.maxInstances,
    );
    this.crownInstanced.frustumCulled = false;
    this.crownInstanced.xb = { pointerEvents: 'none' };

    // Part 4: 1px Wireframe CAD Cage
    const wireGeo = new THREE.BoxGeometry(0.365, 1.0, 0.365);
    wireGeo.translate(0, 0.5, 0);
    this.wireMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    this.wireInstanced = new THREE.InstancedMesh(
      wireGeo,
      this.wireMat,
      this.maxInstances,
    );
    this.wireInstanced.frustumCulled = false;
    this.wireInstanced.xb = { pointerEvents: 'none' };

    // Part 5: Sub-level Basement Basin Collar for negative profit companies
    const basinGeo = new THREE.RingGeometry(0.22, 0.3, 16);
    basinGeo.rotateX(-Math.PI / 2);
    this.basinMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.2,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    this.basinInstanced = new THREE.InstancedMesh(
      basinGeo,
      this.basinMat,
      this.maxInstances,
    );
    this.basinInstanced.frustumCulled = false;
    this.basinInstanced.xb = { pointerEvents: 'none' };

    this.add(
      this.shaftInstanced,
      this.plinthInstanced,
      this.crownInstanced,
      this.wireInstanced,
      this.basinInstanced,
    );
  }

  private createHyperGrowthParticleAura(): void {
    const count = 240;
    const positions = new Float32Array(count * 3);
    this.auraGeo = new THREE.BufferGeometry();
    this.auraGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    );
    this.auraMat = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.045,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.auraPoints = new THREE.Points(this.auraGeo, this.auraMat);
    this.auraPoints.frustumCulled = false;
    this.auraPoints.xb = { pointerEvents: 'none' };
    this.add(this.auraPoints);
  }

  private createLockLaserAndDuelCalipers(): void {
    // Vertical 1px Cyan laser telemetry beam on locked tower
    const laserGeo = new THREE.CylinderGeometry(0.012, 0.012, 12, 8);
    laserGeo.translate(0, 6, 0);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.lockLaserMesh = new THREE.Mesh(laserGeo, laserMat);
    this.lockLaserMesh.visible = false;
    this.lockLaserMesh.xb = { pointerEvents: 'none' };
    this.add(this.lockLaserMesh);

    // Head-to-Head Duel Caliper laser assembly
    this.duelGroup = new THREE.Group();
    this.duelGroup.visible = false;
    this.duelGroup.xb = { pointerEvents: 'none' };

    const duelLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const duelLineMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.95,
    });
    this.duelLine = new THREE.Line(duelLineGeo, duelLineMat);

    const markerGeo = new THREE.CylinderGeometry(0.015, 0.015, 6, 8);
    markerGeo.translate(0, 3, 0);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.duelPillarA = new THREE.Mesh(markerGeo, markerMat);
    this.duelPillarB = new THREE.Mesh(markerGeo, markerMat);

    this.duelGroup.add(this.duelLine, this.duelPillarA, this.duelPillarB);
    this.add(this.duelGroup);
  }

  /**
   * Builds the floating 3D Glassmorphic Card (xb.UICard) using XR Blocks built-in Spatial UI.
   */
  private createSpatialInspectionCard(): void {
    this.cardTickerText = new xb.UIText({
      text: 'VCB — Ngân hàng Vietcombank',
      pointerEvents: 'none',
      style: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#00E5FF',
      },
    });

    this.cardSectorText = new xb.UIText({
      text: 'Banking · Ngành Ngân hàng',
      pointerEvents: 'none',
      style: {
        fontSize: 15,
        color: '#A1A1AA',
      },
    });

    this.cardMetricText = new xb.UIText({
      text: 'LNTT Q3/2026: 11,218 Tỷ đồng',
      pointerEvents: 'none',
      style: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
      },
    });

    this.cardGrowthText = new xb.UIText({
      text: 'YoY Growth: +22% (9M: 40,440 Tỷ)',
      pointerEvents: 'none',
      style: {
        fontSize: 16,
        color: '#10B981',
      },
    });

    this.cardRankText = new xb.UIText({
      text: 'Rank #1 in Banking District',
      pointerEvents: 'none',
      style: {
        fontSize: 14,
        color: '#E4E4E7',
      },
    });

    this.spatialCard = new xb.UICard({
      size: { width: 0.62, height: 'auto' },
      pointerEvents: 'none',
      style: {
        flexDirection: 'column',
        gap: 6,
        padding: 16,
        backgroundColor: 'rgba(9, 9, 11, 0.92)',
        borderRadius: 12,
      },
      children: [
        this.cardTickerText,
        this.cardSectorText,
        this.cardMetricText,
        this.cardGrowthText,
        this.cardRankText,
      ],
    });

    this.spatialCard.add(
      new xb.FaceCamera({ mode: 'spherical', smoothing: 0.85 }),
    );
    this.spatialCard.visible = false;
    this.spatialCard.name = 'TowerTelemetryUICard';
    this.add(this.spatialCard);
  }

  public setDataset(newRecords: FinancialCompanyData[]): void {
    this.records = [...newRecords];
    this.rebuildMetropolisLayout(false);
    soundService.playMetricMorph();
    this.onStateUpdated?.();
  }

  /**
   * Computes spatial coordinates, sector ranks, target heights, and colors
   * for every company in the dataset.
   */
  public rebuildMetropolisLayout(immediate = false): void {
    const bySector = new Map<SectorType, FinancialCompanyData[]>();
    (Object.keys(SECTOR_DISTRICTS) as SectorType[]).forEach((s) =>
      bySector.set(s, []),
    );

    this.records.forEach((rec) => {
      const list = bySector.get(rec.sector) || [];
      list.push(rec);
      bySector.set(rec.sector, list);
    });

    // Sort companies within each sector by active metric descending to compute Sector Rank
    bySector.forEach((list) => {
      list.sort(
        (a, b) => this.getMetricValue(b) - this.getMetricValue(a),
      );
    });

    const prevMap = new Map<string, TowerRuntimeRecord>();
    this.towerRuntime.forEach((tr) => prevMap.set(tr.data.id, tr));

    const nextRuntime: TowerRuntimeRecord[] = [];
    let globalIdx = 0;

    bySector.forEach((list, sector) => {
      const cfg = SECTOR_DISTRICTS[sector];
      const spacing = 0.68;
      const rows = Math.ceil(list.length / cfg.cols);

      list.forEach((comp, localIdx) => {
        if (globalIdx >= this.maxInstances) return;
        const col = localIdx % cfg.cols;
        const row = Math.floor(localIdx / cfg.cols);

        const offsetX = (col - (cfg.cols - 1) / 2) * spacing;
        const offsetZ = (row - (rows - 1) / 2) * spacing;

        const worldX = cfg.centerX + offsetX;
        const worldZ = cfg.centerZ + offsetZ;

        const rawVal = this.getMetricValue(comp);
        const isNegative = rawVal < 0;
        const targetHeight = this.computeScaledHeight(rawVal);
        const visible = this.isCompanyPassingFilters(comp);
        const colorHex = this.computeCompanyColorHex(comp);

        const existing = prevMap.get(comp.id);
        const currentHeight =
          immediate || !existing ? targetHeight : existing.currentHeight;

        nextRuntime.push({
          data: comp,
          index: globalIdx,
          worldX,
          worldZ,
          currentHeight,
          targetHeight,
          isNegative,
          visible,
          sectorRank: localIdx + 1,
          colorHex,
        });

        globalIdx++;
      });
    });

    this.towerRuntime = nextRuntime;
    this.state.renderedVoxelCount = this.towerRuntime.filter(
      (t) => t.visible,
    ).length;

    if (this.archEnv) {
      this.archEnv.setSectorVisibility(this.state.selectedSectors);
      this.archEnv.applyTheme(this.state.themePreset);
    }

    this.applyShaderStyleMode();
    this.updateInstancedMatrices();
    this.updateHyperGrowthAuraPositions();
    this.updateSpatialCardAndLasers();
  }

  public getMetricValue(comp: FinancialCompanyData): number {
    if (this.state.metricMode === 'profitQ3_2026') {
      return comp.profitQ3_2026;
    }
    if (this.state.metricMode === 'profit9M_2026') {
      return comp.profit9M_2026;
    }
    return comp.growthQ3_YoY ?? comp.growth9M_YoY ?? 0;
  }

  public getGrowthValue(comp: FinancialCompanyData): number {
    if (this.state.metricMode === 'profit9M_2026') {
      return comp.growth9M_YoY ?? comp.growthQ3_YoY ?? 0;
    }
    return comp.growthQ3_YoY ?? comp.growth9M_YoY ?? 0;
  }

  private computeScaledHeight(val: number): number {
    const absVal = Math.abs(val);
    if (this.state.metricMode === 'growthYoY') {
      if (this.state.scaleMode === 'logarithmic') {
        return Math.max(0.18, Math.log10(absVal + 1) * 1.15);
      }
      return THREE.MathUtils.clamp((absVal / 300) * 1.8, 0.16, 4.2);
    }

    if (this.state.scaleMode === 'logarithmic') {
      // Logarithmic normalization so 17B and 40,440B are both clearly legible
      return Math.max(0.18, Math.pow(Math.log10(absVal + 10), 1.65) * 0.36);
    }
    // Linear absolute scale
    const maxRef = this.state.metricMode === 'profit9M_2026' ? 40440 : 13500;
    return THREE.MathUtils.clamp((absVal / maxRef) * 4.2, 0.14, 4.5);
  }

  private computeCompanyColorHex(comp: FinancialCompanyData): number {
    const palette = THEME_PALETTES[this.state.themePreset];
    if (this.state.colorCodingMode === 'sector') {
      return SECTOR_DISTRICTS[comp.sector].colorHex;
    }
    if (this.state.colorCodingMode === 'magnitude') {
      const val = this.getMetricValue(comp);
      if (val < 0) return palette.lossHex;
      if (val >= 10000) return palette.hyperGrowthHex;
      if (val >= 2000) return palette.positiveGrowthHex;
      if (val >= 500) return palette.moderateGrowthHex;
      return palette.declineHex;
    }

    // Default: By YoY Growth % (Performance View)
    const metricVal = this.getMetricValue(comp);
    const growth = this.getGrowthValue(comp);
    if (metricVal < 0 || growth <= -50) {
      return palette.lossHex;
    }
    if (growth < 0) {
      return palette.declineHex;
    }
    if (growth >= 100) {
      return palette.hyperGrowthHex;
    }
    if (growth >= 25) {
      return palette.positiveGrowthHex;
    }
    return palette.moderateGrowthHex;
  }

  public isCompanyPassingFilters(comp: FinancialCompanyData): boolean {
    if (!this.state.selectedSectors.has(comp.sector)) {
      return false;
    }

    if (this.state.searchQuery.trim().length > 0) {
      const q = this.state.searchQuery.trim().toLowerCase();
      const matchTicker = comp.ticker.toLowerCase().includes(q);
      const matchName = comp.companyName.toLowerCase().includes(q);
      const matchIndustry = (comp.industryLabel || '')
        .toLowerCase()
        .includes(q);
      if (!matchTicker && !matchName && !matchIndustry) {
        return false;
      }
    }

    const profit =
      this.state.metricMode === 'profit9M_2026'
        ? comp.profit9M_2026
        : comp.profitQ3_2026;
    const growth = this.getGrowthValue(comp);

    if (this.state.profitFilterPreset === 'over1000' && profit < 1000) {
      return false;
    }
    if (this.state.profitFilterPreset === 'over5000' && profit < 5000) {
      return false;
    }
    if (this.state.profitFilterPreset === 'hyperGrowth' && growth < 100) {
      return false;
    }
    if (
      this.state.profitFilterPreset === 'lossOnly' &&
      profit >= 0 &&
      growth >= 0
    ) {
      return false;
    }

    if (
      profit < this.state.minProfitFilter ||
      profit > this.state.maxProfitFilter
    ) {
      return false;
    }

    return true;
  }

  private applyShaderStyleMode(): void {
    const mode = this.state.shaderStyleMode;
    if (mode === 'monolith') {
      this.shaftInstanced.visible = true;
      this.shaftMat.wireframe = false;
      this.shaftMat.transparent = false;
      this.shaftMat.opacity = 1.0;
      this.shaftMat.roughness = 0.24;
      this.shaftMat.metalness = 0.62;
      this.wireInstanced.visible = true;
      this.wireMat.opacity = 0.22;
    } else if (mode === 'wireframe') {
      this.shaftInstanced.visible = true;
      this.shaftMat.wireframe = true;
      this.shaftMat.transparent = true;
      this.shaftMat.opacity = 0.45;
      this.wireInstanced.visible = true;
      this.wireMat.opacity = 0.88;
    } else {
      // Glowing Glassmorphic Optical Core
      this.shaftInstanced.visible = true;
      this.shaftMat.wireframe = false;
      this.shaftMat.transparent = true;
      this.shaftMat.opacity = 0.58;
      this.shaftMat.roughness = 0.08;
      this.shaftMat.metalness = 0.2;
      this.wireInstanced.visible = true;
      this.wireMat.opacity = 0.55;
    }
    this.shaftMat.needsUpdate = true;
    this.wireMat.needsUpdate = true;
  }

  private updateInstancedMatrices(): void {
    const hasLocked = Boolean(this.state.lockedCompanyId);

    for (let i = 0; i < this.maxInstances; i++) {
      const tr = this.towerRuntime[i];
      if (!tr || !tr.visible) {
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0.0001);
        _dummy.updateMatrix();
        this.shaftInstanced.setMatrixAt(i, _dummy.matrix);
        this.plinthInstanced.setMatrixAt(i, _dummy.matrix);
        this.crownInstanced.setMatrixAt(i, _dummy.matrix);
        this.wireInstanced.setMatrixAt(i, _dummy.matrix);
        this.basinInstanced.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      const h = Math.max(0.08, tr.currentHeight);
      const isHovered = this.state.hoveredCompanyId === tr.data.id;
      const isLocked = this.state.lockedCompanyId === tr.data.id;
      const footprintScale = isHovered || isLocked ? 1.14 : 1.0;

      // Positive towers rise above the #09090B floor; negative profit towers drop into sub-level basins
      const baseY = tr.isNegative ? -h : 0;

      // 1. Shaft
      _dummy.position.set(tr.worldX, baseY, tr.worldZ);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(footprintScale, h, footprintScale);
      _dummy.updateMatrix();
      this.shaftInstanced.setMatrixAt(i, _dummy.matrix);
      this.wireInstanced.setMatrixAt(i, _dummy.matrix);

      // 2. Base Plinth Collar at floor level y = 0
      _dummy.position.set(tr.worldX, 0, tr.worldZ);
      _dummy.scale.set(footprintScale, 1, footprintScale);
      _dummy.updateMatrix();
      this.plinthInstanced.setMatrixAt(i, _dummy.matrix);

      // 3. Rooftop Crown atop positive towers (or inverted below negative towers)
      if (!tr.isNegative) {
        _dummy.position.set(tr.worldX, h, tr.worldZ);
        _dummy.scale.set(footprintScale, 1, footprintScale);
      } else {
        _dummy.position.set(tr.worldX, 0.01, tr.worldZ);
        _dummy.scale.setScalar(0.001);
      }
      _dummy.updateMatrix();
      this.crownInstanced.setMatrixAt(i, _dummy.matrix);

      // 4. Negative Profit Sub-Level Basin Ring
      if (tr.isNegative) {
        _dummy.position.set(tr.worldX, 0.015, tr.worldZ);
        _dummy.scale.setScalar(1.25);
      } else {
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0.001);
      }
      _dummy.updateMatrix();
      this.basinInstanced.setMatrixAt(i, _dummy.matrix);

      // Color shading (brighten hovered/locked, slightly dim non-locked when camera is locked)
      _color.setHex(tr.colorHex);
      if (isHovered || isLocked) {
        _color.lerp(new THREE.Color(0xffffff), 0.32);
      } else if (hasLocked) {
        _color.multiplyScalar(0.45);
      }
      this.shaftInstanced.setColorAt(i, _color);
      this.crownInstanced.setColorAt(i, _color);
      this.wireInstanced.setColorAt(i, _color);
    }

    this.shaftInstanced.instanceMatrix.needsUpdate = true;
    this.plinthInstanced.instanceMatrix.needsUpdate = true;
    this.crownInstanced.instanceMatrix.needsUpdate = true;
    this.wireInstanced.instanceMatrix.needsUpdate = true;
    this.basinInstanced.instanceMatrix.needsUpdate = true;

    if (this.shaftInstanced.instanceColor) {
      this.shaftInstanced.instanceColor.needsUpdate = true;
    }
    if (this.crownInstanced.instanceColor) {
      this.crownInstanced.instanceColor.needsUpdate = true;
    }
    if (this.wireInstanced.instanceColor) {
      this.wireInstanced.instanceColor.needsUpdate = true;
    }
  }

  private updateHyperGrowthAuraPositions(): void {
    const hyperTowers = this.towerRuntime.filter(
      (t) => t.visible && this.getGrowthValue(t.data) >= 100,
    );
    const posAttr = this.auraGeo.getAttribute(
      'position',
    ) as THREE.BufferAttribute;

    for (let i = 0; i < posAttr.count; i++) {
      if (hyperTowers.length === 0) {
        posAttr.setXYZ(i, 0, -50, 0);
        continue;
      }
      const tower = hyperTowers[i % hyperTowers.length];
      const angle = i * 1.37 + this.elapsedTime * 1.8;
      const radius = 0.24 + (i % 5) * 0.035;
      const yProgress = ((i * 0.13 + this.elapsedTime * 0.45) % 1) * tower.currentHeight;
      posAttr.setXYZ(
        i,
        tower.worldX + Math.cos(angle) * radius,
        Math.max(0.08, yProgress),
        tower.worldZ + Math.sin(angle) * radius,
      );
    }
    posAttr.needsUpdate = true;
  }

  public updateSpatialCardAndLasers(): void {
    const activeId = this.state.hoveredCompanyId ?? this.state.lockedCompanyId;
    const activeTower = activeId
      ? this.towerRuntime.find((t) => t.data.id === activeId && t.visible)
      : undefined;

    if (activeTower) {
      const c = activeTower.data;
      const growth = this.getGrowthValue(c);
      const growthSign = growth > 0 ? '+' : '';
      this.cardTickerText.text = `${c.ticker} — ${c.companyName}`;
      this.cardSectorText.text = `${SECTOR_DISTRICTS[c.sector].label} (${c.industryLabel || c.sector})`;

      if (this.state.metricMode === 'profitQ3_2026') {
        this.cardMetricText.text = `LNTT Q3/2026: ${c.profitQ3_2026.toLocaleString()} Tỷ đồng`;
      } else if (this.state.metricMode === 'profit9M_2026') {
        this.cardMetricText.text = `LNTT 9T/2026: ${c.profit9M_2026.toLocaleString()} Tỷ đồng`;
      } else {
        this.cardMetricText.text = `YoY Growth: ${growthSign}${growth}%`;
      }

      this.cardGrowthText.text = `Q3 YoY: ${c.growthQ3_YoY !== null ? `${c.growthQ3_YoY > 0 ? '+' : ''}${c.growthQ3_YoY}%` : 'Turnaround'} · 9T: ${c.profit9M_2026.toLocaleString()} Tỷ`;
      this.cardGrowthText.style.color =
        growth >= 100
          ? '#00E5FF'
          : growth >= 0
            ? '#10B981'
            : '#EF4444';
      this.cardRankText.text = `Rank #${activeTower.sectorRank} in ${SECTOR_DISTRICTS[c.sector].label}`;

      const topY = activeTower.isNegative
        ? 0.65
        : activeTower.currentHeight + 0.58;
      this.spatialCard.position.set(
        activeTower.worldX,
        topY,
        activeTower.worldZ,
      );
      this.spatialCard.visible = true;
    } else {
      this.spatialCard.visible = false;
    }

    // Locked Tower 1px Cyan Vertical Laser Beam
    const lockedTower = this.state.lockedCompanyId
      ? this.towerRuntime.find(
          (t) => t.data.id === this.state.lockedCompanyId && t.visible,
        )
      : undefined;

    if (lockedTower) {
      this.lockLaserMesh.position.set(
        lockedTower.worldX,
        0,
        lockedTower.worldZ,
      );
      this.lockLaserMesh.visible = true;
    } else {
      this.lockLaserMesh.visible = false;
    }

    // Head-to-Head Duel Calipers
    if (this.state.cameraPresetMode === 'duel') {
      const towerA = this.towerRuntime.find(
        (t) => t.data.ticker === this.state.duelCompanyA,
      );
      const towerB = this.towerRuntime.find(
        (t) => t.data.ticker === this.state.duelCompanyB,
      );
      if (towerA && towerB) {
        const yA = Math.max(0.2, towerA.currentHeight);
        const yB = Math.max(0.2, towerB.currentHeight);
        const caliperY = Math.max(yA, yB) + 0.45;

        const pts = [
          new THREE.Vector3(towerA.worldX, yA, towerA.worldZ),
          new THREE.Vector3(towerA.worldX, caliperY, towerA.worldZ),
          new THREE.Vector3(towerB.worldX, caliperY, towerB.worldZ),
          new THREE.Vector3(towerB.worldX, yB, towerB.worldZ),
        ];
        this.duelLine.geometry.setFromPoints(pts);
        this.duelPillarA.position.set(towerA.worldX, 0, towerA.worldZ);
        this.duelPillarB.position.set(towerB.worldX, 0, towerB.worldZ);
        this.duelGroup.visible = true;
      } else {
        this.duelGroup.visible = false;
      }
    } else {
      this.duelGroup.visible = false;
    }
  }

  public focusOnCompanyById(companyId: string | null): void {
    this.state.lockedCompanyId = companyId;
    if (!companyId) {
      this.updateInstancedMatrices();
      this.updateSpatialCardAndLasers();
      this.onStateUpdated?.();
      return;
    }

    const target = this.towerRuntime.find((t) => t.data.id === companyId);
    if (target) {
      soundService.playTowerLock(!target.isNegative);
      const lookY = target.isNegative ? -0.3 : target.targetHeight * 0.55;
      this.cameraTargetLookAt.set(target.worldX, lookY, target.worldZ);
      this.cameraTargetPos.set(
        target.worldX + 2.2,
        Math.max(1.8, target.targetHeight + 1.4),
        target.worldZ + 2.8,
      );
      this.cameraTransitionActive = true;

      // Check if in Recon Game mode and user scanned the target anomaly!
      if (
        this.state.shellMode === 'reconGame' &&
        this.state.reconTargetTicker === target.data.ticker
      ) {
        this.handleReconTargetMatched();
      }
    }

    this.updateInstancedMatrices();
    this.updateSpatialCardAndLasers();
    this.onStateUpdated?.();
  }

  public applyCameraPreset(preset: CameraPresetMode): void {
    this.state.cameraPresetMode = preset;
    this.cameraTransitionActive = true;

    if (preset === 'topDown') {
      this.cameraTargetPos.set(0, 13.5, 0.01);
      this.cameraTargetLookAt.set(0, 0, 0);
      this.orbitPitch = 1.45;
      this.orbitDistance = 13.5;
    } else if (preset === 'streetDrone') {
      this.cameraTargetPos.set(-1.5, 1.35, 4.8);
      this.cameraTargetLookAt.set(1.2, 1.4, -1.5);
      this.orbitPitch = 0.18;
      this.orbitDistance = 5.5;
    } else if (preset === 'nightVault') {
      // Frame the East Transition Bulkhead (X = +3.22m), Exterior Starry Night Sky Vault,
      // 900 Twinkling GLSL Stars, and Skyward Telemetry Laser Beam Housing (X = +5.65m)
      this.orbitYaw = -0.62;
      this.orbitPitch = 0.16;
      this.orbitDistance = 7.4;
      this.cameraTargetLookAt.set(4.85, 2.85, -0.75);
      this.cameraTargetPos.set(-1.15, 1.65, 3.45);
    } else if (preset === 'duel') {
      const towerA = this.towerRuntime.find(
        (t) => t.data.ticker === this.state.duelCompanyA,
      );
      const towerB = this.towerRuntime.find(
        (t) => t.data.ticker === this.state.duelCompanyB,
      );
      if (towerA && towerB) {
        const midX = (towerA.worldX + towerB.worldX) / 2;
        const midZ = (towerA.worldZ + towerB.worldZ) / 2;
        const dist = Math.hypot(
          towerA.worldX - towerB.worldX,
          towerA.worldZ - towerB.worldZ,
        );
        const maxH = Math.max(towerA.targetHeight, towerB.targetHeight, 1.5);
        this.cameraTargetLookAt.set(midX, maxH * 0.5, midZ);
        this.cameraTargetPos.set(
          midX,
          maxH + 2.4,
          midZ + Math.max(4.2, dist * 1.15),
        );
      }
    } else {
      // 45° Isometric Overview angled across the Interior Bunker and East Transition Bulkhead (X = +3.22m)
      // into the Exterior Starry Night Sky Vault & Skyward Telemetry Laser Beam
      this.orbitYaw = -0.34;
      this.orbitPitch = 0.36;
      this.orbitDistance = 9.2;
      this.cameraTargetLookAt.set(1.1, 1.15, -0.45);
      this.cameraTargetPos.set(
        this.cameraTargetLookAt.x +
          Math.sin(this.orbitYaw) *
            Math.cos(this.orbitPitch) *
            this.orbitDistance,
        this.cameraTargetLookAt.y +
          Math.sin(this.orbitPitch) * this.orbitDistance,
        this.cameraTargetLookAt.z +
          Math.cos(this.orbitYaw) *
            Math.cos(this.orbitPitch) *
            this.orbitDistance,
      );
    }

    this.updateSpatialCardAndLasers();
    this.onStateUpdated?.();
  }

  /**
   * Starts the Tactical Anomaly Recon Challenge (Interactive 3D Game Mode).
   */
  public startReconGame(): void {
    this.state.shellMode = 'reconGame';
    this.state.reconScore = 0;
    this.state.reconScannedCount = 0;
    this.state.reconStreak = 0;
    this.state.reconTimeRemaining = 60;
    this.state.lockedCompanyId = null;
    this.pickNextReconTarget();
    this.applyCameraPreset('isometric');
    soundService.playMetricMorph();
    this.onStateUpdated?.();
  }

  public pickNextReconTarget(): void {
    const visibleTowers = this.towerRuntime.filter((t) => t.visible);
    if (visibleTowers.length === 0) return;
    const chosen =
      visibleTowers[Math.floor(Math.random() * visibleTowers.length)].data;
    this.state.reconTargetTicker = chosen.ticker;
    const growth = chosen.growthQ3_YoY ?? 0;
    this.state.reconTargetClue = `LOCATE [${chosen.ticker}] — ${chosen.companyName} in ${SECTOR_DISTRICTS[chosen.sector].label} (Q3: ${chosen.profitQ3_2026.toLocaleString()}B | YoY: ${growth > 0 ? '+' : ''}${growth}%)`;
  }

  private handleReconTargetMatched(): void {
    soundService.playReconSuccess();
    this.state.reconScannedCount += 1;
    this.state.reconStreak += 1;
    this.state.reconScore += 250 + this.state.reconStreak * 50;
    this.pickNextReconTarget();
    this.onStateUpdated?.();
  }

  private setupDesktopInputListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          document.activeElement.tagName,
        )
      ) {
        return;
      }
      const code = e.code;
      this.heldKeys.add(code);

      if (code === 'KeyH') {
        this.state.dockCollapsed = !this.state.dockCollapsed;
        this.onStateUpdated?.();
      } else if (code === 'Escape') {
        if (this.state.showReferenceModal) {
          this.state.showReferenceModal = false;
        } else if (this.state.lockedCompanyId) {
          this.focusOnCompanyById(null);
        } else if (this.state.shellMode === 'reconGame') {
          this.state.shellMode = 'reconSummary';
        }
        this.onStateUpdated?.();
      } else if (
        (code === 'Enter' || code === 'Space') &&
        this.state.shellMode === 'title'
      ) {
        e.preventDefault();
        this.state.shellMode = 'exploring';
        soundService.playMetricMorph();
        this.onStateUpdated?.();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.heldKeys.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.heldKeys.clear();
      this.isDraggingOrbit = false;
    });

    window.addEventListener('pointerdown', (e) => {
      const targetEl = e.target as HTMLElement | null;
      if (targetEl && targetEl.closest('#studio-ui-root')) return;

      this.isDraggingOrbit = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      const targetEl = e.target as HTMLElement | null;
      const overUi = Boolean(targetEl && targetEl.closest('#studio-ui-root'));

      if (this.isDraggingOrbit && !overUi) {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;

        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          this.cameraTransitionActive = false;
          this.orbitYaw -= dx * 0.0055;
          this.orbitPitch = THREE.MathUtils.clamp(
            this.orbitPitch + dy * 0.0045,
            0.08,
            1.48,
          );
          const cam = xb.core?.camera;
          if (cam) {
            this.cameraTargetPos.set(
              this.currentLookAt.x +
                Math.sin(this.orbitYaw) *
                  Math.cos(this.orbitPitch) *
                  this.orbitDistance,
              this.currentLookAt.y +
                Math.sin(this.orbitPitch) * this.orbitDistance,
              this.currentLookAt.z +
                Math.cos(this.orbitYaw) *
                  Math.cos(this.orbitPitch) *
                  this.orbitDistance,
            );
            this.cameraTargetLookAt.copy(this.currentLookAt);
          }
        }
      }

      // Throttled hover raycast (every 32ms)
      const now = performance.now();
      if (!overUi && now - this.lastPointerRaycastTime >= 32) {
        this.lastPointerRaycastTime = now;
        this.performPointerRaycast(e.clientX, e.clientY, false);
      }
    });

    window.addEventListener('pointerup', (e) => {
      const wasDragging =
        Math.hypot(
          e.clientX - this.lastPointerX,
          e.clientY - this.lastPointerY,
        ) > 5;
      this.isDraggingOrbit = false;
      const targetEl = e.target as HTMLElement | null;
      if (targetEl && targetEl.closest('#studio-ui-root')) return;
      if (!wasDragging) {
        this.performPointerRaycast(e.clientX, e.clientY, true);
      }
    });

    window.addEventListener(
      'wheel',
      (e) => {
        const targetEl = e.target as HTMLElement | null;
        if (targetEl && targetEl.closest('#studio-ui-root')) return;
        this.orbitDistance = THREE.MathUtils.clamp(
          this.orbitDistance + e.deltaY * 0.005,
          2.6,
          18.5,
        );
        this.cameraTargetPos.set(
          this.currentLookAt.x +
            Math.sin(this.orbitYaw) *
              Math.cos(this.orbitPitch) *
              this.orbitDistance,
          this.currentLookAt.y +
            Math.sin(this.orbitPitch) * this.orbitDistance,
          this.currentLookAt.z +
            Math.cos(this.orbitYaw) *
              Math.cos(this.orbitPitch) *
              this.orbitDistance,
        );
      },
      { passive: true },
    );
  }

  private performPointerRaycast(
    clientX: number,
    clientY: number,
    isClick: boolean,
  ): void {
    const cam = xb.core?.camera;
    if (!cam || !this.shaftInstanced) return;

    _pointerNdc.x = (clientX / window.innerWidth) * 2 - 1;
    _pointerNdc.y = -(clientY / window.innerHeight) * 2 + 1;
    _raycaster.setFromCamera(_pointerNdc, cam);

    const hits = _raycaster.intersectObject(this.shaftInstanced, false);
    if (hits.length > 0 && hits[0].instanceId !== undefined) {
      const instanceId = hits[0].instanceId;
      const tr = this.towerRuntime[instanceId];
      if (tr && tr.visible) {
        if (isClick) {
          const nextLock =
            this.state.lockedCompanyId === tr.data.id ? null : tr.data.id;
          this.focusOnCompanyById(nextLock);
        } else if (this.state.hoveredCompanyId !== tr.data.id) {
          this.state.hoveredCompanyId = tr.data.id;
          soundService.playHoverTick();
          this.updateInstancedMatrices();
          this.updateSpatialCardAndLasers();
          this.onStateUpdated?.();
        }
        return;
      }
    }

    if (!isClick && this.state.hoveredCompanyId !== null) {
      this.state.hoveredCompanyId = null;
      this.updateInstancedMatrices();
      this.updateSpatialCardAndLasers();
      this.onStateUpdated?.();
    }
  }

  /**
   * XR Controller / Hand Pinch selection support
   */
  public onSelectStart(event: xb.SelectEvent): void {
    const controller = event?.source?.controller;
    if (!controller || !this.shaftInstanced) return;

    _vec3A.set(0, 0, 0).applyMatrix4(controller.matrixWorld);
    _vec3B
      .set(0, 0, -1)
      .applyQuaternion(controller.quaternion)
      .normalize();
    _raycaster.set(_vec3A, _vec3B);

    const hits = _raycaster.intersectObject(this.shaftInstanced, false);
    if (hits.length > 0 && hits[0].instanceId !== undefined) {
      const tr = this.towerRuntime[hits[0].instanceId];
      if (tr && tr.visible) {
        this.focusOnCompanyById(tr.data.id);
      }
    }
  }

  public update(): void {
    const rawDt = xb.getDeltaTime ? xb.getDeltaTime() : 0.016;
    const dt = Math.min(rawDt > 0 ? rawDt : 0.016, 0.05);
    this.elapsedTime += dt;

    // Live FPS calculation
    this.frameCounter++;
    this.fpsAccumTime += dt;
    if (this.fpsAccumTime >= 0.5) {
      this.state.fps = Math.min(
        60,
        Math.round(this.frameCounter / this.fpsAccumTime),
      );
      this.frameCounter = 0;
      this.fpsAccumTime = 0;
    }

    // Recon Game Countdown Timer
    if (this.state.shellMode === 'reconGame') {
      this.state.reconTimeRemaining = Math.max(
        0,
        this.state.reconTimeRemaining - dt,
      );
      if (this.state.reconTimeRemaining <= 0) {
        this.state.shellMode = 'reconSummary';
        this.onStateUpdated?.();
      }
    }

    // Update Starfield & Telemetry Laser Beacon
    this.archEnv?.update(this.elapsedTime);

    // Smoothly damp 3D Voxel Tower heights (60 FPS morphing)
    let heightsDirty = false;
    for (let i = 0; i < this.towerRuntime.length; i++) {
      const tr = this.towerRuntime[i];
      const diff = Math.abs(tr.currentHeight - tr.targetHeight);
      if (diff > 0.002) {
        tr.currentHeight = THREE.MathUtils.damp(
          tr.currentHeight,
          tr.targetHeight,
          7.5,
          dt,
        );
        heightsDirty = true;
      } else if (diff > 0) {
        tr.currentHeight = tr.targetHeight;
        heightsDirty = true;
      }
    }

    if (heightsDirty) {
      this.updateInstancedMatrices();
      this.updateSpatialCardAndLasers();
    }

    this.updateHyperGrowthAuraPositions();

    // Update camera movement & WASD Drone controls (when not in an active WebXR headset session)
    const cam = xb.core?.camera;
    const inXr = xb.core?.renderer?.xr?.isPresenting;
    if (cam && !inXr) {
      // Title screen slow atmospheric pan
      if (this.state.shellMode === 'title') {
        this.orbitYaw += dt * 0.14;
        this.cameraTargetPos.set(
          Math.sin(this.orbitYaw) * 9.5,
          4.6,
          Math.cos(this.orbitYaw) * 9.5,
        );
        this.cameraTargetLookAt.set(0.2, 0.8, 0);
      }

      // WASD / Arrow keys Drone Flight
      const moveSpeed = 4.2 * dt;
      let movedKey = false;
      if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) {
        _vec3A
          .set(Math.sin(this.orbitYaw), 0, Math.cos(this.orbitYaw))
          .multiplyScalar(-moveSpeed);
        this.cameraTargetPos.add(_vec3A);
        this.cameraTargetLookAt.add(_vec3A);
        movedKey = true;
      }
      if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) {
        _vec3A
          .set(Math.sin(this.orbitYaw), 0, Math.cos(this.orbitYaw))
          .multiplyScalar(moveSpeed);
        this.cameraTargetPos.add(_vec3A);
        this.cameraTargetLookAt.add(_vec3A);
        movedKey = true;
      }
      if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) {
        _vec3A
          .set(Math.cos(this.orbitYaw), 0, -Math.sin(this.orbitYaw))
          .multiplyScalar(-moveSpeed);
        this.cameraTargetPos.add(_vec3A);
        this.cameraTargetLookAt.add(_vec3A);
        movedKey = true;
      }
      if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) {
        _vec3A
          .set(Math.cos(this.orbitYaw), 0, -Math.sin(this.orbitYaw))
          .multiplyScalar(moveSpeed);
        this.cameraTargetPos.add(_vec3A);
        this.cameraTargetLookAt.add(_vec3A);
        movedKey = true;
      }
      if (movedKey) {
        this.cameraTransitionActive = true;
      }

      // Exponential damping for silky-smooth camera motion
      const alpha = 1 - Math.exp(-6.5 * dt);
      cam.position.lerp(this.cameraTargetPos, alpha);
      this.currentLookAt.lerp(this.cameraTargetLookAt, alpha);
      cam.lookAt(this.currentLookAt);

      if (
        this.cameraTransitionActive &&
        cam.position.distanceToSquared(this.cameraTargetPos) < 0.001
      ) {
        this.cameraTransitionActive = false;
      }
    }
  }

  public dispose(): void {
    this.archEnv?.dispose();
    this.shaftInstanced?.geometry.dispose();
    this.plinthInstanced?.geometry.dispose();
    this.crownInstanced?.geometry.dispose();
    this.wireInstanced?.geometry.dispose();
    this.basinInstanced?.geometry.dispose();
    this.shaftMat?.dispose();
    this.plinthMat?.dispose();
    this.crownMat?.dispose();
    this.wireMat?.dispose();
    this.basinMat?.dispose();
    this.auraGeo?.dispose();
    this.auraMat?.dispose();
  }
}
