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
    // 1. Dựng khối kim tự tháp mọc ngược âm (Y < 0)
    const geo = new THREE.ConeGeometry(40, 60, 4);
    geo.rotateX(Math.PI); // Quay ngược đỉnh hướng xuống -Y
    this.geometriesToDispose.push(geo);

    const mat = new THREE.MeshBasicMaterial({
      color: 0x0a0c14,
      wireframe: true,
      wireframeLinewidth: 1,
    });
    this.materialsToDispose.push(mat);

    const pyramidMesh = new THREE.Mesh(geo, mat);
    pyramidMesh.position.set(0, -30, 0);
    this.group.add(pyramidMesh);

    // 2. Dựng hạt Cyber Pollen rơi dọc trục -Y
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100;
      positions[i + 1] = Math.random() * 50; // Xuất phát từ Y >= 0
      positions[i + 2] = (Math.random() - 0.5) * 100;
    }

    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometriesToDispose.push(this.particleGeo);

    this.particleMat = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.8,
      transparent: true,
      opacity: 0.65,
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
      array[i] -= deltaTime * 12; // Hạt rơi dọc trục -Y
      if (array[i] < -40) {
        array[i] = 40; // Loop lại từ trên cao
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
