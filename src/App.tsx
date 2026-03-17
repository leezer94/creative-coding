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

export default function App() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* 3D layer — React Three Fiber */}
      <Scene />

      {/* 2D overlay — p5.js */}
      <Sketch />
    </div>
  );
}
