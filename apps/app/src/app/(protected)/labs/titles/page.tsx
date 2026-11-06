import { BRAND } from '@shipshitshow/ui/brand';
import type { Metadata } from 'next';
import { TitleLab } from '@/components/labs/TitleLab';
export const metadata: Metadata = {
  title: 'Titles Lab — ' + BRAND.identity.show_name,
};
export default function TitleLabPage() {
  return <TitleLab />;
}
