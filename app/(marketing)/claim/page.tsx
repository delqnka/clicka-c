import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import ClaimPageClient from '@/components/admin/ClaimPageClient';
import { resolveSalonBySlugOrHost } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export default async function RootClaimPage() {
  const host = headers().get('host');
  const salon = await resolveSalonBySlugOrHost({
    host,
    includeInactive: true,
  });

  if (!salon) notFound();

  return (
    <ClaimPageClient
      slug={salon.slug}
      submitPayload={{}}
      signInHref="/admin/sign-in"
      siteHref="/"
    />
  );
}
