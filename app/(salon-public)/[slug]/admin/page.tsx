import { notFound } from 'next/navigation';

// Admin is only accessible on the salon's own host.
// e.g. app.alternine.co/<slug>/admin internally or mysite.bg/admin publicly.
// Direct root-domain slug paths are intentionally hidden from end-clients.
export default function AdminPage() {
  notFound();
}
