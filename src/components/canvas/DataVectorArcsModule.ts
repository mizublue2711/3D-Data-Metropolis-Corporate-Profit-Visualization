import * as THREE from 'three';
import { ISceneModule } from '@/types/scene-module';

export class DataVectorArcsModule implements ISceneModule {
  public id = 'DataVectorArcsModule';
  private group: THREE.Group = new THREE.Group();
  private pulseMesh: THREE.InstancedMesh | null = null;
  private curves: THREE.QuadraticBezierCurve3[] = [];
  private pulseProgress: number[] = [];
  private geometriesToDispose: THREE.BufferGeometry[] = [];
  private materialsToDispose: THREE.Material[] = [];

  public init(scene: THREE.Scene, _camera: THREE.PerspectiveCamera): void {
    // Inter-district financial sector connectivity Bezier arcs
    const connections = [
      { start: new THREE.Vector3(-2.8, 1.2, -2.4), end: new THREE.Vector3(2.6, 1.0, 2.2), controlY: 2.8 },
      { start: new THREE.Vector3(3.2, 0.8, -1.8), end: new THREE.Vector3(-3.5, 1.1, 1.5), controlY: 3.2 },
      { start: new THREE.Vector3(0.0, 1.4, 2.0), end: new THREE.Vector3(-2.5, 1.2, -2.2), controlY: 2.5 },
      { start: new THREE.Vector3(2.5, 0.9, 2.5), end: new THREE.Vector3(3.0, 1.1, -1.5), controlY: 2.9 },
    ];

    const arcMat = new THREE.LineBasicMaterial({
      color: 0x5322ff,
      transparent: true,
      opacity: 0.6,
    });
    this.materialsToDispose.push(arcMat);

    connections.forEach((conn, idx) => {
      const midPoint = new THREE.Vector3()
        .addVectors(conn.start, conn.end)
        .multiplyScalar(0.5);
      midPoint.y += conn.controlY;

      const curve = new THREE.QuadraticBezierCurve3(conn.start, midPoint, conn.end);
      this.curves.push(curve);
      this.pulseProgress.push(idx * 0.25);

      const points = curve.getPoints(36);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      this.geometriesToDispose.push(lineGeo);

      const line = new THREE.Line(lineGeo, arcMat);
      this.group.add(line);
    });

    // Instanced energy pulses along Bezier arcs
    const pulseGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    this.geometriesToDispose.push(pulseGeo);
    this.materialsToDispose.push(pulseMat);

    this.pulseMesh = new THREE.InstancedMesh(
      pulseGeo,
      pulseMat,
      this.curves.length,
    );
    this.group.add(this.pulseMesh);

    scene.add(this.group);
  }

  public update(deltaTime: number, _elapsedTime: number): void {
    if (!this.pulseMesh) return;
    const dummy = new THREE.Object3D();
    this.curves.forEach((curve, i) => {
      this.pulseProgress[i] = (this.pulseProgress[i] + deltaTime * 0.35) % 1;
      const pos = curve.getPoint(this.pulseProgress[i]);
      dummy.position.copy(pos);
      dummy.updateMatrix();
      this.pulseMesh!.setMatrixAt(i, dummy.matrix);
    });
    this.pulseMesh.instanceMatrix.needsUpdate = true;
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
