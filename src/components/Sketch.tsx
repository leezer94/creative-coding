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
import { COLORS, PARTICLES } from '../config';

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
// Kept as a plain function so it stays self-contained and easy to read.

function createSketch(container: HTMLElement) {
  return (p: p5) => {
    const particles: Particle[] = [];

    /** Spawn a new particle at a random position relative to canvas center */
    function spawnParticle(w: number, h: number): Particle {
      const angle = p.random(Math.PI * 2);
      const r = p.random(PARTICLES.spawnRadiusMin, PARTICLES.spawnRadiusMax);
      return {
        x: w / 2 + Math.cos(angle) * r,
        y: h / 2 + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        alpha: p.random(40, PARTICLES.maxAlpha),
        size: p.random(1.5, 4.5),
        noiseOffsetX: p.random(1000),
        noiseOffsetY: p.random(1000),
      };
    }

    p.setup = () => {
      const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
      canvas.parent(container);
      // Make this canvas transparent and non-interactive (pointer events handled by R3F)
      const el = canvas.elt as HTMLCanvasElement;
      el.style.position = 'absolute';
      el.style.inset = '0';
      el.style.pointerEvents = 'none';

      for (let i = 0; i < PARTICLES.count; i++) {
        particles.push(spawnParticle(p.width, p.height));
      }
    };

    p.draw = () => {
      // Transparent clear — trails fade naturally
      p.background(7, 11, 20, 28);

      const mx = p.mouseX;
      const my = p.mouseY;
      const t = p.frameCount * PARTICLES.noiseScale * 80;

      for (const pt of particles) {
        // ── Noise-based drift ──────────────────────────────────────────────
        const nx = p.noise(pt.noiseOffsetX, pt.noiseOffsetY, t) * 2 - 1;
        const ny = p.noise(pt.noiseOffsetX + 500, pt.noiseOffsetY + 500, t) * 2 - 1;
        pt.vx += nx * PARTICLES.driftSpeed * 0.15;
        pt.vy += ny * PARTICLES.driftSpeed * 0.15;

        // ── Mouse attraction ───────────────────────────────────────────────
        const dx = mx - pt.x;
        const dy = my - pt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < 280) {
          pt.vx += (dx / dist) * PARTICLES.mouseAttract;
          pt.vy += (dy / dist) * PARTICLES.mouseAttract;
        }

        // ── Damping ────────────────────────────────────────────────────────
        pt.vx *= 0.92;
        pt.vy *= 0.92;

        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.noiseOffsetX += PARTICLES.noiseScale;
        pt.noiseOffsetY += PARTICLES.noiseScale;

        // ── Wrap around edges ──────────────────────────────────────────────
        if (pt.x < -20) pt.x = p.width + 20;
        if (pt.x > p.width + 20) pt.x = -20;
        if (pt.y < -20) pt.y = p.height + 20;
        if (pt.y > p.height + 20) pt.y = -20;

        // ── Draw ───────────────────────────────────────────────────────────
        p.noFill();
        p.strokeWeight(pt.size * PARTICLES.strokeWeight);
        p.stroke(COLORS.particleR, COLORS.particleG, COLORS.particleB, pt.alpha);
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
    // Create the p5 instance, passing the container element as the mount target
    p5Ref.current = new p5(createSketch(containerRef.current));

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
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
}
