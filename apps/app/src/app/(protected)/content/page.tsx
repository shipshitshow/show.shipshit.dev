import type { Metadata } from 'next';
import {
  type ContentSearchParams,
  ContentView,
} from '@/components/content/ContentView';

export const metadata: Metadata = { title: 'Content - Ship Sh*t Show' };

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<ContentSearchParams>;
}) {
  return <ContentView searchParams={await searchParams} />;
}
