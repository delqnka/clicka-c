import AdminDashboardClient from '@/components/admin/AdminDashboardClient';
import { OnboardingTour } from '@/components/admin/OnboardingTour';

// Временна preview страница — само за разработка
export default function AdminPreviewPage() {
  const mockSite = {
    slug: 'preview-salon',
    name: 'Моят Салон',
    category: 'Фризьорски салон',
    phone: '+359 88 123 4567',
    email: 'salon@example.com',
    city: 'София',
    address: 'ул. Витоша 1',
    description: '',
    images: [],
    services: [],
    hours: {},
    templateId: null,
    customDomain: null,
    domainStatus: null,
    isActive: true,
    siteStatus: 'active',
    plan: 'solo',
    planType: 'solo',
    billingPeriod: '12m',
    planExpiresAt: null,
    telegramChatId: null,
    onboardingCode: 'ABC123',
    stripeConnectAccountId: null,
    stripeConnectEnabled: false,
    faq: [],
    faqItems: [],
    amenities: [],
    coverImageUrl: null,
    logoUrl: null,
    accentColor: null,
    offers: [],
    blogPosts: [],
    staffMembers: [],
    smsCredits: 0,
    googleReviewsUrl: '',
    googlePlaceId: '',
    googleMapsUrl: '',
    specialist: null,
    legalInfo: null,
    brands: [],
    venueName: null,
    venueAddress: null,
    venueExtras: {},
  } as any;

  return (
    <>
      <OnboardingTour slug="preview-salon" />
      <AdminDashboardClient
        slug="preview-salon"
        ownerEmail="preview@clicka.bg"
        initialSite={mockSite}
        initialOffers={[]}
        initialAccount={{ loginEmail: 'preview@clicka.bg', hasPassword: true }}
      />
    </>
  );
}
