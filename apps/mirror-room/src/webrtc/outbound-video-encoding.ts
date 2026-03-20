import { getVideoPublishMaxBitrate } from '../config';

/**
 * 송신 비디오 트랙에 인코딩 상한을 걸어, 브라우저가 과도하게 다운스케일·저비트로 가는 것을 완화한다.
 * SDP 협상 직후(또는 replaceTrack 직후) 호출.
 */
export async function applyOutboundVideoEncoding(pc: RTCPeerConnection): Promise<void> {
  const maxBitrate = getVideoPublishMaxBitrate();
  const maxFramerate = 30;

  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== 'video') continue;

    const params = sender.getParameters();
    if (!params.encodings?.length) {
      params.encodings = [{}];
    }
    for (const enc of params.encodings) {
      enc.maxBitrate = maxBitrate;
      enc.maxFramerate = maxFramerate;
      enc.scaleResolutionDownBy = 1;
    }
    params.degradationPreference = 'maintain-resolution';

    try {
      await sender.setParameters(params);
    } catch {
      /* Safari 등 일부 필드 미지원 */
    }
  }
}
