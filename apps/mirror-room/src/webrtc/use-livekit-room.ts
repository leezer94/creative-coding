/* eslint-disable react-hooks/set-state-in-effect -- LiveKit Room connect/disconnect syncs connection state */
import { useEffect, useRef, useState } from 'react';
import { getStageAudioEnabled, getVideoPublishMaxBitrate, VIDEO_PUBLISH } from '@/config';
import {
  type RemoteTrack,
  RemoteParticipant,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client';
import { getLiveKitTokenUrl, getLiveKitUrl } from '@/webrtc/livekit-config';

export type LiveKitRoomStatus = 'idle' | 'connecting' | 'connected' | 'error';

async function fetchToken(room: string, identity: string): Promise<string> {
  const url = getLiveKitTokenUrl();
  if (!url) {
    throw new Error('VITE_LIVEKIT_TOKEN_URL is not set');
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, identity }),
  });
  if (!res.ok) {
    throw new Error(`LiveKit token HTTP ${res.status}`);
  }
  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    throw new Error('LiveKit token response missing token');
  }
  return data.token;
}

function attachRemoteVideo(track: RemoteTrack, el: HTMLVideoElement | null) {
  if (el) {
    track.attach(el);
    void el.play().catch(() => {});
  }
}

/** LiveKit `Room` adaptiveStream 옵션과 동일. 게스트는 `getLiveKitGuestAdaptiveStream()`. */
export type LiveKitAdaptiveStreamOption =
  | boolean
  | {
      pixelDensity?: number | 'screen';
      pauseVideoInBackground?: boolean;
    };

type Props = {
  sessionId: string | undefined;
  /** When false, disconnect and idle (e.g. legacy path or guest not started). */
  enabled: boolean;
  identity: string;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  /** Primary remote video (first remote camera). */
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  /** Extra slots for multi-participant compositor (optional). */
  extraRemoteVideoRefs?: React.RefObject<HTMLVideoElement | null>[];
  /** Publish camera from this browser (host always; guest after “start”). */
  publishVideo: boolean;
  /**
   * 원격 구독 adaptive stream. 기본 `true`(호스트·작은 PIP에 적합).
   * 게스트 무대는 `getLiveKitGuestAdaptiveStream()` 권장.
   */
  adaptiveStream?: LiveKitAdaptiveStreamOption;
};

/**
 * LiveKit room: publish local camera (when `publishVideo`), subscribe to remote video tracks.
 */
export function useLiveKitRoom({
  sessionId,
  enabled,
  identity,
  localVideoRef,
  remoteVideoRef,
  extraRemoteVideoRefs = [],
  publishVideo,
  adaptiveStream: adaptiveStreamOption = true,
}: Props) {
  const [status, setStatus] = useState<LiveKitRoomStatus>('idle');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hasRemoteParticipant, setHasRemoteParticipant] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const remoteSlotsRef = useRef<
    { participantId: string; trackSid: string; slotIndex: number }[]
  >([]);
  const extraRemoteVideoRefsRef = useRef(extraRemoteVideoRefs);

  useEffect(() => {
    extraRemoteVideoRefsRef.current = extraRemoteVideoRefs;
  });

  useEffect(() => {
    if (!enabled || !sessionId) {
      return;
    }

    const wsUrl = getLiveKitUrl();
    if (!wsUrl) {
      setStatus('error');
      return;
    }

    let cancelled = false;
    const room = new Room({
      adaptiveStream: adaptiveStreamOption,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: {
          width: VIDEO_PUBLISH.idealWidth,
          height: VIDEO_PUBLISH.idealHeight,
          frameRate: VIDEO_PUBLISH.maxFrameRate,
        },
      },
      publishDefaults: {
        videoEncoding: {
          maxBitrate: getVideoPublishMaxBitrate(),
          maxFramerate: VIDEO_PUBLISH.maxFrameRate,
        },
        degradationPreference: 'maintain-resolution',
        simulcast: true,
      },
    });
    roomRef.current = room;

    const remoteSlots: { participantId: string; trackSid: string; slotIndex: number }[] =
      [];
    remoteSlotsRef.current = remoteSlots;

    const assignRemoteVideo = (
      participant: RemoteParticipant,
      track: RemoteTrack,
      trackSid: string
    ) => {
      if (track.kind !== Track.Kind.Video) {
        return;
      }
      const existing = remoteSlots.find(
        (s) => s.participantId === participant.identity && s.trackSid === trackSid
      );
      if (existing) {
        const ref =
          existing.slotIndex === 0
            ? remoteVideoRef
            : extraRemoteVideoRefsRef.current[existing.slotIndex - 1];
        attachRemoteVideo(track, ref?.current ?? null);
        return;
      }
      const slotIndex = remoteSlots.length;
      const ref =
        slotIndex === 0 ? remoteVideoRef : extraRemoteVideoRefsRef.current[slotIndex - 1];
      if (ref?.current) {
        remoteSlots.push({
          participantId: participant.identity,
          trackSid,
          slotIndex,
        });
        attachRemoteVideo(track, ref.current);
        const ms = ref.current.srcObject as MediaStream | null;
        if (slotIndex === 0) {
          setRemoteStream(ms);
        }
        setHasRemoteParticipant(true);
      }
    };

    const clearRemoteSlot = (participantId: string, trackSid: string) => {
      const idx = remoteSlots.findIndex(
        (s) => s.participantId === participantId && s.trackSid === trackSid
      );
      if (idx === -1) {
        return;
      }
      remoteSlots.splice(idx, 1);
      if (remoteSlots.length === 0) {
        setRemoteStream(null);
        setHasRemoteParticipant(false);
      }
    };

    (async () => {
      try {
        setStatus('connecting');
        const token = await fetchToken(sessionId, identity);
        if (cancelled) {
          return;
        }
        await room.connect(wsUrl, token);
        if (cancelled) {
          room.disconnect();
          return;
        }
        await room.localParticipant.setCameraEnabled(publishVideo);
        await room.localParticipant.setMicrophoneEnabled(
          publishVideo && getStageAudioEnabled()
        );

        room.localParticipant.videoTrackPublications.forEach((pub) => {
          if (pub.track && localVideoRef.current) {
            pub.track.attach(localVideoRef.current);
            void localVideoRef.current.play().catch(() => {});
          }
        });

        room.on(RoomEvent.LocalTrackPublished, (pub) => {
          if (pub.track && localVideoRef.current) {
            pub.track.attach(localVideoRef.current);
            void localVideoRef.current.play().catch(() => {});
          }
        });

        room.remoteParticipants.forEach((p) => {
          p.videoTrackPublications.forEach((pub) => {
            if (pub.track) {
              assignRemoteVideo(p, pub.track, pub.trackSid);
            }
          });
        });

        room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
          if (participant instanceof RemoteParticipant) {
            assignRemoteVideo(participant, track, _pub.trackSid);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (_track, _pub, participant) => {
          if (participant instanceof RemoteParticipant) {
            clearRemoteSlot(participant.identity, _pub.trackSid);
          }
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          if (participant instanceof RemoteParticipant) {
            [...remoteSlots]
              .filter((s) => s.participantId === participant.identity)
              .forEach((s) => clearRemoteSlot(s.participantId, s.trackSid));
          }
        });

        if (!cancelled) {
          setStatus('connected');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      remoteSlots.length = 0;
      room.disconnect();
      roomRef.current = null;
      setRemoteStream(null);
      setHasRemoteParticipant(false);
      setStatus('idle');
    };
  }, [
    enabled,
    sessionId,
    identity,
    publishVideo,
    adaptiveStreamOption,
    localVideoRef,
    remoteVideoRef,
  ]);

  return { status, remoteStream, hasRemoteParticipant };
}
