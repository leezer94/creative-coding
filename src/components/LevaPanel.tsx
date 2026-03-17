/**
 * LevaPanel.tsx
 *
 * Runtime tweak panel — syncs Leva controls to the params store.
 * Scene and Sketch read from the store, so changes apply live.
 */

import { useControls } from 'leva';
import { useParamsStore } from '@/store';

const initial = () => useParamsStore.getState();

export default function LevaPanel() {
  useControls(
    {
      Colors: {
        background: initial().colors.background,
        meshPrimary: initial().colors.meshPrimary,
        meshSecondary: initial().colors.meshSecondary,
        meshAccent: initial().colors.meshAccent,
        particleR: { value: initial().colors.particleR, min: 0, max: 255 },
        particleG: { value: initial().colors.particleG, min: 0, max: 255 },
        particleB: { value: initial().colors.particleB, min: 0, max: 255 },
        fogNear: { value: initial().colors.fogNear, min: 0, max: 20 },
        fogFar: { value: initial().colors.fogFar, min: 5, max: 30 },
      },
      Scene: {
        mainRotationSpeed: { value: initial().scene.mainRotationSpeed, min: 0, max: 2 },
        orbitSpeed: { value: initial().scene.orbitSpeed, min: 0, max: 1 },
        floatAmplitude: { value: initial().scene.floatAmplitude, min: 0, max: 1 },
        floatPeriod: { value: initial().scene.floatPeriod, min: 1, max: 10 },
        cameraMouseInfluence: {
          value: initial().scene.cameraMouseInfluence,
          min: 0,
          max: 0.3,
        },
        cameraMaxTilt: { value: initial().scene.cameraMaxTilt, min: 0, max: 1 },
      },
      Particles: {
        count: { value: initial().particles.count, min: 10, max: 300 },
        strokeWeight: { value: initial().particles.strokeWeight, min: 0.5, max: 3 },
        maxAlpha: { value: initial().particles.maxAlpha, min: 50, max: 255 },
        mouseAttract: { value: initial().particles.mouseAttract, min: 0, max: 0.05 },
        noiseScale: { value: initial().particles.noiseScale, min: 0.001, max: 0.02 },
        driftSpeed: { value: initial().particles.driftSpeed, min: 0.2, max: 3 },
        spawnRadiusMin: { value: initial().particles.spawnRadiusMin, min: 0, max: 200 },
        spawnRadiusMax: { value: initial().particles.spawnRadiusMax, min: 100, max: 500 },
      },
    },
    {
      onChange: (v) => {
        if (v.Colors)
          useParamsStore.setState((s) => ({ colors: { ...s.colors, ...v.Colors } }));
        if (v.Scene)
          useParamsStore.setState((s) => ({ scene: { ...s.scene, ...v.Scene } }));
        if (v.Particles)
          useParamsStore.setState((s) => ({ particles: { ...s.particles, ...v.Particles } }));
      },
    }
  );
  return null;
}
