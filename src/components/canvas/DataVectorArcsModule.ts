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
    // Khởi tạo một số đường cong Bezier mẫu nối giữa các điểm 3D
    const sampleConnections = [
      { start: new THREE.Vector3(-25, 0, -25), end: new THREE.Vector3(25, 0, 25), controlY: 20 },
      { start: new THREE.Vector3(30, 0, -20), end: new THREE.Vector3(-20, 0, 30), controlY: 25 },
    ];

    const arcMat = new THREE.LineBasicMaterial({ color: 0x5322ff, transparent: true, opacity: 0.5 });
    this.materialsToDispose.push(arcMat);

    sampleConnections.forEach((conn, idx) => {
      const midPoint = new THREE.Vector3()
        .addVectors(conn.start, conn.end)
        .multiplyScalar(0.5);
      midPoint.y += conn.controlY;

      const curve = new THREE.QuadraticBezierCurve3(conn.start, midPoint, conn.end);
      this.curves.push(curve);
      this.pulseProgress.push(idx * 0.5);

      const points = curve.getPoints(32);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      this.geometriesToDispose.push(lineGeo);

      const line = new THREE.Line(lineGeo, arcMat);
      this.group.add(line);
    });

    // Dựng InstancedMesh cho các xung hạt năng lượng
    const pulseGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    this.geometriesToDispose.push(pulseGeo);
    this.materialsToDispose.push(pulseMat);

    this.pulseMesh = new THREE.InstancedMesh(pulseGeo, pulseMat, this.curves.length);
    this.group.add(this.pulseMesh);

    scene.add(this.group);
  }

  public update(deltaTime: number, _elapsedTime: number): void {
    if (!this.pulseMesh) return;
    const dummy = new THREE.Object3D();
    this.curves.forEach((curve, i) => {
      this.pulseProgress[i] = (this.pulseProgress[i] + deltaTime * 0.4) % 1;
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
