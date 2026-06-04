import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const alt = 'clicka.bg | Собствен сайт с резервации за твоя салон';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  const telegramImg = readFileSync(
    join(process.cwd(), 'public', 'Screenshot 2026-06-03 at 23.49.21.png')
  );
  const telegramSrc = `data:image/png;base64,${telegramImg.toString('base64')}`;

  const manropeBold = readFileSync(join(process.cwd(), 'node_modules/@fontsource/manrope/files/manrope-cyrillic-800-normal.woff'));
  const manropeSemiBold = readFileSync(join(process.cwd(), 'node_modules/@fontsource/manrope/files/manrope-cyrillic-600-normal.woff'));
  const manropeRegular = readFileSync(join(process.cwd(), 'node_modules/@fontsource/manrope/files/manrope-cyrillic-400-normal.woff'));

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          background: 'linear-gradient(135deg, #be123c 0%, #db2777 45%, #9333ea 100%)',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Manrope',
        }}
      >
        {/* Subtle glow top-left */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            left: '-100px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* LEFT — text */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: '80px',
            paddingRight: '40px',
            width: '660px',
          }}
        >
          {/* Logo */}
          <div
            style={{
              fontSize: '36px',
              fontWeight: 800,
              color: 'rgba(255,255,255,0.95)',
              letterSpacing: '-1px',
              marginBottom: '28px',
              display: 'flex',
            }}
          >
            clicka.bg
          </div>

          {/* Main headline */}
          <div
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.15,
              letterSpacing: '-1.5px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span style={{ display: 'flex' }}>Собствен сайт.</span>
            <span style={{ display: 'flex' }}>Онлайн резервации.</span>
          </div>

          {/* Subline */}
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '32px',
              display: 'flex',
            }}
          >
            Управлявай всичко от Telegram.
          </div>

          {/* Checkmarks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            {['0% комисионна', 'AI асистент', 'Онлайн резервации 24/7'].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="12" fill="rgba(255,255,255,0.22)" />
                  <polyline points="6,12 10,16 18,8" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: '20px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', display: 'flex' }}>
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* Price pill */}
          <div
            style={{
              padding: '10px 24px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.30)',
              fontSize: '20px',
              fontWeight: 600,
              color: '#ffffff',
              display: 'flex',
              alignSelf: 'flex-start',
            }}
          >
            От 0,82 € на ден
          </div>
        </div>

        {/* RIGHT — half iPhone (cropped at right edge) */}
        <div
          style={{
            position: 'absolute',
            right: '-55px',
            top: '18px',
            width: '355px',
            height: '710px',
            borderRadius: '44px',
            overflow: 'hidden',
            boxShadow: '-24px 0 80px rgba(0,0,0,0.45)',
            display: 'flex',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '44px',
              border: '3px solid rgba(255,255,255,0.12)',
              zIndex: 2,
              display: 'flex',
            }}
          />
          <img
            src={telegramSrc}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Manrope', data: manropeRegular, weight: 400 },
        { name: 'Manrope', data: manropeSemiBold, weight: 600 },
        { name: 'Manrope', data: manropeBold, weight: 800 },
      ],
    }
  );
}
