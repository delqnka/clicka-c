'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getHeroVideoSources } from '@/lib/clicka-marketing-site';

type Props = {
  className?: string;
};

export function HeroBackground({ className = '' }: Props) {
  const { webm, mp4, poster, has } = getHeroVideoSources();
  const [showVideo, setShowVideo] = useState(has);
  const [useCanvas, setUseCanvas] = useState(!has);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const phaseRef = useRef(0);

  const onVideoError = useCallback(() => {
    setShowVideo(false);
    setUseCanvas(true);
  }, []);

  const onVideoCanPlay = useCallback(() => {
    setUseCanvas(false);
  }, []);

  useEffect(() => {
    if (!useCanvas) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const applySize = () => {
      const w = Math.max(1, canvas.clientWidth);
      const h = Math.max(1, canvas.clientHeight);
      const d = Math.min(2, window.devicePixelRatio || 1);
      sizeRef.current = { w: Math.floor(w * d), h: Math.floor(h * d), dpr: d };
      canvas.width = sizeRef.current.w;
      canvas.height = sizeRef.current.h;
    };
    applySize();
    const ro = new ResizeObserver(applySize);
    ro.observe(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let run = true;

    const loop = (t: number) => {
      if (!run) return;
      raf = requestAnimationFrame(loop);
      const { w, h } = sizeRef.current;
      if (w < 1 || h < 1) return;
      phaseRef.current = t * 0.00012;
      const p = phaseRef.current;
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, 'hsl(220, 30%, 8%)');
      g.addColorStop(0.4 + Math.sin(p) * 0.02, 'hsl(200, 45%, 10%)');
      g.addColorStop(1, 'hsl(260, 25%, 7%)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const cx = w * 0.55 + Math.cos(p * 0.6) * w * 0.12;
      const cy = h * 0.35 + Math.sin(p * 0.4) * h * 0.1;
      const r = Math.min(w, h) * 0.5;
      const spot = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      spot.addColorStop(0, 'rgba(0, 170, 255, 0.12)');
      spot.addColorStop(0.4, 'rgba(120, 100, 255, 0.04)');
      spot.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      run = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [useCanvas]);

  return (
    <div className={`absolute inset-0 ${className}`} aria-hidden>
      {showVideo && has && (
        <video
          className="h-full w-full object-cover"
          style={{ filter: 'saturate(1.1) contrast(1.02)' }}
          autoPlay
          loop
          muted
          playsInline
          poster={poster || undefined}
          preload="metadata"
          onError={onVideoError}
          onCanPlay={onVideoCanPlay}
        >
          {webm && <source src={webm} type="video/webm" />}
          {mp4 && <source src={mp4} type="video/mp4" />}
        </video>
      )}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ opacity: useCanvas ? 1 : 0, pointerEvents: 'none' }}
        aria-hidden
      />
    </div>
  );
}
