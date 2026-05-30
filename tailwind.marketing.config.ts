import type { Config } from 'tailwindcss';
import { tailwindSharedTheme } from './tailwind.shared';

const config: Config = {
  content: [
    './app/(marketing)/**/*.{js,ts,jsx,tsx,mdx}',
    './app/components/HomePage.tsx',
    './app/admin/**/*.{js,ts,jsx,tsx,mdx}',
    './components/marketing/**/*.{js,ts,jsx,tsx,mdx}',
    './components/ui/**/*.{js,ts,jsx,tsx,mdx}',
    './components/admin/**/*.{js,ts,jsx,tsx,mdx}',
    './components/brand/**/*.{js,ts,jsx,tsx,mdx}',
    './components/legal/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: tailwindSharedTheme,
  plugins: [],
};

export default config;
