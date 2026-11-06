import { BRAND } from '@shipshitshow/ui/brand';
import type { Metadata } from 'next';
import { ThumbnailResources } from '@/components/labs/ThumbnailResources';

export const metadata: Metadata = {
  title: 'Assets — Library — ' + BRAND.identity.show_name,
};

export default function LibraryAssetsPage() {
  return <ThumbnailResources />;
}
