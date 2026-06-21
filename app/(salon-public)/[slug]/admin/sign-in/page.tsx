import { notFound } from 'next/navigation';

// Sign-in is only accessible on the salon's own host.
// e.g. salon.clicka.bg/admin/sign-in or mysite.bg/admin/sign-in
export default function AdminSignInForSlugPage() {
  notFound();
}
