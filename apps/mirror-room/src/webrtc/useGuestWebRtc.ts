import { useEffect, useRef, useState } from 'react';
import { getIceServers, getSignalUrl } from '@/webrtc/ice';

type GuestStatus = 'idle' | 'connecting' | 'signal-open' | 'streaming' | 'error';

/**
 * Guest: waits for an offer, then answers with the local camera stream.
 * Buffers SDP if the host is faster than `getUserMedia` + ref sync.
 * Flip camera: `replaceTrack` on the video sender.
 */
export function useGuestWebRtc(
  sessionId: string | undefined,
  localStream: MediaStream | null,
  active: boolean
) {
  const [status, setStatus] = useState<GuestStatus>('idle');
  const localStreamRef = useRef(localStream);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingOfferSdpRef = useRef<string | null>(null);
  const applyOfferRef = useRef<(sdp: string) => Promise<void>>(async () => {});

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    if (!active || !sessionId) {
      return;
    }

    let cancelled = false;
    const pendingIce: RTCIceCandidateInit[] = [];
    let pc: RTCPeerConnection | null = null;
    let ws: WebSocket | null = null;

    const flushIce = async () => {
      if (!pc?.remoteDescription) {
        return;
      }
      while (pendingIce.length && pc) {
        const c = pendingIce.shift()!;
        try {
          await pc.addIceCandidate(c);
        } catch {
          /* ignore */
        }
      }
    };

    const ensurePeer = () => {
      if (pc) {
        return pc;
      }
      const peer = new RTCPeerConnection({ iceServers: getIceServers() });
      const stream = localStreamRef.current;
      if (stream) {
        for (const t of stream.getTracks()) {
          peer.addTrack(t, stream);
        }
      }
      peer.onicecandidate = (ev) => {
        if (ev.candidate && ws?.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'ice-candidate',
              sessionId,
              candidate: ev.candidate.toJSON(),
            })
          );
        }
      };
      pc = peer;
      pcRef.current = peer;
      return peer;
    };

    const applyOffer = async (sdp: string) => {
      const stream = localStreamRef.current;
      if (!stream?.getVideoTracks()[0]) {
        pendingOfferSdpRef.current = sdp;
        return;
      }
      try {
        const peer = ensurePeer();
        await peer.setRemoteDescription({ type: 'offer', sdp });
        await flushIce();
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        ws?.send(JSON.stringify({ type: 'answer', sessionId, sdp: answer.sdp }));
        if (!cancelled) {
          setStatus('streaming');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    };

    applyOfferRef.current = applyOffer;

    queueMicrotask(() => {
      if (!cancelled) {
        setStatus('connecting');
      }
    });

    try {
      ws = new WebSocket(getSignalUrl());
    } catch {
      queueMicrotask(() => {
        if (!cancelled) {
          setStatus('error');
        }
      });
      return () => {
        cancelled = true;
      };
    }

    ws.onopen = () => {
      if (cancelled) {
        return;
      }
      setStatus('signal-open');
      ws?.send(JSON.stringify({ type: 'hello-guest', sessionId }));
    };

    ws.onmessage = async (ev) => {
      if (cancelled) {
        return;
      }
      let msg: { type: string; sdp?: string; candidate?: RTCIceCandidateInit };
      try {
        msg = JSON.parse(String(ev.data)) as typeof msg;
      } catch {
        return;
      }

      if (msg.type === 'offer' && msg.sdp) {
        await applyOffer(msg.sdp);
        return;
      }

      if (msg.type === 'ice-candidate' && msg.candidate) {
        if (pc?.remoteDescription) {
          try {
            await pc.addIceCandidate(msg.candidate);
          } catch {
            /* ignore */
          }
        } else {
          pendingIce.push(msg.candidate);
        }
        return;
      }

      if (msg.type === 'peer-left') {
        pendingIce.length = 0;
        pc?.close();
        pc = null;
        pcRef.current = null;
        setStatus('signal-open');
      }
    };

    ws.onerror = () => {
      if (!cancelled) {
        setStatus('error');
      }
    };

    return () => {
      cancelled = true;
      pendingIce.length = 0;
      pendingOfferSdpRef.current = null;
      pc?.close();
      pc = null;
      pcRef.current = null;
      ws?.close();
      setStatus('idle');
    };
  }, [active, sessionId]);

  useEffect(() => {
    if (!localStream?.getVideoTracks()[0]) {
      return;
    }
    const sdp = pendingOfferSdpRef.current;
    if (!sdp) {
      return;
    }
    pendingOfferSdpRef.current = null;
    void applyOfferRef.current(sdp);
  }, [localStream]);

  useEffect(() => {
    if (!localStream || status !== 'streaming') {
      return;
    }
    const peer = pcRef.current;
    if (!peer) {
      return;
    }
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) {
      return;
    }
    const sender = peer.getSenders().find((s) => s.track?.kind === 'video');
    if (!sender) {
      return;
    }
    if (sender.track?.id === videoTrack.id) {
      return;
    }
    void sender.replaceTrack(videoTrack);
  }, [localStream, status]);

  return status;
}
