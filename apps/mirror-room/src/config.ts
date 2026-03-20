export const COMPOSITOR_MODE = {
  DualGridScan: 'dual-grid-scan',
  DelayedEcho: 'delayed-echo',
} as const;

export type CompositorMode = (typeof COMPOSITOR_MODE)[keyof typeof COMPOSITOR_MODE];

/** Active visual mode driven by `CompositorCanvas`. */
export const MODE: CompositorMode = COMPOSITOR_MODE.DualGridScan;

/** Upper bound for strobe-style cutouts (Hz); conservative default. */
export const MAX_STROBE_HZ = 4;

export const ANALYSIS = {
  /** Longer edge for motion sampling (keeps CPU low). */
  motionSampleSize: 96,
  /** How often to run face landmarker per second (per lane, approximate). */
  faceDetectHz: 12,
} as const;

export const DEBUG = false;
export const DEBUG_PERF = false;

/** Host “Preview cams” overlay: 무대(로컬 크게 + 관객 PIP) vs 듀얼(2열 동등). */
export const HOST_PREVIEW_LAYOUT = {
  Stage: 'stage',
  Dual: 'dual',
} as const;

export type HostPreviewLayout =
  (typeof HOST_PREVIEW_LAYOUT)[keyof typeof HOST_PREVIEW_LAYOUT];

/** 설치·전시 기본: 무대 모드. */
export const DEFAULT_HOST_PREVIEW_LAYOUT: HostPreviewLayout = HOST_PREVIEW_LAYOUT.Stage;

/** SFU 시 합성기 Lane A에 추가로 붙일 수 있는 원격 카메라 슬롯(비디오 엘리먼트) 개수. */
export const STAGE_LANE_A_EXTRA_VIDEOS = 3;

/** Phase 3: 무대 마이크(호스트/게스트). 빌드 시 `VITE_STAGE_AUDIO=true`로 켤 수 있음. */
export function getStageAudioEnabled(): boolean {
  return import.meta.env.VITE_STAGE_AUDIO === 'true';
}

/**
 * Camera capture + outbound encoding. `ideal`로 선호 해상도를 박고, `max`로 상한만 둔다.
 * WebRTC는 대역에 따라 자동으로 낮출 수 있으므로 송신 측에서 비트레이트·스케일을 맞춘다.
 */
export const VIDEO_PUBLISH = {
  idealWidth: 1280,
  idealHeight: 720,
  maxWidth: 1920,
  maxHeight: 1080,
  maxFrameRate: 30,
  /** 송신 비디오 인코더 상한 (bps). 720p~약 2.8Mbps, 필요 시 `VITE_VIDEO_MAX_BITRATE`로 조정. */
  maxBitrate: 2_800_000,
} as const;

/** Guest publish / applyConstraints 상한 (호환용). */
export const GUEST_VIDEO = {
  maxWidth: VIDEO_PUBLISH.maxWidth,
  maxHeight: VIDEO_PUBLISH.maxHeight,
  maxFrameRate: VIDEO_PUBLISH.maxFrameRate,
} as const;

/** 빌드 시 송신 비트레이트 상한(예: `3500000`). 미설정이면 `VIDEO_PUBLISH.maxBitrate`. */
export function getVideoPublishMaxBitrate(): number {
  const raw = import.meta.env.VITE_VIDEO_MAX_BITRATE?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 800_000 && n <= 8_000_000) {
      return n;
    }
  }
  return VIDEO_PUBLISH.maxBitrate;
}

/** 게스트: `getUserMedia` / `applyConstraints`에 쓰는 선호 해상도. */
export function getGuestVideoConstraints(
  facing: 'user' | 'environment'
): MediaTrackConstraints {
  return {
    facingMode: facing,
    width: { ideal: VIDEO_PUBLISH.idealWidth, max: VIDEO_PUBLISH.maxWidth },
    height: { ideal: VIDEO_PUBLISH.idealHeight, max: VIDEO_PUBLISH.maxHeight },
    frameRate: {
      ideal: VIDEO_PUBLISH.maxFrameRate,
      max: VIDEO_PUBLISH.maxFrameRate,
    },
  };
}

/** 호스트: 전면 카메라 기본 캡처 제약. */
export function getHostVideoConstraints(): MediaTrackConstraints {
  return {
    width: { ideal: VIDEO_PUBLISH.idealWidth, max: VIDEO_PUBLISH.maxWidth },
    height: { ideal: VIDEO_PUBLISH.idealHeight, max: VIDEO_PUBLISH.maxHeight },
    frameRate: {
      ideal: VIDEO_PUBLISH.maxFrameRate,
      max: VIDEO_PUBLISH.maxFrameRate,
    },
  };
}

/**
 * LiveKit **게스트** 전용: 원격(호스트) 구독 품질.
 * Adaptive stream이 비디오 엘리먼트의 *논리* 크기(모바일에서 좁음)만 보고 낮은 시뮬캐스트 레이어를 고르는 경우가 있어,
 * 호스트 로컬 미리보기보다 비트레이트가 낮아 보일 수 있다.
 * - 기본: `pixelDensity: 'screen'`으로 DPR을 반영해 더 높은 레이어 요청
 * - `VITE_LIVEKIT_REMOTE_FULL_QUALITY=true`: adaptive 끔 → 최고 레이어(대역·CPU 증가)
 */
const LIVEKIT_GUEST_ADAPTIVE_BOOST = {
  pixelDensity: 'screen' as const,
  pauseVideoInBackground: false,
};

export function getLiveKitGuestAdaptiveStream():
  | boolean
  | typeof LIVEKIT_GUEST_ADAPTIVE_BOOST {
  if (import.meta.env.VITE_LIVEKIT_REMOTE_FULL_QUALITY === 'true') {
    return false;
  }
  return LIVEKIT_GUEST_ADAPTIVE_BOOST;
}
