import type { Metadata } from 'next';
import {
  type ContentSearchParams,
  ContentView,
} from '@/components/content/ContentView';

export const metadata: Metadata = { title: 'Livestreams - Ship Sh*t Show' };

export default async function ContentLivestreamsPage({
  searchParams,
}: {
  searchParams: Promise<ContentSearchParams>;
}) {
  return <ContentView searchParams={await searchParams} type="livestream" />;
}
