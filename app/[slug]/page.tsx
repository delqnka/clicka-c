import { sql } from '@/lib/db';
import SalonPage from '@/app/components/SalonPage';

export default async function SalonSlugPage({ params }: { params: { slug: string } }) {
  const salonSlug = params.slug;

  const rows = await sql`
    SELECT
      id, slug, name, category, phone, email,
      city, address, about,
      cover_image_url, logo_image_url, gallery_images,
      instagram_username, facebook_username, google_maps_url,
      working_hours, services, team,
      template_id, primary_color, primary_color_light,
      plan_type, custom_domain
    FROM salons
    WHERE slug = ${salonSlug} AND is_active = true
  `;

  if (rows.length === 0) {
    return (
      <main style={{ fontFamily: 'system-ui, sans-serif', padding: '60px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Салонът не е намерен</h1>
        <p style={{ color: '#6b7280' }}>
          Проверете адреса или се свържете с{' '}
          <a href="https://clicka.bg" style={{ color: '#7c3aed' }}>Clicka.bg</a>.
        </p>
      </main>
    );
  }

  return <SalonPage salon={rows[0] as any} />;
}

