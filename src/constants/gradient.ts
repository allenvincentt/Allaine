import { DefaultTheme } from '@/constants/defaultTheme';
import { createGradientStyle } from '@/constants/glassTheme';

/**
 * The whole design leans on one gradient angle — 106deg — so the rose always
 * travels the same way across a surface. As RN style strings for
 * `experimental_backgroundImage`, and as stop tuples for `<LinearGradient>`.
 */
const ANGLE = '106deg';

export const Gradient = {
  base: `linear-gradient(${ANGLE}, ${DefaultTheme.colors.primarySoft} 0%, ${DefaultTheme.colors.primary} 100%)`,
  hover: `linear-gradient(${ANGLE}, #FF8FB8 0%, #EC3A63 100%)`,
  pressed: `linear-gradient(${ANGLE}, #E8628F 0%, ${DefaultTheme.colors.primaryDeep} 100%)`,
  soft: `linear-gradient(${ANGLE}, ${DefaultTheme.colors.primaryLight} 0%, ${DefaultTheme.colors.primary} 100%)`,
  question: `linear-gradient(${ANGLE}, ${DefaultTheme.colors.primaryPale} 0%, ${DefaultTheme.colors.primarySoft} 42%, ${DefaultTheme.colors.primary} 100%)`,
  glass: `linear-gradient(${ANGLE}, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.36) 100%)`,
  glassBright: `linear-gradient(${ANGLE}, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.42) 100%)`,
  glassAccent: `linear-gradient(${ANGLE}, rgba(255,163,196,0.5) 0%, rgba(226,44,86,0.24) 100%)`,
  paper: 'linear-gradient(178deg, #FFFDFB 0%, #FFF4F7 100%)',
  label: `linear-gradient(${ANGLE}, #FFFFFF 0%, #FFE6EE 100%)`,
  field:
    'linear-gradient(178deg, #F5C7DA 0%, #F09FC0 38%, #E884AC 70%, #F3BFD4 100%)',
  envelope: `linear-gradient(${ANGLE}, #FFD3E1 0%, #FFB9CF 100%)`,
  envelopeFlap: 'linear-gradient(180deg, #FFCEDF 0%, #FFA9C6 100%)',
  envelopeBody: `linear-gradient(${ANGLE}, #FFC0D6 0%, #FF9EBF 100%)`,
  seal: 'radial-gradient(circle at 34% 30%, #F0567F 0%, #B3123A 70%)',
  halo:
    'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 62%)',
  haloSoft:
    'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 65%)',
  envelopeScrim:
    'radial-gradient(circle at 50% 20%, rgba(255,235,242,0.85) 0%, rgba(255,217,230,0.78) 42%, rgba(224,160,190,0.82) 100%)',
  dotHighlight: `linear-gradient(${ANGLE}, #FFFFFF 0%, ${DefaultTheme.colors.primarySoft} 100%)`,
  edgeLeft:
    'linear-gradient(90deg, rgba(240,159,192,0.9) 0%, rgba(240,159,192,0) 100%)',
  edgeRight:
    'linear-gradient(270deg, rgba(240,159,192,0.9) 0%, rgba(240,159,192,0) 100%)',
  scrimTop:
    'linear-gradient(180deg, rgba(255,230,240,0.32) 0%, rgba(255,214,228,0.16) 34%, rgba(255,210,224,0.18) 68%, rgba(255,222,234,0.36) 100%)',
  scrimCenter:
    'radial-gradient(circle at 50% 46%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 58%)',
  vignette:
    'radial-gradient(circle at 50% 100%, rgba(226,44,86,0.22) 0%, rgba(226,44,86,0) 58%)',
  captionScrim:
    'linear-gradient(0deg, rgba(60,10,30,0.7) 0%, rgba(60,10,30,0) 100%)',
  hairline:
    'linear-gradient(90deg, rgba(231,162,188,0) 0%, #E7A2BC 50%, rgba(231,162,188,0) 100%)',
  timeline:
    'linear-gradient(180deg, rgba(226,44,86,0) 0%, #FF8FB8 12%, #E22C56 88%, rgba(226,44,86,0) 100%)',
} as const;

/**
 * Ready-to-spread style objects. React Native Web drops
 * `experimental_backgroundImage` on the floor, so `createGradientStyle` also
 * writes the plain CSS `backgroundImage` there — spread these instead of
 * setting `experimental_backgroundImage` by hand, or the browser gets a flat
 * fill where the design wants a ramp.
 */
export const GradientStyles = Object.fromEntries(
  Object.entries(Gradient).map(([name, image]) => [name, createGradientStyle(image)]),
) as { [K in keyof typeof Gradient]: ReturnType<typeof createGradientStyle> };

/** For gradients composed at runtime (per-particle tints, and so on). */
export const gradientStyle = createGradientStyle;

/** The 106deg direction expressed as `<LinearGradient>` start/end points. */
export const GradientAngle = {
  start: { x: 0, y: 0.35 },
  end: { x: 1, y: 0.65 },
} as const;

export const GradientVertical = {
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
} as const;

type Stops = readonly [string, string, ...string[]];

export const GradientStops = {
  primary: [DefaultTheme.colors.primarySoft, DefaultTheme.colors.primary] as Stops,
  soft: [DefaultTheme.colors.primaryLight, DefaultTheme.colors.primary] as Stops,
  question: [
    DefaultTheme.colors.primaryPale,
    DefaultTheme.colors.primarySoft,
    DefaultTheme.colors.primary,
  ] as Stops,
  paper: [DefaultTheme.colors.surface, DefaultTheme.colors.surfaceMuted] as Stops,
  glass: ['rgba(255,255,255,0.62)', 'rgba(255,255,255,0.36)'] as Stops,
  glassBright: ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.42)'] as Stops,
  glassAccent: ['rgba(255,163,196,0.5)', 'rgba(226,44,86,0.24)'] as Stops,
  field: ['#F5C7DA', '#F09FC0', '#E884AC', '#F3BFD4'] as Stops,
  envelope: ['#FFD3E1', '#FFB9CF'] as Stops,
  envelopeFlap: ['#FFCEDF', '#FFA9C6'] as Stops,
  envelopeBody: ['#FFC0D6', '#FF9EBF'] as Stops,
  captionScrim: ['rgba(60,10,30,0)', 'rgba(60,10,30,0.7)'] as Stops,
  white: ['#FFFFFF', '#FFE6EE'] as Stops,
} as const;

export const GradientLocations = {
  field: [0, 0.38, 0.7, 1] as const,
  question: [0, 0.42, 1] as const,
} as const;
