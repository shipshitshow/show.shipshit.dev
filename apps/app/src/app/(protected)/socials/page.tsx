import type { Metadata } from 'next';
import { DashboardClient } from '@/components/DashboardClient';

export const metadata: Metadata = { title: 'Socials — Ship Sh!t Show' };
export default function SocialsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <DashboardClient view="socials" />
    </div>
  );
}
