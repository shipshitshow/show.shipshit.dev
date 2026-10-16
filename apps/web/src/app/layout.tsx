import type { Metadata } from 'next';
import './globals.css';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://show.shipshit.dev';

export const metadata: Metadata = {
  description: 'Think AI. Vincent and Mitchell on building with AI.',
  metadataBase: new URL(SITE_URL),
  title: 'Ship Sh!t Show — Think AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
