import type { Metadata } from 'next';
import {
  type ContentSearchParams,
  ContentView,
} from '@/components/content/ContentView';

export const metadata: Metadata = { title: 'Shorts - Ship Sh*t Show' };

export default async function ContentShortsPage({
  searchParams,
}: {
  searchParams: Promise<ContentSearchParams>;
}) {
  return <ContentView searchParams={await searchParams} type="short" />;
}
