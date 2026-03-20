import { useEffect, useState } from 'react';
import { getIceServers, getSignalUrl } from '@/webrtc/ice';
import { applyOutboundVideoEncoding } from '@/webrtc/outbound-video-encoding';

type HostSignalingStatus = 'idle' | 'ws-connecting' | 'ws-open' | 'peer-joined' | 'error';

/**
 * Host: registers with the signal server and initiates an offer when a guest is present.
 */
export function useHostWebRtc(sessionId: string, localStream: MediaStream | null) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<HostSignalingStatus>('idle');

  useEffect(() => {
    if (!localStream) {
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

    const attachPeer = () => {
      if (pc) {
        pc.close();
        setRemoteStream(null);
      }
      pc = new RTCPeerConnection({ iceServers: getIceServers() });
      for (const t of localStream.getTracks()) {
        pc.addTrack(t, localStream);
      }
      pc.ontrack = (ev) => {
        if (cancelled) {
          return;
        }
        const stream = ev.streams[0] ?? new MediaStream([ev.track]);
        setRemoteStream(stream);
      };
      pc.onicecandidate = (ev) => {
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
      return pc;
    };

    const runOffer = async () => {
      const peer = attachPeer();
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      ws?.send(JSON.stringify({ type: 'offer', sessionId, sdp: offer.sdp }));
    };

    const signalUrl = getSignalUrl();
    if (!signalUrl) {
      queueMicrotask(() => {
        if (!cancelled) {
          setStatus('error');
        }
      });
      return () => {
        cancelled = true;
      };
    }

    try {
      ws = new WebSocket(signalUrl);
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

    queueMicrotask(() => {
      if (!cancelled) {
        setStatus('ws-connecting');
      }
    });

    ws.onopen = () => {
      if (cancelled) {
        return;
      }
      setStatus('ws-open');
      ws?.send(JSON.stringify({ type: 'hello-host', sessionId }));
    };

    ws.onmessage = async (ev) => {
      if (cancelled) {
        return;
      }
      let msg: {
        type: string;
        sdp?: string;
        candidate?: RTCIceCandidateInit;
        role?: string;
      };
      try {
        msg = JSON.parse(String(ev.data)) as typeof msg;
      } catch {
        return;
      }

      if (msg.type === 'peer-joined') {
        setStatus('peer-joined');
        try {
          await runOffer();
        } catch {
          setStatus('error');
        }
        return;
      }

      if (msg.type === 'answer' && msg.sdp && pc) {
        try {
          await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
          await flushIce();
          await applyOutboundVideoEncoding(pc);
        } catch {
          setStatus('error');
        }
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
        setRemoteStream(null);
        setStatus('ws-open');
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
      pc?.close();
      ws?.close();
      setRemoteStream(null);
      setStatus('idle');
    };
  }, [localStream, sessionId]);

  return { remoteStream, status };
}
