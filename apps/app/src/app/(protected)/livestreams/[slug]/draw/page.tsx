import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TopicDrawingPageClient } from './TopicDrawingPageClient';

export const metadata: Metadata = {
  description: 'Livestream topic drawing board for Ship Sh!t Show.',
  title: 'Drawing Board - Ship Sh!t Show',
};

function DrawingBoardFallback() {
  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-black">
      <p className="animate-pulse text-sm text-text-muted">
        Loading drawing board…
      </p>
    </div>
  );
}

export default function TopicDrawingPage() {
  return (
    <Suspense fallback={<DrawingBoardFallback />}>
      <TopicDrawingPageClient />
    </Suspense>
  );
}
