import { notFound } from 'next/navigation';
import { isEngineOnlyMode } from '@/lib/engine-mode';

export default function SitesLayout({ children }: { children: React.ReactNode }) {
  if (isEngineOnlyMode()) notFound();
  return children;
}
