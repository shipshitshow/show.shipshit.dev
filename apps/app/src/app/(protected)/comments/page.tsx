import type { Metadata } from 'next';
import { CommentsView } from '@/components/comments/CommentsView';

export const metadata: Metadata = { title: 'Comments — Ship Sh!t Show' };

export default function CommentsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <CommentsView />
    </div>
  );
}
