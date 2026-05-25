import { notFound } from 'next/navigation';

// Admin is only accessible via the salon's own subdomain or custom domain.
// e.g. salon.clicka.bg/admin  or  mysite.bg/admin
// Direct platform URLs like clicka.bg/{slug}/admin are intentionally hidden.
export default function AdminPage() {
  notFound();
}
