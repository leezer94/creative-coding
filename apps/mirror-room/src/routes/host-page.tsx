import {
  type CSSProperties,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  COMPOSITOR_MODE,
  DEFAULT_HOST_PREVIEW_LAYOUT,
  GUEST_VIDEO,
  getHostVideoConstraints,
  HOST_PREVIEW_LAYOUT,
  MODE as defaultMode,
  STAGE_LANE_A_EXTRA_VIDEOS,
  getStageAudioEnabled,
} from '@/config';
import type { CompositorMode, HostPreviewLayout } from '@/config';
import CompositorCanvas from '@/components/compositor-canvas';
import SessionQrCode from '@/components/session-qr-code';
import { useHostWebRtc } from '@/webrtc/use-host-webrtc';
import {
  getUseSfu,
  isLiveKitConfigured,
  isProductionLiveKitMissing,
} from '@/webrtc/livekit-config';
import { getPublicOrigin, getSignalUrl, isProductionSignalMissing } from '@/webrtc/ice';
import { useLiveKitRoom } from '@/webrtc/use-livekit-room';
import { useHostPreviewDock } from './use-host-preview-dock';

/**
 * `randomUUID()` is missing in non-secure HTTP (e.g. http://192.168.x.x on some browsers).
 */
function newSessionId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID().replace(/-/g, '').slice(0, 10);
  }
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint8Array(8);
    c.getRandomValues(buf);
    let hex = '';
    for (let i = 0; i < buf.length; i++) {
      hex += buf[i].toString(16).padStart(2, '0');
    }
    return hex.slice(0, 10);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.slice(
    0,
    10
  );
}

/**
 * Clipboard API is absent on insecure HTTP in some browsers (e.g. Safari over LAN).
 */
async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* use fallback */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Host: Lane S from the Mac webcam; Lane A arrives from the guest via WebRTC.
 * Drawer surfaces session URL + QR so a phone can join on the same LAN.
 */
export default function HostPage() {
  const [sessionId] = useState(newSessionId);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [debug, setDebug] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewLayout, setPreviewLayout] = useState<HostPreviewLayout>(
    DEFAULT_HOST_PREVIEW_LAYOUT
  );
  const [mode, setMode] = useState<CompositorMode>(defaultMode);

  const videoS = useRef<HTMLVideoElement>(null);
  const videoA = useRef<HTMLVideoElement>(null);
  const previewS = useRef<HTMLVideoElement>(null);
  const previewA = useRef<HTMLVideoElement>(null);

  const useSfu = useMemo(() => getUseSfu() && isLiveKitConfigured(), []);

  const remoteExtra1 = useRef<HTMLVideoElement>(null);
  const remoteExtra2 = useRef<HTMLVideoElement>(null);
  const remoteExtra3 = useRef<HTMLVideoElement>(null);
  const laneARemoteExtras: RefObject<HTMLVideoElement | null>[] = [
    remoteExtra1,
    remoteExtra2,
    remoteExtra3,
  ];

  const { remoteStream, status } = useHostWebRtc(sessionId, useSfu ? null : localStream);

  const { hasRemoteParticipant: liveKitGuestOn, status: liveKitStatus } = useLiveKitRoom({
    sessionId,
    enabled: useSfu && !!sessionId,
    identity: `host-${sessionId}`,
    localVideoRef: videoS,
    remoteVideoRef: videoA,
    extraRemoteVideoRefs: laneARemoteExtras,
    publishVideo: true,
  });

  const guestUrl = `${getPublicOrigin()}/g/${sessionId}`;
  const needsLanHint =
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1') &&
    !import.meta.env.VITE_PUBLIC_ORIGIN?.trim();

  useEffect(() => {
    if (useSfu) {
      return;
    }
    let stream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: getHostVideoConstraints(),
          audio: getStageAudioEnabled(),
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setLocalStream(stream);
        const el = videoS.current;
        if (el) {
          el.srcObject = stream;
          await el.play();
        }
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [useSfu]);

  useEffect(() => {
    const el = videoA.current;
    if (!el) {
      return;
    }
    if (remoteStream) {
      el.srcObject = remoteStream;
      void el.play();
    } else {
      el.srcObject = null;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!preview) {
      return;
    }
    const a = previewA.current;
    const s = previewS.current;
    if (useSfu) {
      if (s && videoS.current?.srcObject) {
        s.srcObject = videoS.current.srcObject;
        void s.play();
      }
      if (a && videoA.current?.srcObject) {
        a.srcObject = videoA.current.srcObject;
        void a.play();
      }
      if (a && !videoA.current?.srcObject) {
        a.srcObject = null;
      }
      return;
    }
    if (s && localStream) {
      s.srcObject = localStream;
      void s.play();
    }
    if (a && remoteStream) {
      a.srcObject = remoteStream;
      void a.play();
    }
    if (a && !remoteStream) {
      a.srcObject = null;
    }
  }, [localStream, preview, remoteStream, useSfu]);

  const guestConnected = useSfu ? liveKitGuestOn : !!remoteStream;

  const { dock, resetDock, dragHandleProps, resizeHandleProps } = useHostPreviewDock();

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: '100vh' }}
    >
      <CompositorCanvas
        videoS={videoS}
        videoA={videoA}
        laneARemoteRefs={useSfu ? laneARemoteExtras : []}
        laneARemotePolicy="max"
        laneASpotlightIndex={0}
        guestConnected={guestConnected}
        mode={mode}
        debug={debug}
      />

      <video
        ref={videoS}
        muted
        playsInline
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      <video
        ref={videoA}
        muted
        playsInline
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      {useSfu && (
        <>
          {STAGE_LANE_A_EXTRA_VIDEOS >= 1 && (
            <video
              ref={remoteExtra1}
              muted
              playsInline
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: 'none',
              }}
            />
          )}
          {STAGE_LANE_A_EXTRA_VIDEOS >= 2 && (
            <video
              ref={remoteExtra2}
              muted
              playsInline
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: 'none',
              }}
            />
          )}
          {STAGE_LANE_A_EXTRA_VIDEOS >= 3 && (
            <video
              ref={remoteExtra3}
              muted
              playsInline
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: 'none',
              }}
            />
          )}
        </>
      )}

      {guestConnected && (
        <div
          style={{
            position: 'absolute',
            top: 'max(12px, env(safe-area-inset-top))',
            right: 'max(12px, env(safe-area-inset-right))',
            zIndex: 3,
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            color: '#f4f2ff',
            background: 'rgba(108, 92, 231, 0.92)',
            border: '1px solid rgba(180, 170, 255, 0.45)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
          }}
        >
          관객 연결됨
        </div>
      )}

      {preview && (
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
      )}

      <button
        type="button"
        onClick={() => setDrawerOpen((o) => !o)}
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
            <div>WebRTC: {useSfu ? `LiveKit (${liveKitStatus})` : status}</div>
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
            <button type="button" style={btn} onClick={() => setDebug((d) => !d)}>
              Debug HUD
            </button>
            <button type="button" style={btn} onClick={() => setPreview((p) => !p)}>
              Preview cams
            </button>
            <button
              type="button"
              style={btn}
              onClick={() =>
                setPreviewLayout((l) =>
                  l === HOST_PREVIEW_LAYOUT.Stage
                    ? HOST_PREVIEW_LAYOUT.Dual
                    : HOST_PREVIEW_LAYOUT.Stage
                )
              }
            >
              Preview: {previewLayout === HOST_PREVIEW_LAYOUT.Stage ? '무대' : '듀얼'}
            </button>
            <button type="button" style={btn} onClick={resetDock} disabled={!preview}>
              프리뷰 위치·크기 초기화
            </button>
            <button
              type="button"
              style={btn}
              onClick={() =>
                setMode((m) =>
                  m === COMPOSITOR_MODE.DualGridScan
                    ? COMPOSITOR_MODE.DelayedEcho
                    : COMPOSITOR_MODE.DualGridScan
                )
              }
            >
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
    </div>
  );
}

const btn: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #444',
  background: '#1a1a24',
  color: '#ddd',
  fontSize: 12,
};
