import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import {
  COMPOSITOR_MODE,
  DEFAULT_HOST_PREVIEW_LAYOUT,
  getHostVideoConstraints,
  HOST_PREVIEW_LAYOUT,
  MODE as defaultMode,
  STAGE_LANE_A_EXTRA_VIDEOS,
  getStageAudioEnabled,
} from '@/config';
import type { CompositorMode, HostPreviewLayout } from '@/config';
import CompositorCanvas from '@/components/compositor-canvas';
import HostPreviewPanel from '@/components/host-preview-panel';
import HostSettingsDrawer from '@/components/host-settings-drawer';
import { useHostWebRtc } from '@/webrtc/use-host-webrtc';
import { getUseSfu, isLiveKitConfigured } from '@/webrtc/livekit-config';
import { getPublicOrigin } from '@/webrtc/ice';
import { formatHostConnectionLine } from '@/webrtc/connection-messages';
import { useLiveKitRoom } from '@/webrtc/use-livekit-room';
import { newSessionId } from '@/routes/host-utils';
import { useHostPreviewDock } from './use-host-preview-dock';

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

  const connectionStatusLine = formatHostConnectionLine(useSfu, liveKitStatus, status);

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
        <HostPreviewPanel
          dock={dock}
          dragHandleProps={dragHandleProps}
          resizeHandleProps={resizeHandleProps}
          previewLayout={previewLayout}
          guestConnected={guestConnected}
          previewS={previewS}
          previewA={previewA}
        />
      )}

      <HostSettingsDrawer
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen((o) => !o)}
        needsLanHint={needsLanHint}
        sessionId={sessionId}
        guestUrl={guestUrl}
        connectionStatusLine={connectionStatusLine}
        onToggleDebug={() => setDebug((d) => !d)}
        preview={preview}
        onTogglePreview={() => setPreview((p) => !p)}
        previewLayout={previewLayout}
        onTogglePreviewLayout={() =>
          setPreviewLayout((l) =>
            l === HOST_PREVIEW_LAYOUT.Stage
              ? HOST_PREVIEW_LAYOUT.Dual
              : HOST_PREVIEW_LAYOUT.Stage
          )
        }
        onResetPreviewDock={resetDock}
        mode={mode}
        onToggleCompositorMode={() =>
          setMode((m) =>
            m === COMPOSITOR_MODE.DualGridScan
              ? COMPOSITOR_MODE.DelayedEcho
              : COMPOSITOR_MODE.DualGridScan
          )
        }
      />
    </div>
  );
}
