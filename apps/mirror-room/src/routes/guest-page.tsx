import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { GUEST_VIDEO } from '@/config';
import { getSignalUrl, isProductionSignalMissing } from '@/webrtc/ice';
import { useGuestWebRtc } from '@/webrtc/use-guest-webrtc';

type LegacyGetUserMedia = (
  c: MediaStreamConstraints,
  success: (s: MediaStream) => void,
  err: (e: Error) => void
) => void;

function getUserMediaCompat(constraints: MediaStreamConstraints): Promise<MediaStream> {
  const md = navigator.mediaDevices;
  if (md?.getUserMedia) {
    return md.getUserMedia(constraints);
  }
  const nav = navigator as Navigator & {
    webkitGetUserMedia?: LegacyGetUserMedia;
    mozGetUserMedia?: LegacyGetUserMedia;
  };
  const legacy = nav.webkitGetUserMedia ?? nav.mozGetUserMedia;
  if (legacy) {
    return new Promise((resolve, reject) => {
      legacy.call(navigator, constraints, resolve, reject);
    });
  }
  return Promise.reject(new Error('Camera API not available (try HTTPS / Safari 설정)'));
}

/**
 * Guest: opens the front camera (by default) and streams Lane A to the host.
 */
export default function GuestPage() {
  const { sessionId } = useParams();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const localVideo = useRef<HTMLVideoElement>(null);

  const status = useGuestWebRtc(sessionId, stream, active);

  const attachPreview = useCallback(async (s: MediaStream | null) => {
    const el = localVideo.current;
    if (!el) {
      return;
    }
    if (s) {
      el.srcObject = s;
      await el.play();
    } else {
      el.srcObject = null;
    }
  }, []);

  const start = async () => {
    if (!sessionId) {
      return;
    }
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia && !('webkitGetUserMedia' in navigator)) {
      setCameraError(
        '이 주소는 HTTP라서 카메라 API가 막혀 있습니다. 호스트에서 HTTPS로 띄우세요(https:// + 인증서 신뢰).'
      );
      return;
    }
    try {
      const media = await getUserMediaCompat({
        video: { facingMode: facing },
        audio: false,
      });
      const [track] = media.getVideoTracks();
      await track.applyConstraints({
        width: { max: GUEST_VIDEO.maxWidth },
        height: { max: GUEST_VIDEO.maxHeight },
        frameRate: { max: GUEST_VIDEO.maxFrameRate },
      });
      setStream(media);
      setActive(true);
      await attachPreview(media);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setCameraError(
        msg.includes('not available')
          ? msg
          : `카메라를 열 수 없습니다: ${msg}. HTTPS로 접속했는지, Safari에서 카메라 권한을 허용했는지 확인하세요.`
      );
    }
  };

  const stop = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setActive(false);
    setCameraError(null);
    void attachPreview(null);
  };

  /** iOS Safari usually ignores `applyConstraints({ facingMode })` on an existing track — open a new capture instead. */
  const flipCamera = async () => {
    if (!stream) {
      return;
    }
    const next = facing === 'user' ? 'environment' : 'user';
    setCameraError(null);
    try {
      stream.getTracks().forEach((t) => t.stop());
      const media = await getUserMediaCompat({
        video: { facingMode: next },
        audio: false,
      });
      const [track] = media.getVideoTracks();
      await track.applyConstraints({
        width: { max: GUEST_VIDEO.maxWidth },
        height: { max: GUEST_VIDEO.maxHeight },
        frameRate: { max: GUEST_VIDEO.maxFrameRate },
      });
      setStream(media);
      setFacing(next);
      await attachPreview(media);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setCameraError(`카메라 전환 실패: ${msg}`);
      stop();
    }
  };

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  if (!sessionId) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        padding:
          'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: '#07070c',
        color: '#eaeaf3',
      }}
    >
      <header>
        <h1 style={{ margin: 0, fontSize: 20 }}>Mirror Room — Gaze</h1>
        <p style={{ margin: '8px 0 0', color: '#9a98aa', fontSize: 13 }}>
          Session <strong>{sessionId}</strong>
        </p>
      </header>

      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Fixed 16:9 (matches typical 1280×720 cap) so idle / flip / track swap do not reflow the page */}
        <div
          style={{
            width: 'min(100%, calc(42dvh * 16 / 9))',
            aspectRatio: '16 / 9',
            margin: '0 auto',
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            background: '#111',
            border: '1px solid #2c2c3a',
            flexShrink: 0,
          }}
        >
          <video
            ref={localVideo}
            muted
            playsInline
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        {cameraError && (
          <p
            style={{
              margin: 0,
              padding: 12,
              fontSize: 13,
              lineHeight: 1.5,
              color: '#fcc',
              background: 'rgba(180,50,70,0.25)',
              borderRadius: 10,
              border: '1px solid rgba(200,80,100,0.5)',
            }}
          >
            {cameraError}
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button
            type="button"
            style={primaryBtn}
            onClick={() => void start()}
            disabled={active}
          >
            Start streaming
          </button>
          <button type="button" style={secondaryBtn} onClick={stop} disabled={!active}>
            Disconnect
          </button>
          <button
            type="button"
            style={secondaryBtn}
            onClick={() => void flipCamera()}
            disabled={!stream || !active}
          >
            Flip camera
          </button>
        </div>

        {isProductionSignalMissing() && (
          <p
            style={{
              padding: 10,
              fontSize: 12,
              lineHeight: 1.45,
              color: '#fca',
              background: 'rgba(180,100,40,0.2)',
              borderRadius: 8,
              border: '1px solid rgba(200,120,60,0.45)',
            }}
          >
            This build is missing <code style={{ fontSize: 11 }}>VITE_SIGNAL_URL</code>.
            Set a public <code style={{ fontSize: 11 }}>wss://</code> signal URL when
            building the app.
          </p>
        )}

        <div style={{ fontSize: 13, color: '#b7b3c9' }}>
          <div>Signal target: {getSignalUrl() || '(not configured)'}</div>
          <div>Link status: {status}</div>
        </div>

        <p style={{ fontSize: 12, lineHeight: 1.5, color: '#7d7a90', margin: 0 }}>
          Ephemeral session. This page sends camera video to the host over WebRTC; nothing
          is uploaded to a server beyond signaling handshakes. Visuals on the projector
          are driven by motion summaries, not raw mirrors.
        </p>
      </section>
    </div>
  );
}

const primaryBtn: CSSProperties = {
  padding: '12px 18px',
  borderRadius: 10,
  border: '1px solid #6c5ce7',
  background: '#6c5ce7',
  color: '#fff',
  fontWeight: 600,
};

const secondaryBtn: CSSProperties = {
  padding: '12px 18px',
  borderRadius: 10,
  border: '1px solid #3f3f52',
  background: '#151521',
  color: '#eaeaf3',
};
