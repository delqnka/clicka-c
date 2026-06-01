import { revalidateSalonPublicCache, type SalonCacheIdentity } from '@/lib/revalidate-salon-public';
import { runAfterResponse } from '@/lib/run-after-response';

/** Invalidate public salon cache without blocking the admin API response. */
export function deferRevalidateSalonPublicCache(identity: SalonCacheIdentity) {
  runAfterResponse(
    Promise.resolve().then(() => {
      revalidateSalonPublicCache(identity);
    }),
  );
}
