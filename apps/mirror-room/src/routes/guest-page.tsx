import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  getGuestVideoConstraints,
  getLiveKitGuestAdaptiveStream,
  getStageAudioEnabled,
} from '@/config';
import {
  getUseSfu,
  isLiveKitConfigured,
  isProductionLiveKitMissing,
} from '@/webrtc/livekit-config';
import { getSignalUrl, isProductionSignalMissing } from '@/webrtc/ice';
import { useGuestWebRtc } from '@/webrtc/use-guest-webrtc';
import { useLiveKitRoom } from '@/webrtc/use-livekit-room';

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
 * Guest: front camera to host (Lane A); host feed shown large as “stage”, local as PIP.
 */
export default function GuestPage() {
  const { sessionId } = useParams();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const [lkIdentity] = useState(() => `g-${Math.random().toString(36).slice(2, 11)}`);

  const useSfu = useMemo(() => getUseSfu() && isLiveKitConfigured(), []);

  const { status: legacyStatus, remoteStream: legacyRemote } = useGuestWebRtc(
    sessionId,
    useSfu ? null : stream,
    useSfu ? false : active
  );

  const livekit = useLiveKitRoom({
    sessionId,
    enabled: useSfu && active && !!sessionId,
    identity: `guest-${sessionId}-${lkIdentity}`,
    localVideoRef: localVideo,
    remoteVideoRef: remoteVideo,
    extraRemoteVideoRefs: [],
    publishVideo: active,
    adaptiveStream: getLiveKitGuestAdaptiveStream(),
  });

  const status = useSfu ? livekit.status : legacyStatus;
  const remoteStream = useSfu ? livekit.remoteStream : legacyRemote;

  /**
   * `start()` calls `setStream` + `setActive` then returns — before commit, `localVideo` is null
   * because PIP mounts only when `active && stream`. Attach after layout (or one rAF fallback).
   */
  useLayoutEffect(() => {
    if (useSfu) {
      return;
    }
    const bind = (el: HTMLVideoElement | null) => {
      if (!el) {
        return;
      }
      if (active && stream) {
        el.srcObject = stream;
        void el.play().catch(() => {});
      } else {
        el.srcObject = null;
      }
    };

    bind(localVideo.current);
    if (active && stream && !localVideo.current) {
      const id = requestAnimationFrame(() => bind(localVideo.current));
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [active, stream, useSfu]);

  useEffect(() => {
    if (useSfu) {
      return;
    }
    const el = remoteVideo.current;
    if (!el) {
      return;
    }
    if (remoteStream) {
      el.srcObject = remoteStream;
      void el.play();
    } else {
      el.srcObject = null;
    }
  }, [remoteStream, useSfu]);

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
    if (useSfu) {
      if (!isLiveKitConfigured()) {
        setCameraError('LiveKit URL 또는 토큰 URL이 설정되지 않았습니다.');
        return;
      }
      setActive(true);
      return;
    }
    try {
      const media = await getUserMediaCompat({
        video: getGuestVideoConstraints(facing),
        audio: getStageAudioEnabled(),
      });
      const [track] = media.getVideoTracks();
      await track.applyConstraints(getGuestVideoConstraints(facing));
      setStream(media);
      setActive(true);
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
    if (!useSfu) {
      stream?.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setActive(false);
    setCameraError(null);
  };

  /** iOS Safari usually ignores `applyConstraints({ facingMode })` on an existing track — open a new capture instead. */
  const flipCamera = async () => {
    if (useSfu) {
      return;
    }
    if (!stream) {
      return;
    }
    const next = facing === 'user' ? 'environment' : 'user';
    setCameraError(null);
    try {
      stream.getTracks().forEach((t) => t.stop());
      const media = await getUserMediaCompat({
        video: getGuestVideoConstraints(next),
        audio: getStageAudioEnabled(),
      });
      const [track] = media.getVideoTracks();
      await track.applyConstraints(getGuestVideoConstraints(next));
      setStream(media);
      setFacing(next);
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

  const stageLabel =
    status === 'streaming' && remoteStream
      ? '무대(호스트)'
      : active
        ? '호스트 영상 대기 중…'
        : '스트리밍을 시작하면 무대가 표시됩니다';

  return (
    <div
      style={{
        minHeight: '100dvh',
        padding:
          'max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: '#07070c',
        color: '#eaeaf3',
      }}
    >
      <header style={{ flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>Mirror Room — 관객</h1>
        <p style={{ margin: '6px 0 0', color: '#9a98aa', fontSize: 12 }}>
          세션 <strong>{sessionId}</strong>
        </p>
      </header>

      {/* Stage: remote host large; local PIP when streaming */}
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          gap: 10,
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 'min(52dvh, 100%)',
            width: '100%',
            maxWidth: '100%',
            margin: '0 auto',
            position: 'relative',
            borderRadius: 14,
            overflow: 'hidden',
            background: '#111',
            border: '1px solid #2c2c3a',
          }}
        >
          <video
            ref={remoteVideo}
            playsInline
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              background: '#0a0a10',
            }}
          />
          {(!remoteStream || remoteStream.getVideoTracks().length === 0) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                textAlign: 'center',
                fontSize: 14,
                color: '#8a879c',
                background: 'linear-gradient(180deg, #12121a 0%, #0a0a12 100%)',
                pointerEvents: 'none',
              }}
            >
              {stageLabel}
            </div>
          )}

          {active && (useSfu || stream) && (
            <div
              style={{
                position: 'absolute',
                right: 'max(10px, env(safe-area-inset-right))',
                bottom: 'max(10px, env(safe-area-inset-bottom))',
                width: 'min(38%, 160px)',
                aspectRatio: '16 / 9',
                borderRadius: 10,
                overflow: 'hidden',
                border: '2px solid rgba(108, 92, 231, 0.85)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                zIndex: 2,
              }}
            >
              <video
                ref={localVideo}
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 6,
                  top: 6,
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.02,
                  color: '#fff',
                  background: 'rgba(108, 92, 231, 0.92)',
                }}
              >
                송출 중
              </div>
            </div>
          )}
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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            style={primaryBtn}
            onClick={() => void start()}
            disabled={active}
          >
            스트리밍 시작
          </button>
          <button type="button" style={secondaryBtn} onClick={stop} disabled={!active}>
            연결 끊기
          </button>
          <button
            type="button"
            style={secondaryBtn}
            onClick={() => void flipCamera()}
            disabled={!stream || !active || useSfu}
          >
            카메라 전환
          </button>
        </div>

        <button
          type="button"
          onClick={() => setDetailsOpen((o) => !o)}
          style={{
            alignSelf: 'flex-start',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #3f3f52',
            background: '#12121a',
            color: '#b7b3c9',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {detailsOpen ? '세션 정보 접기' : '세션·연결 정보'}
        </button>

        {detailsOpen && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: 'rgba(18,18,26,0.95)',
              border: '1px solid #2a2a38',
              fontSize: 12,
              color: '#b7b3c9',
              lineHeight: 1.5,
            }}
          >
            {isProductionLiveKitMissing() && (
              <p
                style={{
                  margin: '0 0 10px',
                  padding: 8,
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: '#fca',
                  background: 'rgba(180,100,40,0.2)',
                  borderRadius: 8,
                  border: '1px solid rgba(200,120,60,0.45)',
                }}
              >
                SFU 모드인데 LiveKit 환경 변수가 없습니다.{' '}
                <code style={{ fontSize: 11 }}>VITE_LIVEKIT_URL</code>,{' '}
                <code style={{ fontSize: 11 }}>VITE_LIVEKIT_TOKEN_URL</code>를 설정하세요.
              </p>
            )}

            {isProductionSignalMissing() && !getUseSfu() && (
              <p
                style={{
                  margin: '0 0 10px',
                  padding: 8,
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: '#fca',
                  background: 'rgba(180,100,40,0.2)',
                  borderRadius: 8,
                  border: '1px solid rgba(200,120,60,0.45)',
                }}
              >
                빌드에 <code style={{ fontSize: 11 }}>VITE_SIGNAL_URL</code>이 없습니다.
                프로덕션 빌드 시 공개 <code style={{ fontSize: 11 }}>wss://</code> 시그널
                URL을 설정하세요.
              </p>
            )}
            <div>시그널: {getSignalUrl() || '(미설정)'}</div>
            <div>연결 상태: {status}</div>
            <p style={{ margin: '10px 0 0', fontSize: 11, color: '#7d7a90' }}>
              일회성 세션입니다. 카메라 영상은 WebRTC로 호스트에만 전달되며, 시그널
              핸드셰이크 외 서버 업로드는 없습니다. 프로젝터 영상은 모션 요약 등으로
              구동됩니다.
            </p>
          </div>
        )}
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
  minHeight: 44,
};

const secondaryBtn: CSSProperties = {
  padding: '12px 18px',
  borderRadius: 10,
  border: '1px solid #3f3f52',
  background: '#151521',
  color: '#eaeaf3',
  minHeight: 44,
};
