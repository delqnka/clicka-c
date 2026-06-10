'use client';

import { useEffect, useMemo, useState } from 'react';
import SalonPublicParity, {
  type GoogleReviewLite,
  type SalonOfferRow,
  type SalonReviewRow,
} from '@/app/components/SalonPublicParity';
import { parseSalonServices } from '@/lib/salon-services';
import { enrichServiceCategories, buildServiceCategoryTabs } from '@/lib/salon-service-categories';
import { normalizeSalonVisitorInfo, normalizeVisitorAdditionalInfo } from '@/lib/salon-visitor-info';
import { mergeOpeningHours } from '@/lib/salon-opening-hours';

const CREATE_PREVIEW_KEY = 'clicka-create-preview-v1';

type WorkingDay = { open: string; close: string; closed: boolean };
type Service = { name: string; price: number; duration_min: number };

type PreviewPayload = {
  template: { primary: string; light: string; name: string };
  form: {
    name: string;
    category: string;
    city: string;
    address: string;
    phone: string;
    about: string;
    email?: string;
  };
  hours: Record<string, WorkingDay>;
  coverUrl: string;
  logoUrl: string;
  galleryUrls: string[];
  googleMapsUrl: string;
  services: Service[];
};

export default function CreatePreviewPage() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(CREATE_PREVIEW_KEY);
      if (raw) {
        setPayload(JSON.parse(raw) as PreviewPayload);
      }
    } catch {
      setPayload(null);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  const salon = useMemo(() => {
    if (!payload) return null;
    const gallery = payload.galleryUrls.filter(Boolean);
    return {
      id: 'preview-salon',
      slug: 'preview-salon',
      name: payload.form.name || 'Вашият салон',
      category: payload.form.category || 'Фризьорски салон',
      phone: payload.form.phone || '+359 88 888 8888',
      email: payload.form.email || 'preview@clicka.bg',
      city: payload.form.city || '',
      address: payload.form.address || '',
      about:
        payload.form.about ||
        'Това е preview на реалната публична страница. Тук клиентите ще виждат услугите, снимките и информацията за салона ти.',
      cover_image_url: payload.coverUrl || gallery[0] || '',
      logo_image_url: payload.logoUrl || payload.coverUrl || gallery[0] || '',
      gallery_images: gallery,
      portfolio_images: gallery,
      instagram_username: '',
      facebook_username: '',
      google_maps_url: payload.googleMapsUrl || '',
      working_hours: payload.hours,
      opening_hours: payload.hours,
      services: payload.services.map((service, index) => ({
        id: `preview-service-${index}`,
        name: service.name,
        price: service.price,
        duration_min: service.duration_min,
      })),
      primary_color: payload.template.primary,
      primary_color_light: payload.template.light,
      rating: 5,
      review_count: 12,
      verified: true,
      venue_extras: {},
    };
  }, [payload]);

  const offers = useMemo<SalonOfferRow[]>(
    () =>
      salon
        ? [
            {
              id: 'preview-offer',
              title: 'Нова клиентска оферта',
              description: 'Примерна оферта за визуализация на публичната страница.',
              discount: 20,
              images: salon.cover_image_url ? [salon.cover_image_url] : [],
              is_active: true,
            },
          ]
        : [],
    [salon]
  );

  const reviews = useMemo<SalonReviewRow[]>(() => [], []);
  const googleReviews = useMemo<GoogleReviewLite[]>(() => [], []);

  const servicesEnriched = useMemo(
    () => enrichServiceCategories(parseSalonServices(salon?.services ?? [])),
    [salon],
  );
  const serviceCategories = useMemo(() => buildServiceCategoryTabs(servicesEnriched), [servicesEnriched]);
  const visitorInfo = useMemo(() => normalizeSalonVisitorInfo(undefined), []);
  const openingHoursMerged = useMemo(
    () => mergeOpeningHours(salon?.working_hours as Record<string, { open?: string; close?: string; closed?: boolean }> | undefined, salon?.opening_hours),
    [salon],
  );
  const salonName = salon?.name || 'Вашият салон';

  if (!hasLoaded) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#fff',
          fontFamily: 'system-ui, sans-serif',
          color: '#1a1a1a',
          textAlign: 'center',
        }}
      >
        Зареждам реалния preview...
      </main>
    );
  }

  if (!salon) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#fff',
          fontFamily: 'system-ui, sans-serif',
          color: '#1a1a1a',
          textAlign: 'center',
        }}
      >
        <div>
          <p style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700 }}>Няма подготвен demo сайт</p>
          <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.6 }}>
            Върни се в create, попълни данните и отвори demo сайта оттам.
          </p>
          <a
            href="/create"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 18px',
              borderRadius: 999,
              background: '#111',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Към create
          </a>
        </div>
      </main>
    );
  }

  return (
    <SalonPublicParity
      salonSlug="preview-salon"
      salon={salon}
      offers={offers}
      reviews={reviews}
      googleReviews={googleReviews}
      staticMapUrl={null}
      servicesEnriched={servicesEnriched}
      serviceCategories={serviceCategories}
      faqItems={[]}
      visitorInfo={visitorInfo}
      visitorAdditionalInfo={normalizeVisitorAdditionalInfo(undefined)}
      blogSectionTitle="Блог"
      brandNames={[]}
      openingHoursMerged={openingHoursMerged}
      bookingBlocks={[]}
      publicTeamMembers={[{ id: 'owner', name: salonName, role: '', bio: '', photoUrl: '' }]}
    />
  );
}
