import { useEffect } from 'react';
import { ATMOSPHERE } from '@/config';
import Sketch from '@/components/Sketch';
import FluidContentLayer from '@/components/FluidContentLayer';
import CameraStatusOverlay from '@/components/CameraStatusOverlay';
import { setupInputBroker } from '@/input/setupInputBroker';

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
