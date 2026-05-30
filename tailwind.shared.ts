import type { Config } from 'tailwindcss';

/** Shared theme for salon + marketing Tailwind builds. */
export const tailwindSharedTheme: NonNullable<Config['theme']> = {
  extend: {
    fontFamily: {
      sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
    },
    colors: {
      background: '#FAFAF8',
      foreground: '#0D0D12',
      brand: '#7C3AED',
      accent: '#D4A853',
      surface: '#FFFFFF',
      muted: '#667085',
    },
    borderRadius: {
      '2xl': '20px',
      '3xl': '24px',
      '4xl': '32px',
    },
    boxShadow: {
      'glow-purple': '0 16px 48px rgba(124,58,237,0.38)',
      'glow-gold': '0 16px 48px rgba(212,168,83,0.35)',
      card: '0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      'card-hover': '0 20px 60px rgba(124,58,237,0.12), 0 6px 20px rgba(0,0,0,0.08)',
    },
    animation: {
      'accordion-down': 'accordion-down 0.2s ease-out',
      'accordion-up': 'accordion-up 0.2s ease-out',
      'float-slow': 'float 12s ease-in-out infinite',
      marquee: 'mq 28s linear infinite',
      first: 'moveVertical 30s ease infinite',
      second: 'moveInCircle 20s reverse infinite',
      third: 'moveInCircle 40s linear infinite',
      fourth: 'moveHorizontal 40s ease infinite',
      fifth: 'moveInCircle 20s ease infinite',
    },
    keyframes: {
      'accordion-down': {
        from: { height: '0' },
        to: { height: 'var(--radix-accordion-content-height)' },
      },
      'accordion-up': {
        from: { height: 'var(--radix-accordion-content-height)' },
        to: { height: '0' },
      },
      moveHorizontal: {
        '0%': { transform: 'translateX(-50%) translateY(-10%)' },
        '50%': { transform: 'translateX(50%) translateY(10%)' },
        '100%': { transform: 'translateX(-50%) translateY(-10%)' },
      },
      moveInCircle: {
        '0%': { transform: 'rotate(0deg)' },
        '50%': { transform: 'rotate(180deg)' },
        '100%': { transform: 'rotate(360deg)' },
      },
      moveVertical: {
        '0%': { transform: 'translateY(-50%)' },
        '50%': { transform: 'translateY(50%)' },
        '100%': { transform: 'translateY(-50%)' },
      },
    },
  },
};
