import type { Metadata } from 'next';
import { LeadsView } from '@/components/leads/LeadsView';

export const metadata: Metadata = { title: 'Leads — Ship Sh!t Show' };

export default function LeadsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <LeadsView />
    </div>
  );
}
