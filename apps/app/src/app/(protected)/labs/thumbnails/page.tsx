import { BRAND } from '@shipshitshow/ui/brand';
import type { Metadata } from 'next';
import { ThumbnailLab } from '@/components/labs/ThumbnailLab';
export const metadata: Metadata = {
  title: 'Thumbnail Lab — ' + BRAND.identity.show_name,
};
export default function ThumbnailLabPage() {
  return <ThumbnailLab />;
}
