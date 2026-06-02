'use client';

type IPhoneMockupProps = {
  src: string;
  /** e.g. "cover" or "contain" */
  objectFit?: 'cover' | 'contain';
};

export function IPhoneMockup({ src, objectFit = 'cover' }: IPhoneMockupProps) {
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
      </div>
    </div>
  );
}
