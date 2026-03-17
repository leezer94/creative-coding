/**
 * Runtime params store — seeded from config, updated by Leva.
 * Scene and Sketch read from here so Leva tweaks apply live.
 */

import { create } from 'zustand';
import { COLORS, SCENE, PARTICLES } from '@/config';

export interface ColorsState {
  background: string;
  meshPrimary: string;
  meshSecondary: string;
  meshAccent: string;
  particleR: number;
  particleG: number;
  particleB: number;
  fogNear: number;
  fogFar: number;
}

export interface SceneState {
  mainRotationSpeed: number;
  orbitSpeed: number;
  floatAmplitude: number;
  floatPeriod: number;
  cameraMouseInfluence: number;
  cameraMaxTilt: number;
}

export interface ParticlesState {
  count: number;
  strokeWeight: number;
  maxAlpha: number;
  mouseAttract: number;
  noiseScale: number;
  driftSpeed: number;
  spawnRadiusMin: number;
  spawnRadiusMax: number;
}

export interface ParamsState {
  colors: ColorsState;
  scene: SceneState;
  particles: ParticlesState;
}

export const useParamsStore = create<ParamsState>(() => ({
  colors: { ...COLORS },
  scene: { ...SCENE },
  particles: { ...PARTICLES },
}));
