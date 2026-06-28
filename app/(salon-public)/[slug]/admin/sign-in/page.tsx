import { notFound } from 'next/navigation';

// Sign-in is only accessible on the salon's own host.
// e.g. mysite.bg/admin/sign-in on the branded host.
export default function AdminSignInForSlugPage() {
  notFound();
}
