import * as THREE from 'three';
import { InvertedSubStructureModule } from '@/components/canvas/InvertedSubStructureModule';
import { DataVectorArcsModule } from '@/components/canvas/DataVectorArcsModule';
import { ISceneModule } from '@/types/scene-module';

export class PresentationEngine {
  private scene: THREE.Scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  private renderer: THREE.WebGLRenderer | null = null;
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private modules: ISceneModule[] = [];
  private datumGlassFloor: THREE.Mesh | null = null;

  public init(container: HTMLElement): void {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 30, 80);
    this.camera.lookAt(0, 0, 0);

    this.scene.background = new THREE.Color('#05050A');

    // 1. Phủ sương mù thể tích
    this.scene.fog = new THREE.FogExp2('#05050A', 0.012);

    // 2. Dựng sàn kính Datum Glass (Y = 0)
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x0a0c14,
      transparent: true,
      opacity: 0.35,
      depthWrite: false, // Tránh lỗi che lấp khối âm Y < 0
    });
    this.datumGlassFloor = new THREE.Mesh(floorGeo, floorMat);
    this.datumGlassFloor.rotation.x = -Math.PI / 2;
    this.datumGlassFloor.position.y = 0;
    this.scene.add(this.datumGlassFloor);

    // 3. Đăng ký & init các Module 3D mới
    const subStructureModule = new InvertedSubStructureModule();
    subStructureModule.init(this.scene, this.camera);
    this.modules.push(subStructureModule);

    const vectorArcsModule = new DataVectorArcsModule();
    vectorArcsModule.init(this.scene, this.camera);
    this.modules.push(vectorArcsModule);

    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.animate);
    window.addEventListener('resize', this.onWindowResize);
  }

  private onWindowResize = (): void => {
    if (!this.renderer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.modules.forEach((mod) => mod.onResize?.(width, height));
  };

  private animate = (timestamp: number): void => {
    const deltaTime = (timestamp - this.lastTime) / 1000;
    const elapsedTime = timestamp / 1000;
    this.lastTime = timestamp;

    // Cập nhật vòng lặp cho tất cả Module
    this.modules.forEach((mod) => mod.update(deltaTime, elapsedTime));

    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    window.removeEventListener('resize', this.onWindowResize);

    // Giải phóng bộ nhớ của tất cả các Module
    this.modules.forEach((mod) => mod.dispose());
    this.modules = [];

    if (this.datumGlassFloor) {
      this.datumGlassFloor.geometry.dispose();
      (this.datumGlassFloor.material as THREE.Material).dispose();
      this.scene.remove(this.datumGlassFloor);
      this.datumGlassFloor = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
  }
}
