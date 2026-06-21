import { notFound } from 'next/navigation';

// Admin is only accessible on the salon's own host.
// e.g. salon.clicka.bg/admin or mysite.bg/admin
// Direct platform URLs like clicka.bg/{slug}/admin are intentionally hidden.
export default function AdminPage() {
  notFound();
}
