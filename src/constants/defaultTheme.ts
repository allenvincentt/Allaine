import { Platform, type TextStyle } from 'react-native';

export const ITALIC: TextStyle['fontStyle'] = Platform.OS === 'android' ? 'normal' : 'italic';

export const DefaultTheme = {
  colors: {
    background: '#F0BFD3',
    backgroundSoft: '#F5C7DA',
    backgroundMid: '#F09FC0',
    backgroundDeep: '#E884AC',
    veil: '#3A0F1E',

    white: '#FFFFFF',
    surface: '#FFFDFB',
    surfaceMuted: '#FFF4F7',
    surfaceTint: '#FBE3EB',

    primary: '#E22C56',
    primaryDeep: '#B3123A',
    primaryDark: '#8E0F35',
    primarySoft: '#FF7FB0',
    primaryLight: '#FF9DC4',
    primaryPale: '#FFB3CE',
    accent: '#D62F5D',
    warm: '#FFD9A8',

    ink: '#5A1128',
    inkSoft: '#63263A',
    inkMuted: '#6B3145',
    inkFaint: '#7A3049',
    label: '#B03C63',
    labelSoft: '#E07C9E',
    muted: '#B03C63',

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
