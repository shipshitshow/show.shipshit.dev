import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { BRAND, BRAND_COLORS } from '@shipshitshow/ui/brand';
import { ImageResponse } from 'next/og';
import { BrandMark } from '@/components/BrandMark';
import { todayLocalDate } from '@/lib/date';
import {
  getTopicsForDate,
  resolveLivestreamDate,
} from '@/lib/livestreams-store';
import { getVisibleTopics } from '@/lib/livestreams-visibility';
import { clampText, stripMarkdown } from '@/lib/text';

export const runtime = 'nodejs';

const fontDirectory = path.join(process.cwd(), '../../packages/ui/src/fonts');
const fonts = Promise.all([
  readFile(path.join(fontDirectory, 'SpaceGrotesk-Regular.ttf')),
  readFile(path.join(fontDirectory, 'SpaceGrotesk-Bold.ttf')),
]);

function extractSummary(content: string): string | null {
  const match = content.match(/## Summary\n([\s\S]*?)(?:\n## |\n?$)/);
  if (!match) return null;

  const summary = stripMarkdown(match[1]).trim();
  return summary.length > 0 ? summary : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const [regularFont, boldFont] = await fonts;
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const requestedDate = searchParams.get('date') || todayLocalDate();
  const resolvedDate = await resolveLivestreamDate(requestedDate);
  const topic = getVisibleTopics(
    await getTopicsForDate(resolvedDate),
    resolvedDate,
  ).find((candidate) => candidate.slug === slug);

  const title = topic?.title || BRAND.identity.show_name;
  const summary = clampText(
    extractSummary(topic?.content || '') ||
      'Livestream topic, talking points, and stream prep.',
    180,
  );
  const source = clampText(stripMarkdown(topic?.source || 'Livestream'), 64);

  return new ImageResponse(
    <div
      style={{
        alignItems: 'stretch',
        background: BRAND_COLORS.ink,
        color: BRAND_COLORS.white,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Space Grotesk',
        height: '100%',
        justifyContent: 'space-between',
        padding: '52px',
        position: 'relative',
        width: '100%',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <div
          style={{
            color: BRAND_COLORS.white,
            display: 'flex',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: -0.5,
          }}
        >
          {BRAND.identity.show_name}
        </div>
        <div
          style={{
            border: `1px solid ${BRAND_COLORS.surface_border}`,
            borderRadius: 999,
            color: BRAND_COLORS.text_secondary,
            display: 'flex',
            fontSize: 20,
            padding: '10px 18px',
          }}
        >
          {resolvedDate}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          maxWidth: 980,
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 70,
            fontWeight: 800,
            letterSpacing: -2.2,
            lineHeight: 1.03,
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: BRAND_COLORS.text_secondary,
            display: 'flex',
            fontSize: 28,
            lineHeight: 1.35,
          }}
        >
          {summary}
        </div>
      </div>

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <div
          style={{
            color: BRAND_COLORS.text_muted,
            display: 'flex',
            fontSize: 20,
            lineHeight: 1.3,
            maxWidth: 600,
          }}
        >
          {source}
        </div>
        <div
          style={{
            color: BRAND_COLORS.text_muted,
            display: 'flex',
            fontSize: 22,
            marginRight: 110,
          }}
        >
          show.shipshit.dev
        </div>
      </div>
      <div
        style={{ bottom: 42, display: 'flex', position: 'absolute', right: 45 }}
      >
        <BrandMark color={BRAND_COLORS.accent_red} size={90} />
      </div>
    </div>,
    {
      fonts: [
        {
          data: regularFont,
          name: 'Space Grotesk',
          style: 'normal',
          weight: 400,
        },
        { data: boldFont, name: 'Space Grotesk', style: 'normal', weight: 700 },
      ],
      height: 630,
      width: 1200,
    },
  );
}
