import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { requireProducerPage } from '@/lib/producer-auth';

export const metadata: Metadata = {
  description: 'Authenticate with YouTube for Ship Sh!t Show.',
  title: 'YouTube Auth - Ship Sh!t Show',
};

import { YouTubeAuthContentSkeleton } from '@/components/PageSkeletons';
import { YouTubeAuthPageClient } from '@/components/YouTubeAuthPageClient';
import { isYouTubeAuthEnabled } from '@/lib/dev-tools';

export default async function YouTubeAuthPage() {
  await requireProducerPage();
  if (!isYouTubeAuthEnabled()) {
    notFound();
  }

  return (
    <Suspense fallback={<YouTubeAuthContentSkeleton />}>
      <YouTubeAuthPageClient />
    </Suspense>
  );
}
