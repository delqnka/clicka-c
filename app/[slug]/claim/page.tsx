import ClaimPageClient from '@/components/admin/ClaimPageClient';

export default function ClaimPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  return (
    <ClaimPageClient
      slug={slug}
      signInHref={`/${slug}/admin/sign-in`}
      siteHref={`/${slug}`}
    />
  );
}
