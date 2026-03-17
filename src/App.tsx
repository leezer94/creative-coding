/**
 * App.tsx
 *
 * App shell — composes the 3D scene and the 2D p5 overlay.
 *
 * Layout:
 *   - A full-viewport container holds both layers stacked via position: absolute.
 *   - Scene (React Three Fiber) renders underneath.
 *   - Sketch (p5.js) renders on top as a transparent overlay.
 *
 * Mouse events land on the R3F canvas; the p5 canvas has pointer-events: none
 * so it reads window.mouseX/mouseY without blocking the 3D interaction.
 */

import Scene from './components/Scene';
import Sketch from './components/Sketch';
import LevaPanel from './components/LevaPanel';
import { useParamsStore, type ParamsState } from './store';

export default function App() {
  const particleCount = useParamsStore((s: ParamsState) => s.particles.count);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <LevaPanel />
      <Scene />
      <Sketch key={particleCount} />
    </div>
  );
}
