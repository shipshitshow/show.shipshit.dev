import { ClerkProvider } from '@clerk/nextjs';
import { BRAND_COLORS } from '@shipshitshow/ui/brand';
import type { Metadata, Viewport } from 'next';
import { clerkBrand } from '@/lib/clerk-brand';
import { buildDefaultMetadata } from '@/lib/site';
import './globals.scss';

export const metadata: Metadata = {
  description:
    'Think AI. Vincent and Mitchell share the tools and workflows behind building with AI. Video and live on YouTube.',
  title: 'Ship Sh!t Show — Think AI',
  ...buildDefaultMetadata(),
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: BRAND_COLORS.ink,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider
          {...clerkBrand}
          signInUrl="/sign-in"
          signInFallbackRedirectUrl="/studio"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
