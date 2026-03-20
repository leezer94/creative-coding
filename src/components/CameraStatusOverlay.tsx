import { useParamsStore } from '@/store';

export default function CameraStatusOverlay() {
  const camera = useParamsStore((s) => s.camera);
  if (camera.ready && camera.permission === 'granted') return null;

  return (
    <aside
      style={{
        position: 'absolute',
        zIndex: 3,
        left: '50%',
        top: '2rem',
        transform: 'translateX(-50%)',
        padding: '0.65rem 0.9rem',
        borderRadius: '999px',
        border: '1px solid rgba(180, 196, 222, 0.24)',
        background: 'rgba(8, 11, 18, 0.72)',
        color: 'rgba(218, 229, 244, 0.9)',
        fontSize: '0.78rem',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        pointerEvents: 'none',
      }}
    >
      {camera.message}
    </aside>
  );
}
