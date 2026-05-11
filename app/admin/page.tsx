import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default function AdminEntryPage() {
  const salonSlug = headers().get('x-salon-slug');

  if (!salonSlug) {
    redirect('/');
  }

  redirect(`/${salonSlug}/admin`);
}

