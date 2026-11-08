import * as THREE from 'three';

export interface ISceneModule {
  id: string;
  init(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void;
  update(deltaTime: number, elapsedTime: number): void;
  onResize(width: number, height: number): void;
  dispose(): void;
}
