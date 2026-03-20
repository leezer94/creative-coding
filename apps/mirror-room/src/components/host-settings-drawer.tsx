import type { CSSProperties } from 'react';
import { GUEST_VIDEO, HOST_PREVIEW_LAYOUT } from '@/config';
import type { CompositorMode, HostPreviewLayout } from '@/config';
import SessionQrCode from '@/components/session-qr-code';
import { copyTextToClipboard } from '@/routes/host-utils';
import { getUseSfu, isProductionLiveKitMissing } from '@/webrtc/livekit-config';
import { getSignalUrl, isProductionSignalMissing } from '@/webrtc/ice';

const btn: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #444',
  background: '#1a1a24',
  color: '#ddd',
  fontSize: 12,
};

type Props = {
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  needsLanHint: boolean;
  sessionId: string;
  guestUrl: string;
  /** P2P signaling status or LiveKit line for status row */
  connectionStatusLine: string;
  onToggleDebug: () => void;
  preview: boolean;
  onTogglePreview: () => void;
  previewLayout: HostPreviewLayout;
  onTogglePreviewLayout: () => void;
  onResetPreviewDock: () => void;
  mode: CompositorMode;
  onToggleCompositorMode: () => void;
};

/**
 * Host controls toggle + side drawer (session URL, QR, warnings, debug/preview/mode).
 */
export default function HostSettingsDrawer({
  drawerOpen,
  onToggleDrawer,
  needsLanHint,
  sessionId,
  guestUrl,
  connectionStatusLine,
  onToggleDebug,
  preview,
  onTogglePreview,
  previewLayout,
  onTogglePreviewLayout,
  onResetPreviewDock,
  mode,
  onToggleCompositorMode,
}: Props) {
  return (
    <>
      <button
        type="button"
        onClick={onToggleDrawer}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 2,
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #333',
          background: '#12121a',
          color: '#eee',
        }}
      >
        {drawerOpen ? 'Hide controls' : 'Controls'}
      </button>

      {drawerOpen && (
        <aside
          style={{
            position: 'absolute',
            top: 56,
            left: 12,
            zIndex: 2,
            width: 280,
            padding: 14,
            borderRadius: 12,
            background: 'rgba(10,10,16,0.92)',
            border: '1px solid #2a2a38',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          }}
        >
          <h1 style={{ margin: '0 0 8px', fontSize: 15 }}>Mirror Room — Host</h1>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#aaa' }}>
            Lane S: spatial · Lane A: gaze
          </p>

          {needsLanHint && (
            <p
              style={{
                margin: '0 0 10px',
                padding: 8,
                fontSize: 11,
                lineHeight: 1.45,
                color: '#eac',
                background: 'rgba(180,60,80,0.2)',
                borderRadius: 8,
                border: '1px solid rgba(180,80,100,0.45)',
              }}
            >
              QR / guest URL still use localhost — phones cannot open that. Add{' '}
              <code style={{ fontSize: 10 }}>
                VITE_PUBLIC_ORIGIN=https://&lt;your-LAN-IP&gt;:5173
              </code>{' '}
              to <code style={{ fontSize: 10 }}>.env.local</code> and restart Vite, or
              open this host page directly at your LAN IP.
            </p>
          )}

          {isProductionSignalMissing() && !getUseSfu() && (
            <p
              style={{
                margin: '0 0 10px',
                padding: 8,
                fontSize: 11,
                lineHeight: 1.45,
                color: '#fca',
                background: 'rgba(180,100,40,0.25)',
                borderRadius: 8,
                border: '1px solid rgba(200,120,60,0.5)',
              }}
            >
              Production build has no{' '}
              <code style={{ fontSize: 10 }}>VITE_SIGNAL_URL</code>. WebRTC signaling
              cannot connect. Set it at build time to your public{' '}
              <code style={{ fontSize: 10 }}>wss://</code> signal URL (see{' '}
              <code style={{ fontSize: 10 }}>
                docs/architecture/mirror-room-public-deploy.md
              </code>
              ), or enable SFU with{' '}
              <code style={{ fontSize: 10 }}>VITE_USE_SFU=true</code> and LiveKit env
              vars.
            </p>
          )}

          {isProductionLiveKitMissing() && (
            <p
              style={{
                margin: '0 0 10px',
                padding: 8,
                fontSize: 11,
                lineHeight: 1.45,
                color: '#fca',
                background: 'rgba(180,100,40,0.25)',
                borderRadius: 8,
                border: '1px solid rgba(200,120,60,0.5)',
              }}
            >
              SFU mode is on but LiveKit is incomplete. Set{' '}
              <code style={{ fontSize: 10 }}>VITE_LIVEKIT_URL</code> and{' '}
              <code style={{ fontSize: 10 }}>VITE_LIVEKIT_TOKEN_URL</code> at build time
              (see{' '}
              <code style={{ fontSize: 10 }}>
                docs/architecture/mirror-room-livekit.md
              </code>
              ).
            </p>
          )}

          <div style={{ marginBottom: 10, fontSize: 12 }}>
            <div>Signal: {getSignalUrl() || '(not configured)'}</div>
            <div>Session: {sessionId}</div>
            <div>WebRTC: {connectionStatusLine}</div>
            <div>
              Guest video cap: {GUEST_VIDEO.maxWidth}×{GUEST_VIDEO.maxHeight}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <button
              type="button"
              style={btn}
              onClick={() => {
                void copyTextToClipboard(guestUrl);
              }}
            >
              Copy guest URL
            </button>
            <button type="button" style={btn} onClick={onToggleDebug}>
              Debug HUD
            </button>
            <button type="button" style={btn} onClick={onTogglePreview}>
              Preview cams
            </button>
            <button type="button" style={btn} onClick={onTogglePreviewLayout}>
              Preview: {previewLayout === HOST_PREVIEW_LAYOUT.Stage ? '무대' : '듀얼'}
            </button>
            <button
              type="button"
              style={btn}
              onClick={onResetPreviewDock}
              disabled={!preview}
            >
              프리뷰 위치·크기 초기화
            </button>
            <button type="button" style={btn} onClick={onToggleCompositorMode}>
              Mode: {mode}
            </button>
          </div>

          <div
            style={{
              background: '#fff',
              padding: 8,
              borderRadius: 8,
              width: 'fit-content',
            }}
          >
            <SessionQrCode value={guestUrl} size={128} />
          </div>
          <p style={{ fontSize: 11, color: '#888', marginTop: 8, lineHeight: 1.4 }}>
            LAN: same Wi‑Fi + signal on <code style={{ fontSize: 10 }}>0.0.0.0:8787</code>
            . Public QR from anywhere: deploy static app with{' '}
            <code style={{ fontSize: 10 }}>VITE_PUBLIC_ORIGIN</code> and a public{' '}
            <code style={{ fontSize: 10 }}>wss://</code> for{' '}
            <code style={{ fontSize: 10 }}>VITE_SIGNAL_URL</code> (tunnel or hosted
            signal). See app README / public deploy doc.
          </p>
        </aside>
      )}
    </>
  );
}
