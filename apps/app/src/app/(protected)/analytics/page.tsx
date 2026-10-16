import type { Metadata } from 'next';
import { AnalyticsPage } from '@/components/AnalyticsPage';

export const metadata: Metadata = {
  description: 'YouTube analytics and video performance for Ship Sh!t Show.',
  title: 'Analytics - Ship Sh!t Show',
};

export default function AnalyticsRoutePage() {
  return <AnalyticsPage />;
}
