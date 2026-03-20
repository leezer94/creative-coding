/**
 * Cheap full-frame motion proxy: downscale luma diff between frames.
 * Keeps analysis on a tiny buffer so the compositor stays responsive.
 */
export function createMotionSampler(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('2d context unavailable');
  }
  const prev = new Uint8Array(width * height);

  return (video: HTMLVideoElement): number => {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return 0;
    }
    ctx.drawImage(video, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    let diff = 0;
    for (let i = 0; i < width * height; i++) {
      const o = i * 4;
      const luma = (data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114) | 0;
      diff += Math.abs(luma - prev[i]);
      prev[i] = luma;
    }
    const norm = diff / (width * height * 255);
    return Math.min(1, norm * 12);
  };
}
