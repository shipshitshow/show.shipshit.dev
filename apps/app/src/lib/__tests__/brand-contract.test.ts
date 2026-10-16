import { describe, expect, test } from 'bun:test';
import { BRAND, BRAND_COLORS } from '@shipshitshow/ui/brand';
import { clerkBrand } from '@/lib/clerk-brand';
import { buildDefaultMetadata } from '@/lib/site';

function luminance(hex: string) {
  const values = hex.match(/[a-f\d]{2}/gi)!.map((part) => {
    const channel = Number.parseInt(part, 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('approved cross-brand contract', () => {
  test('both brands keep readable primary actions and dark text hierarchy', () => {
    for (const brand of Object.values(BRAND.brands)) {
      expect(
        contrast(brand.primary, brand.primary_text),
      ).toBeGreaterThanOrEqual(4.5);
      expect(contrast(brand.surface, brand.text)).toBeGreaterThanOrEqual(4.5);
    }
    expect(
      contrast(BRAND_COLORS.text_muted, BRAND_COLORS.ink),
    ).toBeGreaterThanOrEqual(4.5);
    expect(BRAND.brands.business.primary).toBe(BRAND_COLORS.white);
    expect(BRAND.brands.show.primary).toBe(BRAND_COLORS.accent_red);
  });

  test('auth uses the show identity instead of shared-provider defaults', () => {
    const { appearance, localization } = clerkBrand;
    expect(localization.signIn.start.titleCombined).toContain(
      BRAND.identity.show_name,
    );
    expect(localization.signUp.start.title).toContain(BRAND.identity.show_name);
    expect(appearance.elements.logoBox.display).toBe('none');
    expect(appearance.variables.colorInput).toBe(BRAND_COLORS.ink);
    expect(appearance.variables.colorPrimaryForeground).toBe(BRAND_COLORS.ink);
    expect(
      contrast(
        appearance.variables.colorPrimary,
        appearance.variables.colorPrimaryForeground,
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test('Open Graph and Twitter share the selected artwork and exact export dimensions', () => {
    const metadata = buildDefaultMetadata();
    const images = metadata.openGraph?.images as {
      url: string;
      width: number;
      height: number;
    }[];
    expect(images[0].url).toEndWith('/brand/show-og-2026-10-16.jpg');
    expect([images[0].width, images[0].height]).toEqual(
      BRAND.web.social_canvas,
    );
    expect(metadata.twitter?.images).toEqual([images[0].url]);
  });
});
