import type { Config } from 'tailwindcss';
import adminConfig from './tailwind.admin.config';

/** Default Tailwind config (IDE / fallback) — production bundles use @config in CSS entries. */
export default adminConfig satisfies Config;
