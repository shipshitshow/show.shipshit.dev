'use client';

import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import { todayLocalDate } from '@/lib/date';

const TopicDrawingBoard = dynamic(
  async () =>
    (await import('@/components/livestreams/TopicDrawingBoard'))
      .TopicDrawingBoard,
  {
    loading: () => (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-black">
        <p className="text-sm text-text-muted animate-pulse">
          Loading drawing board…
        </p>
      </div>
    ),
    ssr: false,
  },
);

export function TopicDrawingPageClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const date = searchParams.get('date') || todayLocalDate();

  return <TopicDrawingBoard date={date} slug={slug} />;
}
