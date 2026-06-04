'use client';

import { useEffect, useRef } from 'react';

type IPhoneMockupProps = {
  src: string;
  objectFit?: 'cover' | 'contain';
  playbackRate?: number;
  blurQuickType?: boolean;
  blurTimeRange?: [number, number];
};

export function IPhoneMockup({ src, objectFit = 'cover', playbackRate = 1, blurQuickType = false, blurTimeRange }: IPhoneMockupProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;

    if (!blurQuickType || !blurTimeRange || !overlay) return;

    const onTimeUpdate = () => {
      const t = video.currentTime;
      const visible = t >= blurTimeRange[0] && t <= blurTimeRange[1];
      overlay.style.display = visible ? 'block' : 'none';
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [playbackRate, blurQuickType, blurTimeRange]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '9/19.5',
        borderRadius: '14.5% / 6.8%',
        background: 'linear-gradient(145deg, #2a2a2e 0%, #1a1a1e 60%, #0e0e10 100%)',
        boxShadow:
          '0 0 0 1.5px #3a3a40, 0 0 0 2.5px #1a1a1e, 0 32px 80px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.30)',
      }}
    >
      {/* side buttons */}
      <div style={{ position: 'absolute', left: -2, top: '22%', width: 2, height: '7%', background: '#3a3a40', borderRadius: '1px 0 0 1px' }} />
      <div style={{ position: 'absolute', left: -2, top: '32%', width: 2, height: '9%', background: '#3a3a40', borderRadius: '1px 0 0 1px' }} />
      <div style={{ position: 'absolute', left: -2, top: '43%', width: 2, height: '9%', background: '#3a3a40', borderRadius: '1px 0 0 1px' }} />
      <div style={{ position: 'absolute', right: -2, top: '30%', width: 2, height: '14%', background: '#3a3a40', borderRadius: '0 1px 1px 0' }} />

      {/* screen bezel */}
      <div
        style={{
          position: 'absolute',
          inset: '2.5%',
          borderRadius: '12.5% / 5.8%',
          background: '#000',
          overflow: 'hidden',
        }}
      >
        {/* dynamic island */}
        <div
          style={{
            position: 'absolute',
            top: '1.2%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '28%',
            height: '3.2%',
            background: '#000',
            borderRadius: 999,
            zIndex: 10,
          }}
        />

        <video
          ref={videoRef}
          src={src}
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit,
          }}
        />

        {/* Blur overlay for QuickType bar — shown/hidden via DOM ref */}
        {blurQuickType && (
          <div
            ref={overlayRef}
            style={{
              display: 'none',
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '33%',
              height: '7%',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              backgroundColor: 'rgba(60,60,65,0.95)',
              zIndex: 20,
            }}
          />
        )}
      </div>
    </div>
  );
}
