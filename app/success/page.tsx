import { sql } from '@/lib/db';
import SuccessClient from './SuccessClient';

export default async function SuccessPage({
  searchParams,
}: {
  searchParams?: { salon?: string | string[]; session_id?: string | string[] };
}) {
  const slug =
    typeof searchParams?.salon === 'string'
      ? searchParams.salon
      : Array.isArray(searchParams?.salon)
        ? searchParams?.salon[0]
        : '';

  let salonEmail = '';
  if (slug) {
    try {
      const rows = await sql`SELECT email FROM salons WHERE slug = ${slug} LIMIT 1`;
      if (rows.length > 0) salonEmail = String(rows[0].email ?? '');
    } catch {
      /* salon lookup failed — client will handle missing email gracefully */
    }
  }

  return <SuccessClient slug={slug || ''} email={salonEmail} />;
}
