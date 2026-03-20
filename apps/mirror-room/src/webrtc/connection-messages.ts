import type { HostSignalingStatus } from '@/webrtc/use-host-webrtc';
import type { GuestWebRtcStatus } from '@/webrtc/use-guest-webrtc';
import type { LiveKitRoomStatus } from '@/webrtc/use-livekit-room';

function liveKitStatusLabel(s: LiveKitRoomStatus): string {
  switch (s) {
    case 'idle':
      return '대기';
    case 'connecting':
      return '연결 중…';
    case 'connected':
      return '연결됨';
    case 'error':
      return '오류';
    default:
      return s;
  }
}

function hostP2pStatusLabel(s: HostSignalingStatus): string {
  switch (s) {
    case 'idle':
      return '대기';
    case 'ws-connecting':
      return '시그널 연결 중…';
    case 'ws-open':
      return '시그널 연결됨 (관객 대기)';
    case 'peer-joined':
      return '관객과 연결됨';
    case 'error':
      return '오류';
    default:
      return s;
  }
}

function guestP2pStatusLabel(s: GuestWebRtcStatus): string {
  switch (s) {
    case 'idle':
      return '대기';
    case 'connecting':
      return '연결 중…';
    case 'signal-open':
      return '시그널 연결됨';
    case 'streaming':
      return '스트리밍';
    case 'error':
      return '오류';
    default:
      return s;
  }
}

/** Host drawer “WebRTC:” line — SFU vs legacy P2P. */
export function formatHostConnectionLine(
  useSfu: boolean,
  liveKitStatus: LiveKitRoomStatus,
  hostP2pStatus: HostSignalingStatus
): string {
  if (useSfu) {
    return `LiveKit · ${liveKitStatusLabel(liveKitStatus)}`;
  }
  return `P2P · ${hostP2pStatusLabel(hostP2pStatus)}`;
}

/** Guest details panel — unified with host tone. */
export function formatGuestConnectionLine(
  useSfu: boolean,
  liveKitStatus: LiveKitRoomStatus,
  guestP2pStatus: GuestWebRtcStatus
): string {
  if (useSfu) {
    return `LiveKit · ${liveKitStatusLabel(liveKitStatus)}`;
  }
  return `P2P · ${guestP2pStatusLabel(guestP2pStatus)}`;
}
