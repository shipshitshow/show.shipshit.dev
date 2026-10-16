import { BRAND, BRAND_COLORS } from '@shipshitshow/ui/brand';

export const clerkBrand = {
  appearance: {
    elements: {
      formButtonPrimary: {
        '&:hover': { backgroundColor: BRAND_COLORS.white },
        backgroundColor: BRAND_COLORS.accent_red,
        backgroundImage: 'none',
        color: BRAND_COLORS.ink,
      },
      logoBox: { display: 'none' },
    },
    options: {
      logoImageUrl: '/brand/asterisk-red.svg',
      logoLinkUrl: '/',
    },
    variables: {
      colorBackground: BRAND_COLORS.surface_elevated,
      colorForeground: BRAND_COLORS.white,
      colorInput: BRAND_COLORS.ink,
      colorInputForeground: BRAND_COLORS.white,
      colorMutedForeground: BRAND_COLORS.text_muted,
      colorPrimary: BRAND_COLORS.accent_red,
      colorPrimaryForeground: BRAND_COLORS.ink,
    },
  },
  localization: {
    signIn: {
      start: {
        subtitle: 'Production workspace',
        subtitleCombined: 'Production workspace',
        title: `Sign in to ${BRAND.identity.show_name}`,
        titleCombined: `Continue to ${BRAND.identity.show_name}`,
      },
    },
    signUp: {
      start: {
        subtitle: 'Create your account to continue',
        subtitleCombined: 'Create your account to continue',
        title: `Join ${BRAND.identity.show_name}`,
        titleCombined: `Join ${BRAND.identity.show_name}`,
      },
    },
  },
};
