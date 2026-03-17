/**
 * Sketch.tsx
 *
 * p5.js instance-mode component rendered as a transparent canvas overlay.
 *
 * Responsibilities:
 *   - 2D generative particle layer on top of the 3D scene
 *   - Perlin-noise drift for each particle
 *   - Subtle mouse attraction
 *   - Resize handling
 *   - Clean teardown on unmount
 *
 * Three.js / React Three Fiber is NOT used here.
 */

import { useEffect, useRef } from 'react';
import p5 from 'p5';
import { useParamsStore, type ParamsState } from '../store';

// ─── Particle data ────────────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
}

// ─── Sketch factory ───────────────────────────────────────────────────────────
// getParams() returns current store state so Leva tweaks apply live in draw.

function createSketch(container: HTMLElement, getParams: () => ParamsState) {
  return (p: p5) => {
    const particles: Particle[] = [];

    function spawnParticle(w: number, h: number, params: ParamsState['particles']): Particle {
      const angle = p.random(Math.PI * 2);
      const r = p.random(params.spawnRadiusMin, params.spawnRadiusMax);
      return {
        x: w / 2 + Math.cos(angle) * r,
        y: h / 2 + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        alpha: p.random(40, params.maxAlpha),
        size: p.random(1.5, 4.5),
        noiseOffsetX: p.random(1000),
        noiseOffsetY: p.random(1000),
      };
    }

    p.setup = () => {
      const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
      canvas.parent(container);
      const el = canvas.elt as HTMLCanvasElement;
      el.style.position = 'absolute';
      el.style.inset = '0';
      el.style.pointerEvents = 'none';

      const { particles: pParams } = getParams();
      for (let i = 0; i < pParams.count; i++) {
        particles.push(spawnParticle(p.width, p.height, pParams));
      }
    };

    p.draw = () => {
      p.background(7, 11, 20, 28);

      const { colors, particles: pParams } = getParams();
      const mx = p.mouseX;
      const my = p.mouseY;
      const t = p.frameCount * pParams.noiseScale * 80;

      for (const pt of particles) {
        const nx = p.noise(pt.noiseOffsetX, pt.noiseOffsetY, t) * 2 - 1;
        const ny = p.noise(pt.noiseOffsetX + 500, pt.noiseOffsetY + 500, t) * 2 - 1;
        pt.vx += nx * pParams.driftSpeed * 0.15;
        pt.vy += ny * pParams.driftSpeed * 0.15;

        const dx = mx - pt.x;
        const dy = my - pt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < 280) {
          pt.vx += (dx / dist) * pParams.mouseAttract;
          pt.vy += (dy / dist) * pParams.mouseAttract;
        }

        pt.vx *= 0.92;
        pt.vy *= 0.92;

        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.noiseOffsetX += pParams.noiseScale;
        pt.noiseOffsetY += pParams.noiseScale;

        if (pt.x < -20) pt.x = p.width + 20;
        if (pt.x > p.width + 20) pt.x = -20;
        if (pt.y < -20) pt.y = p.height + 20;
        if (pt.y > p.height + 20) pt.y = -20;

        p.noFill();
        p.strokeWeight(pt.size * pParams.strokeWeight);
        p.stroke(colors.particleR, colors.particleG, colors.particleB, pt.alpha);
        p.point(pt.x, pt.y);
      }
    };

    p.windowResized = () => {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
    };
  };
}

// ─── React component ──────────────────────────────────────────────────────────

export default function Sketch() {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<p5 | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const getParams = () => useParamsStore.getState();
    p5Ref.current = new p5(createSketch(containerRef.current, getParams));

    return () => {
      // Cleanly remove the p5 sketch (removes canvas + stops draw loop)
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
}
