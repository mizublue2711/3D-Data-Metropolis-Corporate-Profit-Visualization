import * as THREE from 'three';
import { ISceneModule, SceneModuleContext, ModuleMetadata, ModuleState } from './scene-module';

/**
 * ============================================================================
 * ARTIFICIAL CRAFT // PARABOLIC DATA VECTOR ARCS MODULE
 * File: DataVectorArcsModule.ts
 * Architecture: 3D Scene Plugin Contract implementing ISceneModule
 * Purpose: Renders parabolic Bezier vector arcs connecting data monoliths
 *          with moving energy pulse particles.
 * ============================================================================
 */

export interface ArcConnection {
  start: THREE.Vector3;
  end: THREE.Vector3;
  colorHex?: number;
}

export class DataVectorArcsModule implements ISceneModule {
  public readonly metadata: ModuleMetadata = {
    id: 'module_vector_arcs',
    name: 'Parabolic Data Vector Arcs Engine',
    version: '2.0.0',
    author: 'Lead Creative Technologist',
    description: 'Generates curved parabolic vector arcs and traveling particle pulses between 3D data nodes.',
    priority: 30
  };

  public readonly state: ModuleState = {
    isActive: false,
    isInitialized: false,
    isVisible: true
  };

  private rootGroup: THREE.Group = new THREE.Group();
  private pulsePoints: THREE.Points[] = [];
  private pulseCurves: THREE.QuadraticBezierCurve3[] = [];
  private pulseProgress: number[] = [];

  private static readonly NEON_CYAN = 0x00E5FF;
  private static readonly ELECTRIC_INDIGO = 0x5322FF;

  public init(ctx: SceneModuleContext): void {
    this.rootGroup.name = 'DataVectorArcsGroup';

    // Preset data node connections (e.g. HAG -> FPT, VNM -> VHM, HPG -> TCB)
    const connections: ArcConnection[] = [
      { start: new THREE.Vector3(-4, 0, 2), end: new THREE.Vector3(4, 0, -2), colorHex: DataVectorArcsModule.NEON_CYAN },
      { start: new THREE.Vector3(4, 0, -2), end: new THREE.Vector3(2, 0, 5), colorHex: DataVectorArcsModule.ELECTRIC_INDIGO },
      { start: new THREE.Vector3(-2, 0, -4), end: new THREE.Vector3(-4, 0, 2), colorHex: DataVectorArcsModule.NEON_CYAN }
    ];

    connections.forEach((conn) => {
      this.createParabolicArc(conn.start, conn.end, conn.colorHex || DataVectorArcsModule.NEON_CYAN);
    });

    ctx.scene.add(this.rootGroup);
    this.state.isInitialized = true;
    this.state.isActive = true;
  }

  private createParabolicArc(start: THREE.Vector3, end: THREE.Vector3, colorHex: number): void {
    const midPoint = new THREE.Vector3(
      (start.x + end.x) / 2,
      Math.max(start.y, end.y) + 3.5, // Parabolic height offset
      (start.z + end.z) / 2
    );

    const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
    const points = curve.getPoints(30);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const lineMat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.55
    });

    const lineMesh = new THREE.Line(geometry, lineMat);
    this.rootGroup.add(lineMesh);

    // Particle Pulse along the arc
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([start.x, start.y, start.z]), 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.25,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const pulse = new THREE.Points(particleGeo, particleMat);
    this.rootGroup.add(pulse);

    this.pulsePoints.push(pulse);
    this.pulseCurves.push(curve);
    this.pulseProgress.push(Math.random());
  }

  public update(deltaTime: number, elapsedTime: number): void {
    if (!this.state.isActive) return;

    for (let i = 0; i < this.pulsePoints.length; i++) {
      this.pulseProgress[i] += deltaTime * 0.4;
      if (this.pulseProgress[i] > 1.0) {
        this.pulseProgress[i] = 0;
      }

      const point = this.pulseCurves[i].getPoint(this.pulseProgress[i]);
      const posAttr = this.pulsePoints[i].geometry.attributes.position as THREE.BufferAttribute;
      posAttr.setXYZ(0, point.x, point.y, point.z);
      posAttr.needsUpdate = true;
    }
  }

  public onResize(width: number, height: number): void {}

  public setVisible(visible: boolean): void {
    this.state.isVisible = visible;
    this.rootGroup.visible = visible;
  }

  public dispose(): void {
    this.rootGroup.traverse((obj) => {
      if (obj instanceof THREE.Line || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }

    this.pulsePoints = [];
    this.pulseCurves = [];
    this.pulseProgress = [];
    this.state.isActive = false;
    this.state.isInitialized = false;
  }
}
