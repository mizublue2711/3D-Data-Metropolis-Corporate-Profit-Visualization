import * as THREE from 'three';
import { ISceneModule } from '@/types/scene-module';

export class InvertedSubStructureModule implements ISceneModule {
  public id = 'InvertedSubStructureModule';
  private group: THREE.Group = new THREE.Group();
  private particles: THREE.Points | null = null;
  private particleGeo: THREE.BufferGeometry | null = null;
  private particleMat: THREE.PointsMaterial | null = null;
  private geometriesToDispose: THREE.BufferGeometry[] = [];
  private materialsToDispose: THREE.Material[] = [];

  public init(scene: THREE.Scene, _camera: THREE.PerspectiveCamera): void {
    // 1. Spawning 45° Inverted Pyramids below the glass floor (Y < 0)
    const pyramidPositions = [
      new THREE.Vector3(0, -2.5, 0),
      new THREE.Vector3(-4.5, -2.0, -3.5),
      new THREE.Vector3(4.5, -2.2, 3.5),
      new THREE.Vector3(-3.5, -1.8, 3.5),
      new THREE.Vector3(3.5, -2.0, -3.5),
    ];

    const pyramidGeo = new THREE.ConeGeometry(2.4, 3.6, 4);
    pyramidGeo.rotateX(Math.PI); // Invert apex to point down (-Y)
    this.geometriesToDispose.push(pyramidGeo);

    const pyramidMat = new THREE.MeshBasicMaterial({
      color: 0x0a0c14,
      wireframe: true,
      wireframeLinewidth: 1,
    });
    this.materialsToDispose.push(pyramidMat);

    // 1px Glowing Sensor Core at each apex
    const sensorGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const sensorMatCyan = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const sensorMatIndigo = new THREE.MeshBasicMaterial({ color: 0x5322ff });
    this.geometriesToDispose.push(sensorGeo);
    this.materialsToDispose.push(sensorMatCyan, sensorMatIndigo);

    pyramidPositions.forEach((pos, idx) => {
      const pyramidMesh = new THREE.Mesh(pyramidGeo, pyramidMat);
      pyramidMesh.position.copy(pos);
      this.group.add(pyramidMesh);

      const sensorMesh = new THREE.Mesh(
        sensorGeo,
        idx % 2 === 0 ? sensorMatCyan : sensorMatIndigo,
      );
      // Position at inverted apex (base is at Y=0, apex is at Y = pos.y - 1.8)
      sensorMesh.position.set(pos.x, pos.y - 1.8, pos.z);
      this.group.add(sensorMesh);
    });

    // 2. Cyber Pollen Particles falling slowly along -Y through Datum Glass Floor
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 18;
      positions[i + 1] = Math.random() * 8; // Start from Y in [0, 8]
      positions[i + 2] = (Math.random() - 0.5) * 18;
    }

    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    );
    this.geometriesToDispose.push(this.particleGeo);

    this.particleMat = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.065,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.materialsToDispose.push(this.particleMat);

    this.particles = new THREE.Points(this.particleGeo, this.particleMat);
    this.group.add(this.particles);

    scene.add(this.group);
  }

  public update(deltaTime: number, _elapsedTime: number): void {
    if (!this.particles || !this.particleGeo) return;
    const pos = this.particleGeo.attributes.position as THREE.BufferAttribute;
    const array = pos.array as Float32Array;
    for (let i = 1; i < array.length; i += 3) {
      array[i] -= deltaTime * 0.85; // Fall slowly along -Y
      if (array[i] < -4.5) {
        array[i] = 7.5; // Loop back from high altitude
      }
    }
    pos.needsUpdate = true;
  }

  public onResize(_width: number, _height: number): void {}

  public dispose(): void {
    this.geometriesToDispose.forEach((g) => g.dispose());
    this.materialsToDispose.forEach((m) => m.dispose());
    this.group.clear();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
