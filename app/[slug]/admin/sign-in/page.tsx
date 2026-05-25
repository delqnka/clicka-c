import { notFound } from 'next/navigation';

// Sign-in is only accessible via the salon's own subdomain or custom domain.
// e.g. salon.clicka.bg/admin/sign-in  or  mysite.bg/admin/sign-in
export default function AdminSignInForSlugPage() {
  notFound();
}
