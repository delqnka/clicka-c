import Link from 'next/link';

type ReviewPageProps = {
  searchParams?: {
    placeid?: string;
    salon?: string;
    slug?: string;
  };
};

export default function GoogleReviewBridgePage({ searchParams }: ReviewPageProps) {
  const placeId = String(searchParams?.placeid ?? '').trim();
  const salonName = String(searchParams?.salon ?? 'салона').trim();
  const salonSlug = String(searchParams?.slug ?? '').trim();
  const safeSalon = salonName || 'салона';

  if (!placeId) {
    return (
      <main style={{ maxWidth: 680, margin: '40px auto', padding: '0 16px', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Липсва Google Place ID</h1>
        <p style={{ color: '#555', lineHeight: 1.6 }}>
          Линкът за отзив е непълен. Моля, върнете се към имейла и опитайте отново.
        </p>
      </main>
    );
  }

  const directReviewUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  const mapsPlaceUrl = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
  const salonPageUrl = salonSlug ? `/${encodeURIComponent(salonSlug)}?tab=reviews` : '/';

  return (
    <main style={{ maxWidth: 680, margin: '40px auto', padding: '0 16px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Оставете отзив</h1>
      <p style={{ color: '#555', lineHeight: 1.6 }}>
        Благодарим ви, че посетихте <strong>{safeSalon}</strong>.
      </p>
      <p style={{ color: '#555', lineHeight: 1.6 }}>
        Натиснете бутона по-долу, за да отворите формата за отзив в Google.
      </p>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a
          href={directReviewUrl}
          style={{
            display: 'inline-block',
            background: '#000',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Отвори формата за отзив
        </a>
        <a
          href={mapsPlaceUrl}
          style={{
            display: 'inline-block',
            border: '1px solid #ddd',
            color: '#111',
            padding: '12px 18px',
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Отвори в Google Maps
        </a>
      </div>

      <p style={{ marginTop: 18, color: '#666', lineHeight: 1.6 }}>
        Ако приложението ви за поща блокира директното отваряне, натиснете „Отвори в Google Maps“, после
        „Write a review“.
      </p>

      {salonSlug ? (
        <p style={{ marginTop: 20, color: '#666' }}>
          Или вижте публичната страница на салона:{' '}
          <Link href={salonPageUrl} style={{ color: '#111', fontWeight: 600 }}>
            {safeSalon}
          </Link>
        </p>
      ) : null}
    </main>
  );
}
