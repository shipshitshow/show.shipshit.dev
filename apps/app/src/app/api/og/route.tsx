import { ImageResponse } from 'next/og';
import { BrandMark } from '@/components/BrandMark';
export const runtime = 'nodejs';
export async function GET() {
  return new ImageResponse(
    <div
      style={{
        background: '#0D0D0D',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        padding: 64,
        width: '100%',
      }}
    >
      <div style={{ alignItems: 'center', display: 'flex', gap: 18 }}>
        <BrandMark color="#E83B3B" size={56} />
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 700 }}>
          Ship Sh!t Show
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 152,
          fontWeight: 800,
          letterSpacing: -9,
          lineHeight: 1,
        }}
      >
        Think AI
      </div>
      <div
        style={{
          borderTop: '1px solid #404040',
          color: '#AAAAAA',
          display: 'flex',
          fontSize: 26,
          justifyContent: 'space-between',
          paddingTop: 26,
        }}
      >
        <div style={{ display: 'flex' }}>Vincent &amp; Mitchell</div>
        <div style={{ display: 'flex' }}>show.shipshit.dev</div>
      </div>
    </div>,
    { height: 630, width: 1200 },
  );
}
