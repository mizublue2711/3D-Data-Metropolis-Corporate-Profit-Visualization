import * as THREE from 'three';
import {
  SECTOR_DISTRICTS,
  THEME_PALETTES,
} from '../constants';
import { SectorType, ThemePreset } from '../types';

/**
 * Builds the Cybernetic Brutalist Swiss-Grid Bunker & Exterior Starry Night Sky:
 * - Obsidian-Black (#09090B) Concrete Floor & Walls with 1px Swiss grid & fiducial crosshairs
 * - Charcoal-Gray (#18181E) Modular Metal Panels with 1px THREE.EdgesGeometry wireframes
 * - East Transition Bulkhead (X = +3.22m) where the interior ceiling and walls open out
 *   into a pitch-black (#000000) night sky vault housing a skyward telemetry laser beam
 * - 900 Twinkling Luminous Stars via Custom GLSL THREE.ShaderMaterial (AdditiveBlending, fog: false)
 *   with multi-harmonic stellar scintillation, diffraction spikes, and varied stellar color temperatures
 * - Sector District 1px Perimeter Frames & Procedural Floor Signage
 */
export class ArchitectureEnvironment extends THREE.Group {
  private starMaterial: THREE.ShaderMaterial;
  private laserShaderMaterial!: THREE.ShaderMaterial;
  private floorMaterial: THREE.MeshStandardMaterial;
  private wallMaterial: THREE.MeshStandardMaterial;
  private panelMaterial: THREE.MeshStandardMaterial;
  private panelEdgeMaterial: THREE.LineBasicMaterial;
  private laserCoreMesh!: THREE.Mesh;
  private beaconRingInner!: THREE.Mesh;
  private beaconRingOuter!: THREE.Mesh;
  private ascendingPulses: THREE.Mesh[] = [];
  private districtGroups = new Map<SectorType, THREE.Group>();
  private texturesToDispose: THREE.Texture[] = [];
  private geometriesToDispose: THREE.BufferGeometry[] = [];
  private materialsToDispose: THREE.Material[] = [];

  constructor(maxAnisotropy = 4) {
    super();
    this.name = 'ArchitectureEnvironment';

    const gridTexture = this.createSwissGridConcreteTexture(
      '#09090B',
      '#1C1C26',
      '#00E5FF',
      maxAnisotropy,
    );
    const wallTexture = this.createSwissGridConcreteTexture(
      '#09090B',
      '#181822',
      '#5322FF',
      maxAnisotropy,
    );

    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: gridTexture,
      roughness: 0.72,
      metalness: 0.18,
    });

    this.wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: wallTexture,
      roughness: 0.82,
      metalness: 0.15,
    });

    this.panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181e,
      roughness: 0.36,
      metalness: 0.8,
    });

    this.panelEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0x383c52,
      transparent: true,
      opacity: 0.88,
    });

    this.materialsToDispose.push(
      this.floorMaterial,
      this.wallMaterial,
      this.panelMaterial,
      this.panelEdgeMaterial,
    );

    this.buildObsidianFloor();
    this.buildBrutalistBunkerWallsAndPanels(maxAnisotropy);
    this.buildPitchBlackNightSkyVaultDome();
    this.buildCompositeTelemetryVaultAndLaserBeam();
    this.starMaterial = this.buildStarfieldVault();
    this.buildDistrictPerimeters(maxAnisotropy);
  }

  private createSwissGridConcreteTexture(
    bgHex: string,
    lineHex: string,
    crosshairHex: string,
    maxAnisotropy: number,
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 1024, 1024);

    // Procedural concrete micro-grain
    for (let i = 0; i < 3200; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const alpha = Math.random() * 0.035;
      ctx.fillStyle =
        i % 2 === 0
          ? `rgba(255,255,255,${alpha.toFixed(3)})`
          : `rgba(0,0,0,${(alpha * 1.4).toFixed(3)})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // 1px Swiss sub-grid lines
    ctx.strokeStyle = lineHex;
    ctx.lineWidth = 1;
    const step = 64;
    ctx.beginPath();
    for (let i = 0; i <= 1024; i += step) {
      ctx.moveTo(i + 0.5, 0);
      ctx.moveTo(i + 0.5, 0);
      ctx.lineTo(i + 0.5, 1024);
      ctx.moveTo(0, i + 0.5);
      ctx.lineTo(1024, i + 0.5);
    }
    ctx.stroke();

    // Major 256px grid lines
    ctx.strokeStyle = '#2A2D3D';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 1024; i += 256) {
      ctx.moveTo(i + 0.5, 0);
      ctx.lineTo(i + 0.5, 1024);
      ctx.moveTo(0, i + 0.5);
      ctx.lineTo(1024, i + 0.5);
    }
    ctx.stroke();

    // Coordinate fiducial crosshairs at major intersections
    ctx.strokeStyle = crosshairHex;
    ctx.lineWidth = 1.5;
    for (let x = 256; x <= 768; x += 256) {
      for (let y = 256; y <= 768; y += 256) {
        ctx.beginPath();
        ctx.moveTo(x - 9, y);
        ctx.lineTo(x + 9, y);
        ctx.moveTo(x, y - 9);
        ctx.lineTo(x, y + 9);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
    texture.anisotropy = maxAnisotropy;
    this.texturesToDispose.push(texture);
    return texture;
  }

  private buildObsidianFloor(): void {
    // Interior & Exterior continuous Swiss-Grid floor slab
    const floorGeo = new THREE.PlaneGeometry(24, 18);
    this.geometriesToDispose.push(floorGeo);
    const floorMesh = new THREE.Mesh(floorGeo, this.floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, -0.005, 0);
    floorMesh.receiveShadow = true;
    floorMesh.xb = { pointerEvents: 'none' };
    this.add(floorMesh);

    // Sub-level basement basin floor for negative profit visualization
    const subBasinGeo = new THREE.PlaneGeometry(24, 18);
    const subBasinMat = new THREE.MeshStandardMaterial({
      color: 0x030305,
      roughness: 0.9,
      metalness: 0.1,
    });
    this.geometriesToDispose.push(subBasinGeo);
    this.materialsToDispose.push(subBasinMat);
    const subBasin = new THREE.Mesh(subBasinGeo, subBasinMat);
    subBasin.rotation.x = -Math.PI / 2;
    subBasin.position.set(0, -1.25, 0);
    subBasin.xb = { pointerEvents: 'none' };
    this.add(subBasin);
  }

  /**
   * Builds the Interior Swiss-Grid Bunker (X = -8.5m to East Transition Bulkhead X = +3.22m).
   * Past X = +3.22m, the ceiling slab and walls terminate completely, opening out into the
   * pitch-black Night Sky Vault.
   */
  private buildBrutalistBunkerWallsAndPanels(maxAnisotropy: number): void {
    const westLimitX = -8.5;
    const bulkheadX = 3.22;
    const bunkerWidth = bulkheadX - westLimitX; // 11.72m
    const bunkerCenterX = (westLimitX + bulkheadX) / 2; // -2.64m
    const wallHeight = 6.6;

    // 1. Rear North Wall (terminates strictly at X = +3.22m so X > +3.22m opens to the starry night sky)
    const northWallGeo = new THREE.BoxGeometry(bunkerWidth, wallHeight, 0.28);
    const northWallEdges = new THREE.EdgesGeometry(northWallGeo);
    this.geometriesToDispose.push(northWallGeo, northWallEdges);
    const northWall = new THREE.Mesh(northWallGeo, this.wallMaterial);
    northWall.position.set(bunkerCenterX, wallHeight / 2, -5.6);
    northWall.receiveShadow = true;
    northWall.xb = { pointerEvents: 'none' };
    northWall.add(
      new THREE.LineSegments(northWallEdges, this.panelEdgeMaterial),
    );
    this.add(northWall);

    // 2. West Wing Wall (Z = -5.6m to +5.6m at X = -8.5m)
    const westWallGeo = new THREE.BoxGeometry(0.28, wallHeight, 11.2);
    const westWallEdges = new THREE.EdgesGeometry(westWallGeo);
    this.geometriesToDispose.push(westWallGeo, westWallEdges);
    const westWall = new THREE.Mesh(westWallGeo, this.wallMaterial);
    westWall.position.set(westLimitX, wallHeight / 2, 0);
    westWall.receiveShadow = true;
    westWall.xb = { pointerEvents: 'none' };
    westWall.add(new THREE.LineSegments(westWallEdges, this.panelEdgeMaterial));
    this.add(westWall);

    // 3. Cantilevered Ceiling Slab ending strictly at X = +3.22m
    const ceilingGeo = new THREE.BoxGeometry(bunkerWidth, 0.34, 11.2);
    const ceilingEdges = new THREE.EdgesGeometry(ceilingGeo);
    this.geometriesToDispose.push(ceilingGeo, ceilingEdges);
    const ceilingSlab = new THREE.Mesh(ceilingGeo, this.wallMaterial);
    ceilingSlab.position.set(bunkerCenterX, wallHeight, 0);
    ceilingSlab.xb = { pointerEvents: 'none' };
    ceilingSlab.add(
      new THREE.LineSegments(ceilingEdges, this.panelEdgeMaterial),
    );
    this.add(ceilingSlab);

    // 4. East Transition Bulkhead Portal at X = +3.22m
    const pillarGeo = new THREE.BoxGeometry(0.42, wallHeight, 0.56);
    const pillarEdges = new THREE.EdgesGeometry(pillarGeo);
    const lintelGeo = new THREE.BoxGeometry(0.48, 0.52, 11.2);
    const lintelEdges = new THREE.EdgesGeometry(lintelGeo);
    this.geometriesToDispose.push(
      pillarGeo,
      pillarEdges,
      lintelGeo,
      lintelEdges,
    );

    const northPillar = new THREE.Mesh(pillarGeo, this.panelMaterial);
    northPillar.position.set(bulkheadX, wallHeight / 2, -5.32);
    northPillar.xb = { pointerEvents: 'none' };
    northPillar.add(
      new THREE.LineSegments(pillarEdges, this.panelEdgeMaterial),
    );

    const southPillar = new THREE.Mesh(pillarGeo, this.panelMaterial);
    southPillar.position.set(bulkheadX, wallHeight / 2, 5.32);
    southPillar.xb = { pointerEvents: 'none' };
    southPillar.add(
      new THREE.LineSegments(pillarEdges, this.panelEdgeMaterial),
    );

    const bulkheadLintel = new THREE.Mesh(lintelGeo, this.panelMaterial);
    bulkheadLintel.position.set(bulkheadX, wallHeight - 0.16, 0);
    bulkheadLintel.xb = { pointerEvents: 'none' };
    bulkheadLintel.add(
      new THREE.LineSegments(lintelEdges, this.panelEdgeMaterial),
    );

    this.add(northPillar, southPillar, bulkheadLintel);

    // Mounting modular #18181E metallic bays along the East Transition Bulkhead column & lintel
    const bulkheadBayGeo = new THREE.BoxGeometry(0.52, 0.38, 1.55);
    const bulkheadBayEdges = new THREE.EdgesGeometry(bulkheadBayGeo);
    this.geometriesToDispose.push(bulkheadBayGeo, bulkheadBayEdges);
    for (let zIdx = 0; zIdx < 6; zIdx++) {
      const bay = new THREE.Mesh(bulkheadBayGeo, this.panelMaterial);
      bay.position.set(bulkheadX, wallHeight - 0.16, -4.25 + zIdx * 1.7);
      bay.xb = { pointerEvents: 'none' };
      bay.add(new THREE.LineSegments(bulkheadBayEdges, this.panelEdgeMaterial));
      this.add(bay);
    }

    // Illuminated Bulkhead Threshold Header Sign at X = +3.22m
    const bulkheadSignTex = this.createDistrictLabelTexture(
      'EAST TRANSITION BULKHEAD // X = +3.22m',
      'EXTERIOR STARRY NIGHT SKY VAULT & TELEMETRY UPLINK',
      '#00E5FF',
      maxAnisotropy,
    );
    const signGeo = new THREE.PlaneGeometry(3.4, 0.42);
    const signMat = new THREE.MeshBasicMaterial({
      map: bulkheadSignTex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.geometriesToDispose.push(signGeo);
    this.materialsToDispose.push(signMat);

    const floorThresholdSign = new THREE.Mesh(signGeo, signMat);
    floorThresholdSign.rotation.x = -Math.PI / 2;
    floorThresholdSign.rotation.z = -Math.PI / 2;
    floorThresholdSign.position.set(bulkheadX - 0.28, 0.016, 0);
    floorThresholdSign.xb = { pointerEvents: 'none' };
    this.add(floorThresholdSign);

    // Razor-thin 1px Cyan laser boundary line along X = +3.22m floor and portal opening
    const thresholdLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(bulkheadX, 0.02, -5.5),
      new THREE.Vector3(bulkheadX, 0.02, 5.5),
      new THREE.Vector3(bulkheadX, wallHeight - 0.42, 5.5),
      new THREE.Vector3(bulkheadX, wallHeight - 0.42, -5.5),
      new THREE.Vector3(bulkheadX, 0.02, -5.5),
    ]);
    const thresholdLineMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.9,
    });
    this.geometriesToDispose.push(thresholdLineGeo);
    this.materialsToDispose.push(thresholdLineMat);
    const thresholdLoop = new THREE.Line(thresholdLineGeo, thresholdLineMat);
    thresholdLoop.xb = { pointerEvents: 'none' };
    this.add(thresholdLoop);

    // 5. Modular #18181E Charcoal-Gray Metal Panels on Interior North & West Walls
    const bayPanelGeo = new THREE.BoxGeometry(1.68, 2.0, 0.07);
    const bayEdgesGeo = new THREE.EdgesGeometry(bayPanelGeo);
    this.geometriesToDispose.push(bayPanelGeo, bayEdgesGeo);

    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 2; row++) {
        const panel = new THREE.Mesh(bayPanelGeo, this.panelMaterial);
        const px = -7.3 + col * 1.86;
        const py = 1.65 + row * 2.25;
        panel.position.set(px, py, -5.42);
        panel.xb = { pointerEvents: 'none' };
        panel.add(new THREE.LineSegments(bayEdgesGeo, this.panelEdgeMaterial));
        this.add(panel);
      }
    }

    const westBayGeo = new THREE.BoxGeometry(0.07, 2.0, 1.8);
    const westBayEdges = new THREE.EdgesGeometry(westBayGeo);
    this.geometriesToDispose.push(westBayGeo, westBayEdges);

    for (let zIdx = 0; zIdx < 5; zIdx++) {
      for (let row = 0; row < 2; row++) {
        const panel = new THREE.Mesh(westBayGeo, this.panelMaterial);
        const pz = -4.0 + zIdx * 2.0;
        const py = 1.65 + row * 2.25;
        panel.position.set(westLimitX + 0.18, py, pz);
        panel.xb = { pointerEvents: 'none' };
        panel.add(new THREE.LineSegments(westBayEdges, this.panelEdgeMaterial));
        this.add(panel);
      }
    }
  }

  /**
   * Builds a Pitch-Black (#000000) Celestial Night Sky Vault backdrop (fog: false)
   * so that looking past the East Transition Bulkhead (X = +3.22m) or upward into the open
   * vault reveals a deep pitch-black night sky with maximum contrast for the 900 stars.
   */
  private buildPitchBlackNightSkyVaultDome(): void {
    const domeGeo = new THREE.SphereGeometry(52, 48, 32);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    this.geometriesToDispose.push(domeGeo);
    this.materialsToDispose.push(domeMat);

    const skyVaultDome = new THREE.Mesh(domeGeo, domeMat);
    skyVaultDome.position.set(3.22, 0, 0);
    skyVaultDome.renderOrder = -10;
    skyVaultDome.xb = { pointerEvents: 'none' };
    this.add(skyVaultDome);

    // Subtle exterior horizon perimeter curb at X = +3.22m to +9.2m
    const extPerimeterGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(3.22, 0.018, -5.5),
      new THREE.Vector3(8.8, 0.018, -5.5),
      new THREE.Vector3(8.8, 0.018, 5.5),
      new THREE.Vector3(3.22, 0.018, 5.5),
    ]);
    const extPerimeterMat = new THREE.LineBasicMaterial({
      color: 0x5322ff,
      transparent: true,
      opacity: 0.7,
    });
    this.geometriesToDispose.push(extPerimeterGeo);
    this.materialsToDispose.push(extPerimeterMat);
    const extPerimeterLine = new THREE.Line(extPerimeterGeo, extPerimeterMat);
    extPerimeterLine.xb = { pointerEvents: 'none' };
    this.add(extPerimeterLine);
  }

  /**
   * Builds the Exterior Night Sky Vault Housing & Skyward Telemetry Laser Beam
   * positioned past the East Transition Bulkhead at (X = +5.65m, Z = -0.75m).
   */
  private buildCompositeTelemetryVaultAndLaserBeam(): void {
    const vaultGroup = new THREE.Group();
    vaultGroup.position.set(5.65, 0, -0.75);
    vaultGroup.xb = { pointerEvents: 'none' };

    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x18181e,
      roughness: 0.25,
      metalness: 0.9,
    });
    const matteConcrete = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.8,
      metalness: 0.15,
    });
    const indigoAccent = new THREE.MeshStandardMaterial({
      color: 0x5322ff,
      emissive: 0x5322ff,
      emissiveIntensity: 1.1,
      roughness: 0.25,
      metalness: 0.7,
    });
    const cyanEmissive = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });

    this.materialsToDispose.push(
      darkMetal,
      matteConcrete,
      indigoAccent,
      cyanEmissive,
    );

    // Part 1: Octagonal Vault Housing Base Plinth with 1px wireframe edges
    const plinthGeo = new THREE.CylinderGeometry(0.88, 1.05, 0.26, 8);
    plinthGeo.translate(0, 0.13, 0);
    const plinthEdges = new THREE.EdgesGeometry(plinthGeo);
    const plinth = new THREE.Mesh(plinthGeo, matteConcrete);
    plinth.add(new THREE.LineSegments(plinthEdges, this.panelEdgeMaterial));

    // Part 2: Recessed Stator Housing Collar
    const collarGeo = new THREE.CylinderGeometry(0.64, 0.76, 0.36, 16);
    collarGeo.translate(0, 0.44, 0);
    const collarEdges = new THREE.EdgesGeometry(collarGeo);
    const collar = new THREE.Mesh(collarGeo, darkMetal);
    collar.add(new THREE.LineSegments(collarEdges, this.panelEdgeMaterial));

    // Part 3: Lathe Parabolic Telemetry Concentrator Dish
    const lathePoints = [
      new THREE.Vector2(0.2, 0.62),
      new THREE.Vector2(0.52, 0.8),
      new THREE.Vector2(0.66, 1.12),
      new THREE.Vector2(0.58, 1.18),
      new THREE.Vector2(0.18, 0.7),
    ];
    const dishGeo = new THREE.LatheGeometry(lathePoints, 24);
    const dish = new THREE.Mesh(dishGeo, darkMetal);

    // Part 4 & 5: Dual Counter-Rotating Gyroscopic Collimator Rings
    const ringInnerGeo = new THREE.TorusGeometry(0.46, 0.026, 12, 36);
    this.beaconRingInner = new THREE.Mesh(ringInnerGeo, indigoAccent);
    this.beaconRingInner.position.y = 1.22;
    this.beaconRingInner.rotation.x = Math.PI / 2;

    const ringOuterGeo = new THREE.TorusGeometry(0.62, 0.02, 12, 36);
    this.beaconRingOuter = new THREE.Mesh(ringOuterGeo, cyanEmissive);
    this.beaconRingOuter.position.y = 1.22;
    this.beaconRingOuter.rotation.x = Math.PI / 2;

    // Part 6: 4 Angled Containment Pylons around the Vault Housing
    const pylonGeo = new THREE.BoxGeometry(0.12, 1.35, 0.28);
    const pylonEdges = new THREE.EdgesGeometry(pylonGeo);
    for (let i = 0; i < 4; i++) {
      const pylon = new THREE.Mesh(pylonGeo, darkMetal);
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      pylon.position.set(
        Math.cos(angle) * 0.72,
        0.68,
        Math.sin(angle) * 0.72,
      );
      pylon.rotation.y = -angle;
      pylon.add(new THREE.LineSegments(pylonEdges, this.panelEdgeMaterial));
      vaultGroup.add(pylon);
    }

    // Part 7: Optical Focusing Emitter Core
    const emitterGeo = new THREE.CylinderGeometry(0.1, 0.18, 1.1, 16);
    emitterGeo.translate(0, 1.05, 0);
    const emitter = new THREE.Mesh(emitterGeo, indigoAccent);

    // Part 8: Skyward Telemetry Laser Beam (Inner Intense Core + Custom GLSL Volumetric Pulse Sheath)
    const coreBeamGeo = new THREE.CylinderGeometry(
      0.035,
      0.055,
      36,
      16,
      1,
      true,
    );
    coreBeamGeo.translate(0, 18.5, 0);
    this.laserCoreMesh = new THREE.Mesh(coreBeamGeo, cyanEmissive);

    const outerSheathGeo = new THREE.CylinderGeometry(
      0.16,
      0.28,
      36,
      24,
      1,
      true,
    );
    outerSheathGeo.translate(0, 18.5, 0);

    this.laserShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorCyan: { value: new THREE.Color('#00E5FF') },
        uColorIndigo: { value: new THREE.Color('#5322FF') },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uColorCyan;
        uniform vec3 uColorIndigo;

        void main() {
          // Upward traveling telemetry packet waves along the skyward beam
          float wave1 = sin(vUv.y * 45.0 - uTime * 8.0) * 0.5 + 0.5;
          float wave2 = sin(vUv.y * 14.0 - uTime * 3.5) * 0.5 + 0.5;
          float pulse = pow(wave1, 3.0) * 0.65 + wave2 * 0.35;
          float verticalFade = (1.0 - smoothstep(0.75, 1.0, vUv.y));
          vec3 col = mix(uColorIndigo, uColorCyan, pulse);
          float alpha = (0.24 + 0.52 * pulse) * verticalFade;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.materialsToDispose.push(this.laserShaderMaterial);

    const outerSheathMesh = new THREE.Mesh(
      outerSheathGeo,
      this.laserShaderMaterial,
    );

    // Part 9: Ascending Telemetry Pulse Rings climbing the Skyward Laser Beam
    const pulseRingGeo = new THREE.RingGeometry(0.14, 0.24, 24);
    pulseRingGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      const ringMesh = new THREE.Mesh(pulseRingGeo, cyanEmissive);
      ringMesh.position.y = 1.5 + i * 4.5;
      this.ascendingPulses.push(ringMesh);
      vaultGroup.add(ringMesh);
    }

    this.geometriesToDispose.push(
      plinthGeo,
      plinthEdges,
      collarGeo,
      collarEdges,
      dishGeo,
      ringInnerGeo,
      ringOuterGeo,
      pylonGeo,
      pylonEdges,
      emitterGeo,
      coreBeamGeo,
      outerSheathGeo,
      pulseRingGeo,
    );

    vaultGroup.add(
      plinth,
      collar,
      dish,
      this.beaconRingInner,
      this.beaconRingOuter,
      emitter,
      this.laserCoreMesh,
      outerSheathMesh,
    );
    this.add(vaultGroup);
  }

  /**
   * Builds 900 Twinkling, Luminous Stars using custom GLSL THREE.ShaderMaterial
   * (AdditiveBlending, fog: false) featuring multi-harmonic stellar scintillation,
   * 4-point + diagonal diffraction spikes, and varied stellar blackbody color temperatures
   * across the open night sky past X = +3.22m.
   */
  private buildStarfieldVault(): THREE.ShaderMaterial {
    const starCount = 900;
    const positions = new Float32Array(starCount * 3);
    const phases = new Float32Array(starCount);
    const speeds = new Float32Array(starCount);
    const sizes = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);

    // Authentic stellar color temperatures (O, B, A, F, G, K, M spectral classes + Cyber Cyan)
    const stellarTemperatures = [
      new THREE.Color('#00E5FF'), // Cyber Telemetry Cyan
      new THREE.Color('#93C5FD'), // O-Type 30,000K Blue Supergiant
      new THREE.Color('#E0F2FE'), // B-Type 16,000K Blue-White
      new THREE.Color('#FFFFFF'), // A-Type 9,800K Pure Brilliant White
      new THREE.Color('#FEF9C3'), // F-Type 6,800K Yellow-White
      new THREE.Color('#FDE047'), // G-Type 5,800K Solar Gold
      new THREE.Color('#FDBA74'), // K-Type 4,400K Warm Amber Giant
      new THREE.Color('#818CF8'), // Deep Indigo Pulsar
    ];

    for (let i = 0; i < starCount; i++) {
      let x = 0;
      let y = 0;
      let z = 0;

      if (i < 650) {
        // Primary dense starfield directly past the East Transition Bulkhead (X > +3.22m)
        // from low horizon (y = 0.45m) up to high vault (y = 24m) so stars are richly visible at eye level
        const azimuth = THREE.MathUtils.randFloat(-Math.PI * 0.48, Math.PI * 0.48);
        const elevation = THREE.MathUtils.randFloat(0.02, Math.PI * 0.44);
        const dist = THREE.MathUtils.randFloat(8.5, 36.0);

        x = 3.25 + dist * Math.cos(elevation) * Math.cos(azimuth);
        y = 0.45 + dist * Math.sin(elevation);
        z = dist * Math.cos(elevation) * Math.sin(azimuth);
      } else {
        // Upper night sky vault canopy arching over the exterior & south/north open flanks
        const theta = THREE.MathUtils.randFloat(-Math.PI * 0.85, Math.PI * 0.85);
        const elevation = THREE.MathUtils.randFloat(0.18, Math.PI * 0.48);
        const dist = THREE.MathUtils.randFloat(14.0, 42.0);

        x = 3.22 + dist * Math.cos(elevation) * Math.cos(theta);
        y = 2.2 + dist * Math.sin(elevation);
        z = dist * Math.cos(elevation) * Math.sin(theta);
        // Keep strictly outside the interior bunker box (X < 3.22, Y < 6.8, -5.6 < Z < 5.6)
        if (x < 3.4 && y < 7.2 && Math.abs(z) < 6.0) {
          x = 3.6 + Math.abs(x);
        }
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = THREE.MathUtils.randFloat(1.4, 4.2);
      // Prominent star sizes with occasional bright navigational magnitude-1 stars
      sizes[i] =
        i % 19 === 0
          ? THREE.MathUtils.randFloat(24.0, 36.0)
          : THREE.MathUtils.randFloat(9.0, 20.0);

      const c = stellarTemperatures[i % stellarTemperatures.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    starGeo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.geometriesToDispose.push(starGeo);

    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: {
          value:
            typeof window !== 'undefined'
              ? Math.min(window.devicePixelRatio || 1, 2)
              : 1,
        },
      },
      vertexShader: `
        attribute float aPhase;
        attribute float aSpeed;
        attribute float aSize;
        attribute vec3 aColor;
        varying float vPhase;
        varying float vScintillation;
        varying vec3 vColor;
        uniform float uTime;
        uniform float uPixelRatio;

        void main() {
          vPhase = aPhase;
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          // Multi-harmonic stellar scintillation (3 coupled harmonic oscillators)
          float h1 = sin(uTime * aSpeed + aPhase);
          float h2 = cos(uTime * (aSpeed * 1.73) + aPhase * 2.17);
          float h3 = sin(uTime * (aSpeed * 2.89) - aPhase * 1.31);
          float scintillation = 0.68 + 0.32 * (0.5 * h1 + 0.32 * h2 + 0.18 * h3);
          vScintillation = scintillation;

          float dist = max(-mvPosition.z, 3.5);
          gl_PointSize = clamp(aSize * scintillation * uPixelRatio * (16.0 / dist), 5.0, 44.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vPhase;
        varying float vScintillation;
        varying vec3 vColor;
        uniform float uTime;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;

          // Intense stellar airy disk core
          float core = exp(-dist * 11.0);
          float halo = exp(-dist * 4.2) * 0.42;

          // Primary 4-point orthogonal diffraction spikes
          float spikeH = max(0.0, 1.0 - abs(uv.y) * 26.0) * max(0.0, 1.0 - abs(uv.x) * 2.4);
          float spikeV = max(0.0, 1.0 - abs(uv.x) * 26.0) * max(0.0, 1.0 - abs(uv.y) * 2.4);

          // Secondary 45-degree diagonal diffraction flares
          vec2 diagUv = vec2(
            uv.x * 0.7071 - uv.y * 0.7071,
            uv.x * 0.7071 + uv.y * 0.7071
          );
          float diagA = max(0.0, 1.0 - abs(diagUv.y) * 34.0) * max(0.0, 1.0 - abs(diagUv.x) * 4.2);
          float diagB = max(0.0, 1.0 - abs(diagUv.x) * 34.0) * max(0.0, 1.0 - abs(diagUv.y) * 4.2);

          float spikes = (spikeH + spikeV) * 0.78 + (diagA + diagB) * 0.36;
          float intensity = clamp(core + halo + spikes * vScintillation, 0.0, 1.0);

          // Chromatic temperature shift toward white-hot center
          vec3 finalColor = mix(vColor, vec3(1.0), clamp(core * 0.75, 0.0, 1.0));
          gl_FragColor = vec4(finalColor * (0.95 + 0.45 * vScintillation), intensity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });

    this.materialsToDispose.push(starMat);

    const starPoints = new THREE.Points(starGeo, starMat);
    starPoints.name = 'StarryNightSkyVault';
    starPoints.frustumCulled = false;
    starPoints.renderOrder = -5;
    starPoints.xb = { pointerEvents: 'none' };
    this.add(starPoints);

    return starMat;
  }

  private buildDistrictPerimeters(maxAnisotropy: number): void {
    (Object.keys(SECTOR_DISTRICTS) as SectorType[]).forEach((sectorKey) => {
      const cfg = SECTOR_DISTRICTS[sectorKey];
      const group = new THREE.Group();
      group.name = `District_${sectorKey}`;
      group.xb = { pointerEvents: 'none' };

      const width = cfg.cols * 0.72 + 0.55;
      const depth = 2.6;

      // 1px Swiss Grid perimeter frame
      const halfW = width / 2;
      const halfD = depth / 2;
      const pts = [
        new THREE.Vector3(-halfW, 0.012, -halfD),
        new THREE.Vector3(halfW, 0.012, -halfD),
        new THREE.Vector3(halfW, 0.012, halfD),
        new THREE.Vector3(-halfW, 0.012, halfD),
        new THREE.Vector3(-halfW, 0.012, -halfD),
      ];
      const borderGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const borderMat = new THREE.LineBasicMaterial({
        color: cfg.colorHex,
        transparent: true,
        opacity: 0.55,
      });
      this.geometriesToDispose.push(borderGeo);
      this.materialsToDispose.push(borderMat);

      const borderLine = new THREE.Line(borderGeo, borderMat);
      borderLine.position.set(cfg.centerX, 0, cfg.centerZ);
      group.add(borderLine);

      // District Floor Label Decal (with polygonOffset to avoid Z-fighting)
      const labelTex = this.createDistrictLabelTexture(
        cfg.label.toUpperCase(),
        cfg.vnLabel,
        cfg.cssColor,
        maxAnisotropy,
      );
      const labelGeo = new THREE.PlaneGeometry(width * 0.92, 0.36);
      const labelMat = new THREE.MeshBasicMaterial({
        map: labelTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      this.geometriesToDispose.push(labelGeo);
      this.materialsToDispose.push(labelMat);

      const labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.rotation.x = -Math.PI / 2;
      labelMesh.position.set(cfg.centerX, 0.014, cfg.centerZ + halfD + 0.24);
      group.add(labelMesh);

      this.districtGroups.set(sectorKey, group);
      this.add(group);
    });
  }

  private createDistrictLabelTexture(
    title: string,
    subtitle: string,
    accentCss: string,
    maxAnisotropy: number,
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(9, 9, 11, 0.88)';
    ctx.fillRect(0, 0, 512, 96);

    ctx.strokeStyle = accentCss;
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 508, 92);

    ctx.fillStyle = accentCss;
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, 16, 16);

    ctx.fillStyle = '#D4D4D8';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subtitle, 16, 52);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    this.texturesToDispose.push(tex);
    return tex;
  }

  public setSectorVisibility(selectedSectors: Set<SectorType>): void {
    this.districtGroups.forEach((group, sector) => {
      group.visible = selectedSectors.has(sector);
    });
  }

  public applyTheme(themeId: ThemePreset): void {
    const cfg = THEME_PALETTES[themeId];
    this.floorMaterial.color.setHex(0xffffff);
    this.panelMaterial.color.setHex(cfg.panelHex);
    (this.laserCoreMesh.material as THREE.MeshBasicMaterial).color.setHex(
      cfg.laserHex,
    );
    this.laserShaderMaterial.uniforms.uColorCyan.value.setHex(cfg.laserHex);
  }

  public update(elapsedTime: number): void {
    this.starMaterial.uniforms.uTime.value = elapsedTime;
    this.laserShaderMaterial.uniforms.uTime.value = elapsedTime;
    this.beaconRingInner.rotation.z = elapsedTime * 1.15;
    this.beaconRingOuter.rotation.z = -elapsedTime * 0.75;

    const pulse = 0.78 + 0.22 * Math.sin(elapsedTime * 4.2);
    (this.laserCoreMesh.material as THREE.MeshBasicMaterial).opacity = pulse;

    // Animate telemetry pulse rings ascending into the starry night sky vault
    for (let i = 0; i < this.ascendingPulses.length; i++) {
      const ring = this.ascendingPulses[i];
      const cycle = (elapsedTime * 2.8 + i * 4.5) % 18.0;
      ring.position.y = 1.2 + cycle;
      const scale = 1.0 + cycle * 0.08;
      ring.scale.set(scale, scale, 1);
    }
  }

  public dispose(): void {
    this.geometriesToDispose.forEach((g) => g.dispose());
    this.materialsToDispose.forEach((m) => m.dispose());
    this.texturesToDispose.forEach((t) => t.dispose());
  }
}
