import 'server-only';

import { neon, neonConfig } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL не е зададена');
}

neonConfig.fetchConnectionCache = true;

export const sql = neon(process.env.DATABASE_URL);
