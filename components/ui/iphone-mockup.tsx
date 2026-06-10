'use client';

import { useEffect, useRef, useState } from 'react';

type IPhoneMockupProps = {
  /** @deprecated Use mp4Src/webmSrc + poster instead */
  src?: string;
  poster?: string;
  webmSrc?: string;
  mp4Src?: string;
  objectFit?: 'cover' | 'contain';
  playbackRate?: number;
  blurQuickType?: boolean;
  blurTimeRange?: [number, number];
  showPlayButton?: boolean;
};

export function IPhoneMockup({
  src,
  poster,
  webmSrc,
  mp4Src,
  objectFit = 'cover',
  playbackRate = 1,
  blurQuickType = false,
  blurTimeRange,
  showPlayButton = false,
}: IPhoneMockupProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root || !video) return;

    video.playbackRate = playbackRate;
    video.preload = 'none';

    // If showPlayButton, don't autoplay — wait for user click
    if (showPlayButton) return;

    let isPlaying = false;
    const playWhenVisible = () => {
      if (isPlaying) return;
      isPlaying = true;
      void video.play().catch(() => {
        isPlaying = false;
      });
    };

    const visibilityObs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          playWhenVisible();
          visibilityObs.disconnect();
        }
      },
      { rootMargin: '200px 0px' },
    );
    visibilityObs.observe(root);

    let onTimeUpdate: (() => void) | undefined;
    const overlay = overlayRef.current;
    if (blurQuickType && blurTimeRange && overlay) {
      onTimeUpdate = () => {
        const t = video.currentTime;
        const visible = t >= blurTimeRange[0] && t <= blurTimeRange[1];
        overlay.style.display = visible ? 'block' : 'none';
      };
      video.addEventListener('timeupdate', onTimeUpdate);
    }

    return () => {
      visibilityObs.disconnect();
      if (onTimeUpdate) video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [playbackRate, blurQuickType, blurTimeRange, showPlayButton]);

  function handlePlayClick() {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
    void video.play();
    setPlaying(true);
  }

  const legacySrc = src && !mp4Src && !webmSrc ? src : undefined;

  return (
    <div
      ref={rootRef}
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
      <div style={{ position: 'absolute', left: -2, top: '22%', width: 2, height: '7%', background: '#3a3a40', borderRadius: '1px 0 0 1px' }} />
      <div style={{ position: 'absolute', left: -2, top: '32%', width: 2, height: '9%', background: '#3a3a40', borderRadius: '1px 0 0 1px' }} />
      <div style={{ position: 'absolute', left: -2, top: '43%', width: 2, height: '9%', background: '#3a3a40', borderRadius: '1px 0 0 1px' }} />
      <div style={{ position: 'absolute', right: -2, top: '30%', width: 2, height: '14%', background: '#3a3a40', borderRadius: '0 1px 1px 0' }} />

      <div
        style={{
          position: 'absolute',
          inset: '2.5%',
          borderRadius: '12.5% / 5.8%',
          background: '#000',
          overflow: 'hidden',
        }}
      >
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
          poster={poster}
          loop
          muted
          playsInline
          preload="none"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit,
          }}
        >
          {webmSrc ? <source src={webmSrc} type="video/webm" /> : null}
          {mp4Src ? <source src={mp4Src} type="video/mp4" /> : null}
          {legacySrc ? <source src={legacySrc} /> : null}
        </video>

        {showPlayButton && !playing && (
          <button
            onClick={handlePlayClick}
            aria-label="Пусни видеото"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.30)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 15,
            }}
          >
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e11d48, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(225,29,72,0.5)',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <polygon points="6,4 20,12 6,20" />
              </svg>
            </div>
          </button>
        )}

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
