import { create } from 'zustand';
import { FLUID } from '@/config';

export type CameraPermission =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'error';

export interface CameraState {
  permission: CameraPermission;
  message: string;
  ready: boolean;
}

/** One hand slot: position/speed in normalized screen space (0–1), mirrored for webcam. */
export interface SingleHandState {
  detected: boolean;
  confidence: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  speed: number;
}

export interface HandsState {
  left: SingleHandState;
  right: SingleHandState;
}

export interface FluidState {
  revealLevel: number;
  blurPx: number;
}

export interface ParamsState {
  fluid: typeof FLUID;
  camera: CameraState;
  hands: HandsState;
  fluidState: FluidState;
}

function initialHand(): SingleHandState {
  return {
    detected: false,
    confidence: 0,
    x: 0.5,
    y: 0.5,
    velocityX: 0,
    velocityY: 0,
    speed: 0,
  };
}

export const useParamsStore = create<ParamsState>(() => ({
  fluid: { ...FLUID },
  camera: {
    permission: 'idle',
    message: 'Camera is idle.',
    ready: false,
  },
  hands: {
    left: initialHand(),
    right: initialHand(),
  },
  fluidState: {
    revealLevel: 0,
    blurPx: FLUID.blurPx,
  },
}));
