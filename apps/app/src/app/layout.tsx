import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
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
  themeColor: '#0D0D0D',
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
          appearance={{
            variables: {
              colorBackground: '#141414',
              colorInputBackground: '#0D0D0D',
              colorInputText: '#FFFFFF',
              colorPrimary: '#E83B3B',
              colorText: '#FFFFFF',
              colorTextSecondary: '#AAAAAA',
            },
          }}
          signInUrl="/sign-in"
          signInFallbackRedirectUrl="/studio"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
