import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { COMPOSITOR_MODE, GUEST_VIDEO, MODE as defaultMode } from '@/config';
import type { CompositorMode } from '@/config';
import CompositorCanvas from '@/components/CompositorCanvas';
import SessionQrCode from '@/components/SessionQrCode';
import { useHostWebRtc } from '@/webrtc/useHostWebRtc';
import { getPublicOrigin, getSignalUrl } from '@/webrtc/ice';

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
  const [mode, setMode] = useState<CompositorMode>(defaultMode);

  const videoS = useRef<HTMLVideoElement>(null);
  const videoA = useRef<HTMLVideoElement>(null);
  const previewS = useRef<HTMLVideoElement>(null);
  const previewA = useRef<HTMLVideoElement>(null);

  const { remoteStream, status } = useHostWebRtc(sessionId, localStream);

  const guestUrl = `${getPublicOrigin()}/g/${sessionId}`;
  const needsLanHint =
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1') &&
    !import.meta.env.VITE_PUBLIC_ORIGIN?.trim();

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
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
  }, []);

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
  }, [localStream, preview, remoteStream]);

  const guestConnected = !!remoteStream;

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: '100vh' }}
    >
      <CompositorCanvas
        videoS={videoS}
        videoA={videoA}
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

      {preview && (
        <div
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
            opacity: 0.65,
            pointerEvents: 'none',
          }}
        >
          <video
            ref={previewS}
            muted
            playsInline
            style={{
              width: 160,
              height: 90,
              objectFit: 'cover',
              border: '1px solid #333',
            }}
          />
          <video
            ref={previewA}
            muted
            playsInline
            style={{
              width: 160,
              height: 90,
              objectFit: 'cover',
              border: '1px solid #333',
            }}
          />
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
                VITE_PUBLIC_ORIGIN=http://&lt;your-LAN-IP&gt;:5173
              </code>{' '}
              to <code style={{ fontSize: 10 }}>.env.local</code> and restart Vite, or
              open this host page directly at your LAN IP.
            </p>
          )}

          <div style={{ marginBottom: 10, fontSize: 12 }}>
            <div>Signal: {getSignalUrl()}</div>
            <div>Session: {sessionId}</div>
            <div>WebRTC: {status}</div>
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
            Open the guest link on a phone on the same Wi‑Fi. Run the signal server on
            0.0.0.0:8787 so phones can reach it at this machine&apos;s LAN IP.
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
