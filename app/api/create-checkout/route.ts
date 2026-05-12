import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import Stripe from 'stripe';
import crypto from 'crypto';
import {
  getPlatformClaimUrl,
  getPlatformPublicUrl,
} from '@/lib/domain-routing';
import { ensurePlatformSubdomain } from '@/lib/vercel-domains';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Липсва STRIPE_SECRET_KEY');
  }
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

const PLAN_PRICES: Record<string, number> = {
  solo:   29900,
  ekip:   39900,
  studio: 59900,
};

const PLAN_NAMES: Record<string, string> = {
  solo:   'SOLO — 1 специалист',
  ekip:   'ЕКИП — до 3 специалисти',
  studio: 'СТУДИО — неограничени специалисти',
};

const MONO_THEME = { primary: '#111111', light: '#f3f4f6' };

/* ── Transliterate Bulgarian → Latin slug ─────────────── */
const TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',
  и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',
  р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',
  ш:'sh',щ:'sht',ъ:'a',ь:'',ю:'yu',я:'ya',
};

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .split('')
    .map(c => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'salon';
}

export async function POST(request: NextRequest) {
  let body: {
    templateId: number;
    planType: string;
    smsAddon: boolean;
    salonData: {
      name: string;
      category: string;
      phone: string;
      email: string;
      city: string;
      address: string;
      about: string;
      instagram: string;
      facebook: string;
      workingHours: Record<string, { open: string; close: string; closed: boolean }>;
      coverImageUrl: string;
      logoImageUrl: string;
      galleryImages: string[];
      priceListUrl?: string;
      priceListUrls?: string[];
      googleMapsUrl: string;
      services?: { name: string; price: number; duration_min: number }[];
    };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const { templateId, planType, salonData } = body;

  if (!PLAN_PRICES[planType]) {
    return NextResponse.json({ error: 'Невалиден план' }, { status: 400 });
  }

  const normalizedAbout =
    String(salonData.about || '').trim() ||
    `${salonData.name} предлага онлайн резервации през собствен сайт.`;
  const normalizedAddress = String(salonData.address || '').trim();
  const normalizedInstagram = String(salonData.instagram || '').trim();
  const normalizedFacebook = String(salonData.facebook || '').trim();
  const normalizedGoogleMapsUrl = String(salonData.googleMapsUrl || '').trim();
  const normalizedGalleryImages = Array.isArray(salonData.galleryImages)
    ? salonData.galleryImages.map(item => String(item || '').trim()).filter(Boolean)
    : [];
  const normalizedCoverImageUrl =
    String(salonData.coverImageUrl || '').trim() ||
    normalizedGalleryImages[0] ||
    String(salonData.logoImageUrl || '').trim() ||
    '';
  const normalizedLogoImageUrl =
    String(salonData.logoImageUrl || '').trim() ||
    normalizedCoverImageUrl ||
    normalizedGalleryImages[0] ||
    '';

  /* ── Services: prefer client-provided, else analyze ──── */
  let services: { name: string; price: number; duration_min: number }[] = Array.isArray(salonData.services)
    ? salonData.services
    : [];

  const uploadedPriceLists = Array.isArray(salonData.priceListUrls)
    ? salonData.priceListUrls
    : salonData.priceListUrl
      ? [salonData.priceListUrl]
      : [];

  if (services.length === 0 && uploadedPriceLists.length > 0) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const merged: { name: string; price: number; duration_min: number }[] = [];
      const seen = new Set<string>();

      for (const imageUrl of uploadedPriceLists) {
        const analyzeRes = await fetch(`${appUrl}/api/analyze-price-list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        });
        if (analyzeRes.ok) {
          const part = (await analyzeRes.json()) as { name: string; price: number; duration_min: number }[];
          for (const s of part) {
            const key = `${String(s.name).toLowerCase()}|${Number(s.price) || 0}|${Number(s.duration_min) || 30}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push({
                name: String(s.name || '').trim(),
                price: Number(s.price) || 0,
                duration_min: Math.max(5, Number(s.duration_min) || 30),
              });
            }
          }
        }
      }
      services = merged;
    } catch (err) {
      console.error('[create-checkout] Price list analysis failed:', err);
    }
  }

  try {
    /* ── Generate unique slug ───────────────────────────── */
    const base = toSlug(salonData.name);
    const suffix = Math.random().toString(36).slice(2, 6);
    const slug = `${base}-${suffix}`;
    const salonId = crypto.randomUUID();
    const publicUrl = getPlatformPublicUrl(slug);
    const claimUrl = getPlatformClaimUrl(slug);

    const colors = MONO_THEME;

    /* ── Save salon to Neon ─────────────────────────────── */
    const rows = await sql`
      INSERT INTO salons (
        id, slug, name, category, phone, email,
        city, address, about,
        cover_image_url, logo_image_url, gallery_images,
        instagram_username, facebook_username,
        google_maps_url,
        working_hours, services,
        template_id, primary_color, primary_color_light,
        plan_type, is_active, site_status
      ) VALUES (
        ${salonId},
        ${slug},
        ${salonData.name},
        ${salonData.category},
        ${salonData.phone},
        ${salonData.email},
        ${salonData.city},
        ${normalizedAddress},
        ${normalizedAbout},
        ${normalizedCoverImageUrl},
        ${normalizedLogoImageUrl},
        ${JSON.stringify(normalizedGalleryImages)}::jsonb,
        ${normalizedInstagram},
        ${normalizedFacebook},
        ${normalizedGoogleMapsUrl},
        ${JSON.stringify(salonData.workingHours)}::jsonb,
        ${JSON.stringify(services)}::jsonb,
        ${templateId},
        ${colors.primary},
        ${colors.light},
        ${planType},
        false,
        'pending'
      )
      RETURNING id
    `;
    const createdSalonId = rows[0].id ?? salonId;

    await ensurePlatformSubdomain(slug);

    /* ── Demo / скриншоти: без Stripe (само при CLICKA_SKIP_CHECKOUT на сървъра) ── */
    const skipCheckout =
      process.env.CLICKA_SKIP_CHECKOUT === '1' ||
      process.env.CLICKA_SKIP_CHECKOUT === 'true';

    if (skipCheckout) {
      await sql`
        UPDATE salons
        SET
          is_active = true,
          site_status = 'active',
          stripe_session_id = NULL
        WHERE id = ${createdSalonId}
      `;
      return NextResponse.json({ skipCheckout: true, slug, publicUrl, claimUrl });
    }

    /* ── Stripe checkout ────────────────────────────────── */
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      currency: 'eur',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: PLAN_PRICES[planType],
            product_data: {
              name: `Clicka.bg — ${PLAN_NAMES[planType]}`,
              description: `Сайт за ${salonData.name}`,
            },
          },
        },
      ],
      metadata: {
        salonSlug: slug,
        salonId: String(createdSalonId),
        templateId: String(templateId),
        planType,
      },
      customer_email: salonData.email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}&salon=${slug}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/create`,
    });

    return NextResponse.json({ checkoutUrl: session.url, publicUrl, claimUrl });
  } catch (error) {
    console.error('[create-checkout] failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при създаване на сайта' },
      { status: 500 }
    );
  }
}
