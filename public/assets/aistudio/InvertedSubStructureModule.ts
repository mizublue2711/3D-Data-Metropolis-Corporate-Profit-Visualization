import * as THREE from 'three';
import { ISceneModule, SceneModuleContext, ModuleMetadata, ModuleState } from './scene-module';

/**
 * ============================================================================
 * ARTIFICIAL CRAFT // ZERO-GRAVITY INVERTED SUB-STRUCTURE MODULE
 * File: InvertedSubStructureModule.ts
 * Architecture: 3D Scene Plugin Contract implementing ISceneModule
 * Purpose: Generates inverted 45° chiseled pyramids and falling pollen particles
 *          beneath the Y=0 datum glass plane.
 * ============================================================================
 */

export class InvertedSubStructureModule implements ISceneModule {
  public readonly metadata: ModuleMetadata = {
    id: 'module_inverted_substructure',
    name: 'Zero-Gravity Inverted Monolith Sub-Structure',
    version: '2.0.0',
    author: 'Lead Creative Technologist',
    description: 'Renders inverted 45° pyramids below Y=0 datum plane with zero-g pollen particles.',
    priority: 20
  };

  public readonly state: ModuleState = {
    isActive: false,
    isInitialized: false,
    isVisible: true
  };

  private rootGroup: THREE.Group = new THREE.Group();
  private particleSystem: THREE.Points | null = null;
  private particlePositions: Float32Array | null = null;
  private particleCount: number = 300;

  private static readonly COLORS = {
    GROUND_VOID: 0x05050A,
    SURFACE_PANEL: 0x0A0C14,
    BORDER_MUTED: 0x1F1F2E,
    ACCENT_CYAN: 0x00E5FF,
    ELECTRIC_INDIGO: 0x5322FF
  };

  public init(ctx: SceneModuleContext): void {
    this.rootGroup.name = 'InvertedSubStructureGroup';

    // 1. Build Inverted 45° Chiseled Pyramids (Y < 0)
    const pyramidGeo = new THREE.ConeGeometry(3.5, 10, 4);
    pyramidGeo.rotateX(Math.PI); // Flip upside down

    const pyramidMat = new THREE.MeshStandardMaterial({
      color: InvertedSubStructureModule.COLORS.SURFACE_PANEL,
      roughness: 0.95,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85
    });

    const wireMat = new THREE.LineBasicMaterial({
      color: InvertedSubStructureModule.COLORS.BORDER_MUTED,
      transparent: true,
      opacity: 0.7
    });

    const positions = [
      { x: -12, y: -6, z: -8 },
      { x: 14, y: -7, z: -10 },
      { x: -5, y: -5, z: 12 },
      { x: 8, y: -8, z: 10 },
      { x: 0, y: -10, z: -15 }
    ];

    positions.forEach((pos, idx) => {
      const pyramidMesh = new THREE.Mesh(pyramidGeo, pyramidMat);
      pyramidMesh.position.set(pos.x, pos.y, pos.z);

      const wireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(pyramidGeo),
        wireMat
      );
      pyramidMesh.add(wireframe);

      // Add 1px Recessed Glowing Sensor Core at the bottom tip
      const coreGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const coreMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? InvertedSubStructureModule.COLORS.ACCENT_CYAN : InvertedSubStructureModule.COLORS.ELECTRIC_INDIGO
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.set(0, -5, 0); // Position at tip
      pyramidMesh.add(coreMesh);

      this.rootGroup.add(pyramidMesh);
    });

    // 2. Build Zero-G Pollen Particle Field
    const particleGeo = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      this.particlePositions[i * 3] = (Math.random() - 0.5) * 50;     // X
      this.particlePositions[i * 3 + 1] = -Math.random() * 20;        // Y (below floor)
      this.particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 50; // Z
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: InvertedSubStructureModule.COLORS.ACCENT_CYAN,
      size: 0.12,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(particleGeo, particleMat);
    this.rootGroup.add(this.particleSystem);

    ctx.scene.add(this.rootGroup);
    this.state.isInitialized = true;
    this.state.isActive = true;
  }

  public update(deltaTime: number, elapsedTime: number): void {
    if (!this.state.isActive || !this.particleSystem || !this.particlePositions) return;

    // Slow oscillation for inverted monoliths
    this.rootGroup.position.y = Math.sin(elapsedTime * 0.5) * 0.15;

    // Slow downward drift for Zero-G pollen particles
    for (let i = 0; i < this.particleCount; i++) {
      this.particlePositions[i * 3 + 1] -= deltaTime * 0.4;
      if (this.particlePositions[i * 3 + 1] < -20) {
        this.particlePositions[i * 3 + 1] = 0;
      }
    }

    (this.particleSystem.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public onResize(width: number, height: number): void {
    // Spatial module viewport adjustment if needed
  }

  public setVisible(visible: boolean): void {
    this.state.isVisible = visible;
    this.rootGroup.visible = visible;
  }

  public dispose(): void {
    this.rootGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }

    this.particlePositions = null;
    this.state.isActive = false;
    this.state.isInitialized = false;
  }
}
