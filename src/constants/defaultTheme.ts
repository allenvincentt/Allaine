/**
 * The palette for "For Elle" — a rose/crimson letter on frosted glass.
 *
 * Every surface in the app sits on the same pink field, so the glass
 * materials in `glassTheme.ts` tint against `colors.background`.
 */
export const DefaultTheme = {
  colors: {
    /* field */
    background: '#F0BFD3',
    backgroundSoft: '#F5C7DA',
    backgroundMid: '#F09FC0',
    backgroundDeep: '#E884AC',
    veil: '#3A0F1E',

    /* paper */
    white: '#FFFFFF',
    surface: '#FFFDFB',
    surfaceMuted: '#FFF4F7',
    surfaceTint: '#FBE3EB',

    /* accent */
    primary: '#E22C56',
    primaryDeep: '#B3123A',
    primaryDark: '#8E0F35',
    primarySoft: '#FF7FB0',
    primaryLight: '#FF9DC4',
    primaryPale: '#FFB3CE',
    accent: '#D62F5D',
    warm: '#FFD9A8',

    /* ink */
    ink: '#5A1128',
    inkSoft: '#63263A',
    inkMuted: '#6B3145',
    inkFaint: '#7A3049',
    label: '#B03C63',
    labelSoft: '#E07C9E',
    muted: '#B03C63',

    /* lines */
    hairline: 'rgba(226, 44, 86, 0.16)',
    hairlineSoft: 'rgba(255, 255, 255, 0.72)',
  },

  radius: {
    xs: 6,
    sm: 12,
    md: 18,
    lg: 24,
    xl: 28,
    xxl: 34,
    pill: 999,
  },

  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 34,
    xxl: 48,
  },

  /**
   * Family names match the exports of the @expo-google-fonts packages, which
   * is what `useFonts` registers them under.
   */
  fonts: {
    display: 'CormorantGaramond_300Light',
    displayRegular: 'CormorantGaramond_400Regular',
    displayMedium: 'CormorantGaramond_500Medium',
    displayItalic: 'CormorantGaramond_300Light_Italic',
    displayItalicRegular: 'CormorantGaramond_400Regular_Italic',
    body: 'Karla_400Regular',
    bodyLight: 'Karla_300Light',
    bodyMedium: 'Karla_500Medium',
    bodySemiBold: 'Karla_600SemiBold',
    bodyBold: 'Karla_700Bold',
    script: 'Parisienne_400Regular',
  },

  /** Uppercase micro-labels ("A LETTER IS WAITING") appear all over the design. */
  eyebrow: {
    fontSize: 11.5,
    letterSpacing: 3.2,
    textTransform: 'uppercase',
  },

  shadow: {
    soft: {
      shadowColor: '#96193C',
      shadowOpacity: 0.28,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 16 },
      elevation: 8,
    },
    lifted: {
      shadowColor: '#96193C',
      shadowOpacity: 0.42,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 26 },
      elevation: 14,
    },
    accent: {
      shadowColor: '#E22C56',
      shadowOpacity: 0.55,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 16 },
      elevation: 10,
    },
  },
} as const;

export type AppColor = keyof typeof DefaultTheme.colors;
