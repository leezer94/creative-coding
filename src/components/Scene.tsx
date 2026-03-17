/**
 * Scene.tsx
 *
 * React Three Fiber 3D scene.
 *
 * Responsibilities:
 *   - Camera setup and mouse-driven tilt
 *   - Ambient, directional, and point lights
 *   - Animated 3D meshes (torus knot + orbiting icosahedra)
 *   - Fog for depth
 *
 * p5 is NOT used here.
 */

import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS, SCENE } from '../config';

// ─── Camera rig ───────────────────────────────────────────────────────────────

function CameraRig() {
  const { gl } = useThree();
  const target = useRef(new THREE.Vector2(0, 0));

  // Attach mouse listener once via useEffect — not inside useFrame
  useEffect(() => {
    const domEl = gl.domElement;
    const handleMouseMove = (e: MouseEvent) => {
      target.current.set(
        (e.clientX / domEl.clientWidth) * 2 - 1,
        -((e.clientY / domEl.clientHeight) * 2 - 1),
      );
    };
    domEl.addEventListener('mousemove', handleMouseMove);
    return () => domEl.removeEventListener('mousemove', handleMouseMove);
  }, [gl.domElement]);

  useFrame(({ camera }) => {
    const lerpFactor = SCENE.cameraMouseInfluence;
    const maxTilt = SCENE.cameraMaxTilt;
    camera.position.x +=
      (target.current.x * maxTilt - camera.position.x) * lerpFactor;
    camera.position.y +=
      (target.current.y * maxTilt - camera.position.y) * lerpFactor;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ─── Main floating form ───────────────────────────────────────────────────────

function MainForm() {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    meshRef.current.rotation.x = t * SCENE.mainRotationSpeed * 0.6;
    meshRef.current.rotation.y = t * SCENE.mainRotationSpeed;
    meshRef.current.position.y =
      Math.sin((t / SCENE.floatPeriod) * Math.PI * 2) * SCENE.floatAmplitude;
  });

  return (
    <mesh ref={meshRef} castShadow>
      <torusKnotGeometry args={[1, 0.32, 180, 24, 2, 3]} />
      {/* MeshDistortMaterial gives a subtle organic wobble */}
      <MeshDistortMaterial
        color={COLORS.meshPrimary}
        emissive={COLORS.meshPrimary}
        emissiveIntensity={0.35}
        metalness={0.7}
        roughness={0.2}
        distort={0.18}
        speed={2.5}
      />
    </mesh>
  );
}

// ─── Orbiting satellite forms ─────────────────────────────────────────────────

interface OrbiterProps {
  index: number;
  total: number;
}

function Orbiter({ index, total }: OrbiterProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);

  const baseAngle = (index / total) * Math.PI * 2;
  const radius = 2.4;
  const yOffset = (index % 2 === 0 ? 1 : -1) * 0.4;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const angle = baseAngle + t * SCENE.orbitSpeed;
    groupRef.current.position.x = Math.cos(angle) * radius;
    groupRef.current.position.z = Math.sin(angle) * radius;
    groupRef.current.position.y =
      yOffset +
      Math.sin((t / SCENE.floatPeriod) * Math.PI * 2 + index) *
        (SCENE.floatAmplitude * 0.6);

    meshRef.current.rotation.x = t * 0.5 + index;
    meshRef.current.rotation.y = t * 0.7 + index;
  });

  const color = index % 2 === 0 ? COLORS.meshSecondary : COLORS.meshAccent;

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} castShadow scale={0.38}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          metalness={0.6}
          roughness={0.25}
          wireframe={false}
        />
      </mesh>
    </group>
  );
}

// ─── Exported canvas wrapper ──────────────────────────────────────────────────

const ORBITER_COUNT = 6;

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.5], fov: 50 }}
      style={{ position: 'absolute', inset: 0 }}
      gl={{ antialias: true, alpha: false }}
      shadows
    >
      {/* Fog for depth */}
      <fog attach="fog" args={[COLORS.background, COLORS.fogNear, COLORS.fogFar]} />

      {/* Background clear color */}
      <color attach="background" args={[COLORS.background]} />

      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-4, -2, 3]} intensity={0.8} color={COLORS.meshSecondary} />
      <pointLight position={[3, 3, -3]} intensity={0.6} color={COLORS.meshAccent} />

      {/* Animated camera rig */}
      <CameraRig />

      {/* Main 3D form */}
      <MainForm />

      {/* Orbiting satellites */}
      {Array.from({ length: ORBITER_COUNT }, (_, i) => (
        <Orbiter key={i} index={i} total={ORBITER_COUNT} />
      ))}
    </Canvas>
  );
}
