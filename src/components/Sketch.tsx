import { useEffect, useRef } from 'react';
import p5 from 'p5';
import { HAND_VISUAL } from '@/config';
import { useParamsStore, type ParamsState, type SingleHandState } from '@/store';

function createSketch(container: HTMLElement) {
  return (p: p5) => {
    let fieldWidth = 0;
    let fieldHeight = 0;
    let currentField = new Float32Array(0);
    let nextField = new Float32Array(0);
    let fieldImage: p5.Image;
    let revealLevel = 0;

    function index(x: number, y: number): number {
      return y * fieldWidth + x;
    }

    function resizeField(): void {
      const fluid = useParamsStore.getState().fluid;
      fieldWidth = Math.max(40, Math.floor(container.clientWidth * fluid.fieldScale));
      fieldHeight = Math.max(24, Math.floor(container.clientHeight * fluid.fieldScale));
      currentField = new Float32Array(fieldWidth * fieldHeight);
      nextField = new Float32Array(fieldWidth * fieldHeight);
      fieldImage = p.createImage(fieldWidth, fieldHeight);
    }

    function depositFromHand(h: SingleHandState, fluid: ParamsState['fluid']): void {
      if (!h.detected) return;
      const cx = h.x * fieldWidth;
      const cy = h.y * fieldHeight;
      const radius = Math.max(3, fluid.depositRadius * Math.min(fieldWidth, fieldHeight));
      const speedBoost = 1 + h.speed * fluid.velocityInfluence * 40;
      disturbField(cx, cy, radius, fluid.depositStrength * speedBoost * 0.08);
    }

    function disturbField(
      centerX: number,
      centerY: number,
      radius: number,
      amount: number
    ): void {
      const minX = Math.max(0, Math.floor(centerX - radius));
      const maxX = Math.min(fieldWidth - 1, Math.ceil(centerX + radius));
      const minY = Math.max(0, Math.floor(centerY - radius));
      const maxY = Math.min(fieldHeight - 1, Math.ceil(centerY + radius));
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.hypot(dx, dy);
          if (dist > radius) continue;
          const falloff = 1 - dist / radius;
          const id = index(x, y);
          currentField[id] = Math.min(1, currentField[id] + amount * falloff);
        }
      }
    }

    function simulateField(): void {
      const { fluid } = useParamsStore.getState();
      for (let y = 1; y < fieldHeight - 1; y += 1) {
        for (let x = 1; x < fieldWidth - 1; x += 1) {
          const id = index(x, y);
          const center = currentField[id];
          const left = currentField[index(x - 1, y)];
          const right = currentField[index(x + 1, y)];
          const top = currentField[index(x, y - 1)];
          const bottom = currentField[index(x, y + 1)];
          const diffusion = (left + right + top + bottom) * 0.25;
          const advected =
            center * fluid.advectionDrag + (diffusion - center) * fluid.diffusion;
          nextField[id] = p.constrain(advected * fluid.decay, 0, 1);
        }
      }
      const swap = currentField;
      currentField = nextField;
      nextField = swap;
    }

    /**
     * Sharp radial marks at each fingertip (drawn after fluid blur) so hand position reads clearly
     * without turning into a game-style cursor; alpha scales with Landmarker confidence.
     */
    function drawFingertipGlyph(
      screenX: number,
      screenY: number,
      rgb: readonly [number, number, number],
      confidence: number
    ): void {
      const v = HAND_VISUAL;
      const strength = p.constrain(0.45 + confidence * 0.55, 0.45, 1);
      const ctx = p.drawingContext as CanvasRenderingContext2D;
      const layers: Array<{ r: number; a: number }> = [
        { r: v.outerRadiusPx, a: v.outerAlpha * strength },
        { r: v.midRadiusPx, a: v.midAlpha * strength },
        { r: v.coreRadiusPx, a: v.coreAlpha * strength },
      ];
      for (const { r, a } of layers) {
        const grad = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, r);
        grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
        grad.addColorStop(0.55, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.35})`);
        grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(screenX, screenY, r, 0, p.TWO_PI);
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${v.ringAlpha * strength})`;
      ctx.lineWidth = v.ringWeightPx;
      ctx.beginPath();
      ctx.arc(screenX, screenY, v.midRadiusPx, 0, p.TWO_PI);
      ctx.stroke();
    }

    function drawField(): void {
      fieldImage.loadPixels();
      let sum = 0;
      for (let y = 0; y < fieldHeight; y += 1) {
        for (let x = 0; x < fieldWidth; x += 1) {
          const id = index(x, y);
          const v = currentField[id];
          sum += v;
          const i4 = id * 4;
          // Use a narrow tonal range to keep the piece restrained rather than flashy.
          fieldImage.pixels[i4 + 0] = 150 + v * 55;
          fieldImage.pixels[i4 + 1] = 175 + v * 35;
          fieldImage.pixels[i4 + 2] = 210 + v * 20;
          fieldImage.pixels[i4 + 3] = 12 + v * 180;
        }
      }
      fieldImage.updatePixels();
      const avg = sum / currentField.length;
      revealLevel = p.lerp(
        revealLevel,
        p.constrain(avg * 2.2, 0, 1),
        useParamsStore.getState().fluid.settleLerp
      );
      useParamsStore.setState((s) => ({
        fluidState: {
          revealLevel: revealLevel * s.fluid.revealGain,
          blurPx: s.fluid.blurPx * (1 - p.constrain(revealLevel * 0.9, 0, 0.9)),
        },
      }));
    }

    p.setup = () => {
      const canvas = p.createCanvas(container.clientWidth, container.clientHeight, p.P2D);
      canvas.parent(container);
      const el = canvas.elt as HTMLCanvasElement;
      el.style.position = 'absolute';
      el.style.inset = '0';
      el.style.pointerEvents = 'none';
      el.style.mixBlendMode = 'screen';
      resizeField();
    };

    p.draw = () => {
      const { hands, fluid } = useParamsStore.getState();
      p.clear();

      if (hands.left.detected) depositFromHand(hands.left, fluid);
      if (hands.right.detected) depositFromHand(hands.right, fluid);
      if (!hands.left.detected && !hands.right.detected) {
        revealLevel *= 0.985;
      }

      simulateField();
      drawField();

      p.push();
      p.imageMode(p.CORNER);
      p.tint(255, fluid.glowAlpha * 255);
      const ctx = p.drawingContext as CanvasRenderingContext2D;
      ctx.filter = `blur(${fluid.blurPx}px)`;
      p.image(fieldImage, 0, 0, p.width, p.height);
      ctx.filter = 'none';
      p.pop();

      if (hands.left.detected) {
        drawFingertipGlyph(
          hands.left.x * p.width,
          hands.left.y * p.height,
          HAND_VISUAL.leftRgb,
          hands.left.confidence
        );
      }
      if (hands.right.detected) {
        drawFingertipGlyph(
          hands.right.x * p.width,
          hands.right.y * p.height,
          HAND_VISUAL.rightRgb,
          hands.right.confidence
        );
      }
    };

    p.windowResized = () => {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
      resizeField();
    };
  };
}

export default function Sketch() {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<p5 | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    p5Ref.current = new p5(createSketch(containerRef.current));

    return () => {
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
