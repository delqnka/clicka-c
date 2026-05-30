import type { Config } from 'tailwindcss';
import marketingConfig from './tailwind.marketing.config';

/** Default Tailwind config (IDE / fallback) — production bundles use @config in CSS entries. */
export default marketingConfig satisfies Config;
