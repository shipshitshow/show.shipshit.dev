import type { Metadata } from 'next';
import { TrendsView } from '@/components/trends/TrendsView';

export const metadata: Metadata = { title: 'Research — Ship Sh!t Show' };
export default function ResearchPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <TrendsView />
    </div>
  );
}
