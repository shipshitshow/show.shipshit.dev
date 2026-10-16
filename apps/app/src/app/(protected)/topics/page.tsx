import type { Metadata } from 'next';
import { KanbanBoard } from '@/components/topics/KanbanBoard';

export const metadata: Metadata = { title: 'Topics — Ship Sh!t Show' };

export default function TopicsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <KanbanBoard />
    </div>
  );
}
