import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'media',
  theme: {
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
        'glow-gold':   '0 16px 48px rgba(212,168,83,0.35)',
        'card':        '0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover':  '0 20px 60px rgba(124,58,237,0.12), 0 6px 20px rgba(0,0,0,0.08)',
      },
      animation: {
        'float-slow': 'float 12s ease-in-out infinite',
        'marquee':    'mq 28s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
