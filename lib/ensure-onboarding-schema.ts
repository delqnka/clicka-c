import { sql } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

export async function ensureOnboardingTourSchema() {
  if (!ensurePromise) {
    ensurePromise = sql`
      ALTER TABLE salons
      ADD COLUMN IF NOT EXISTS onboarding_tour_done boolean DEFAULT false
    `.then(() => {}).catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
