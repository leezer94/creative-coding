import type { PointerEventHandler, RefObject } from 'react';
import { HOST_PREVIEW_LAYOUT } from '@/config';
import type { HostPreviewLayout } from '@/config';
import type { HostPreviewDock } from '@/routes/use-host-preview-dock';

type DragHandleProps = {
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
  style: { touchAction: 'none' };
};

type ResizeHandleProps = {
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
  style: { touchAction: 'none' };
};

type Props = {
  dock: HostPreviewDock;
  dragHandleProps: DragHandleProps;
  resizeHandleProps: ResizeHandleProps;
  previewLayout: HostPreviewLayout;
  guestConnected: boolean;
  previewS: RefObject<HTMLVideoElement | null>;
  previewA: RefObject<HTMLVideoElement | null>;
};

/**
 * Draggable host “preview cams” overlay (stage vs dual grid).
 */
export default function HostPreviewPanel({
  dock,
  dragHandleProps,
  resizeHandleProps,
  previewLayout,
  guestConnected,
  previewS,
  previewA,
}: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        right: dock.right,
        bottom: dock.bottom,
        width: dock.width,
        zIndex: 2,
        pointerEvents: 'auto',
        maxWidth:
          'calc(100vw - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px) - 8px)',
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid #3a3a48',
          background: 'rgba(8,8,14,0.92)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
        }}
      >
        <div
          {...dragHandleProps}
          style={{
            ...dragHandleProps.style,
            cursor: 'grab',
            padding: '7px 10px',
            fontSize: 11,
            color: '#b8b4c8',
            userSelect: 'none',
            background: 'linear-gradient(180deg, #1e1e2a 0%, #15151c 100%)',
            borderBottom: '1px solid #2a2a38',
          }}
        >
          프리뷰 · 여기를 드래그해 위치 이동
        </div>

        {previewLayout === HOST_PREVIEW_LAYOUT.Stage ? (
          <div
            style={{
              position: 'relative',
              opacity: 0.72,
              background: '#111',
            }}
          >
            <video
              ref={previewS}
              muted
              playsInline
              style={{
                width: '100%',
                height: 'auto',
                aspectRatio: '16 / 9',
                display: 'block',
                objectFit: 'cover',
                pointerEvents: 'none',
              }}
            />
            <video
              ref={previewA}
              muted
              playsInline
              style={{
                position: 'absolute',
                right: 8,
                bottom: 8,
                width: 'min(38%, 168px)',
                aspectRatio: '16 / 9',
                objectFit: 'cover',
                borderRadius: 8,
                border: guestConnected
                  ? '2px solid rgba(108, 92, 231, 0.95)'
                  : '1px solid #444',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
              padding: 6,
              opacity: 0.65,
            }}
          >
            <video
              ref={previewS}
              muted
              playsInline
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                objectFit: 'cover',
                border: '1px solid #333',
                borderRadius: 4,
                pointerEvents: 'none',
              }}
            />
            <video
              ref={previewA}
              muted
              playsInline
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                objectFit: 'cover',
                border: '1px solid #333',
                borderRadius: 4,
                pointerEvents: 'none',
              }}
            />
          </div>
        )}

        <div
          {...resizeHandleProps}
          title="드래그해 크기 조절"
          style={{
            ...resizeHandleProps.style,
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 20,
            height: 20,
            cursor: 'nwse-resize',
            background:
              'linear-gradient(135deg, transparent 45%, rgba(200,200,220,0.35) 45%, rgba(200,200,220,0.35) 50%, transparent 50%)',
          }}
        />
      </div>
    </div>
  );
}
