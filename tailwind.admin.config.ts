import type { Config } from 'tailwindcss';
import { tailwindSharedTheme } from './tailwind.shared';

const config: Config = {
  content: [
    './app/admin/**/*.{js,ts,jsx,tsx,mdx}',
    './app/pa/**/*.{js,ts,jsx,tsx,mdx}',
    './app/booking/**/*.{js,ts,jsx,tsx,mdx}',
    './app/staff-portal/**/*.{js,ts,jsx,tsx,mdx}',
    './app/review/**/*.{js,ts,jsx,tsx,mdx}',
    './components/ui/**/*.{js,ts,jsx,tsx,mdx}',
    './components/admin/**/*.{js,ts,jsx,tsx,mdx}',
    './components/brand/**/*.{js,ts,jsx,tsx,mdx}',
    './components/legal/**/*.{js,ts,jsx,tsx,mdx}',
    './components/platform-admin/**/*.{js,ts,jsx,tsx,mdx}',
    './components/booking/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: tailwindSharedTheme,
  plugins: [],
};

export default config;
