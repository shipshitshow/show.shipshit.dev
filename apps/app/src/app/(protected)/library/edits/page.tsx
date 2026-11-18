import { BRAND } from '@shipshitshow/ui/brand';
import type { Metadata } from 'next';
import { EditList } from '@/components/edits/EditList';
import { LibraryHeader } from '@/components/library/LibraryHeader';

export const metadata: Metadata = {
  title: 'Edits — Library — ' + BRAND.identity.show_name,
};

export default function EditsPage() {
  return (
    <div className="space-y-6">
      <LibraryHeader title="Edits" />
      <EditList />
    </div>
  );
}
