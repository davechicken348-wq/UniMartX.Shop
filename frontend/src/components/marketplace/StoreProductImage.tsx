import { useState } from 'react';
import MarketIcon from './MarketIcon';

type Props = { sources: Array<string | null | undefined>; alt: string };

function imageUrl(source: string) {
  // Older local uploads were persisted with a localhost hostname. Resolve them
  // against the configured API host so the same records work in deployed builds.
  try {
    const url = new URL(source, window.location.origin);
    if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      const api = new URL(import.meta.env.VITE_API_URL || 'http://localhost:5000/api', window.location.origin);
      url.protocol = api.protocol;
      url.host = api.host;
    }
    return url.href;
  } catch {
    return source;
  }
}

export default function StoreProductImage({ sources, alt }: Props) {
  const candidates = sources.filter((source): source is string => Boolean(source?.trim())).map(imageUrl);
  const [index, setIndex] = useState(0);
  const src = candidates[index];

  if (!src) return <span className="seller-canvas-product-image-fallback" aria-label={`${alt} image unavailable`}><MarketIcon name="package" size={26}/></span>;
  return <img src={src} alt={alt} loading="lazy" onError={() => setIndex((current) => current + 1)} />;
}
