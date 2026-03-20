import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

type Props = {
  value: string;
  size?: number;
};

/**
 * QR as a raster image so we avoid CJS/ESM interop issues from SVG React wrappers under Vite.
 */
export default function SessionQrCode({ value, size = 128 }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000ff', light: '#ffffffff' },
    })
      .then((url) => {
        if (!cancelled) {
          setSrc(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        style={{
          width: size,
          height: size,
          background: '#eee',
          borderRadius: 4,
        }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      decoding="async"
      style={{ display: 'block', borderRadius: 4 }}
    />
  );
}
