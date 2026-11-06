import type { Metadata } from 'next';
import {
  type ContentSearchParams,
  ContentView,
} from '@/components/content/ContentView';

export const metadata: Metadata = { title: 'Videos - Ship Sh*t Show' };

export default async function ContentVideosPage({
  searchParams,
}: {
  searchParams: Promise<ContentSearchParams>;
}) {
  return <ContentView searchParams={await searchParams} type="video" />;
}
