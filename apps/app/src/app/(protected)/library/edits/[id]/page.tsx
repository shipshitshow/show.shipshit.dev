import { BRAND } from '@shipshitshow/ui/brand';
import type { Metadata } from 'next';
import { TranscriptEditor } from '@/components/edits/TranscriptEditor';

export const metadata: Metadata = {
  title: 'Edit — Library — ' + BRAND.identity.show_name,
};

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TranscriptEditor id={id} />;
}
