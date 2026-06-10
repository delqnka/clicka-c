'use client';

import { useRef, useState } from 'react';

export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function handlePlay() {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = 2;
    v.play();
    setPlaying(true);
  }

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.18), 0 20px 40px rgba(0,0,0,0.22)', background: '#000', maxWidth: 200, margin: '0 auto' }}>
      <video
        ref={videoRef}
        playsInline
        controls={playing}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <source src="/video-clicka.mov" type="video/mp4" />
      </video>

      {/* Play overlay */}
      {!playing && (
        <button
          onClick={handlePlay}
          aria-label="Пусни видеото"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.35)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #e11d48, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(225,29,72,0.5)',
          }}>
            {/* Triangle play icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          </div>
        </button>
      )}
    </div>
  );
}
