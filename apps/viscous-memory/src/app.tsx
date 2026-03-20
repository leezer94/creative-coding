import { useEffect } from 'react';
import { ATMOSPHERE } from '@/config';
import Sketch from '@/components/sketch';
import FluidContentLayer from '@/components/fluid-content-layer';
import CameraStatusOverlay from '@/components/camera-status-overlay';
import { setupInputBroker } from '@/input/setup-input-broker';

export default function App() {
  useEffect(() => {
    // Keep camera and tracking lifecycle in one place so visual layers stay purely declarative.
    const broker = setupInputBroker();
    return () => broker.teardown();
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${ATMOSPHERE.backgroundTop} 0%, ${ATMOSPHERE.backgroundBottom} 100%)`,
      }}
    >
      <Sketch />
      <FluidContentLayer />
      <CameraStatusOverlay />
    </div>
  );
}
