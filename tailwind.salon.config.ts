import type { Config } from 'tailwindcss';
import { tailwindSharedTheme } from './tailwind.shared';

const config: Config = {
  content: [
    './app/(salon-public)/**/*.{js,ts,jsx,tsx,mdx}',
    './app/components/SalonPublicParity.tsx',
    './components/salon/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: tailwindSharedTheme,
  plugins: [],
};

export default config;
