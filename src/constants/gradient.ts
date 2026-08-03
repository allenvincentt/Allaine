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
  labelHover: `linear-gradient(${ANGLE}, #FFFFFF 0%, #FFD3E3 100%)`,
  labelPressed: `linear-gradient(${ANGLE}, #FFEDF3 0%, #FFC2DA 100%)`,
  field:
    'linear-gradient(178deg, #F5C7DA 0%, #F09FC0 38%, #E884AC 70%, #F3BFD4 100%)',
  envelope: `linear-gradient(${ANGLE}, #FFD3E1 0%, #FFB9CF 100%)`,
  envelopeFlap: 'linear-gradient(180deg, #FFCEDF 0%, #FFA9C6 100%)',
  envelopeBody: `linear-gradient(${ANGLE}, #FFC0D6 0%, #FF9EBF 100%)`,
  seal: 'radial-gradient(circle at 34% 30%, #F0567F 0%, #B3123A 70%)',

  /* ——— the wallet envelope, built in layers ——— */
  /** Back panel: the paper you see through the open mouth. */
  envelopeShell: 'linear-gradient(168deg, #FFE2EB 0%, #FFC7DA 46%, #FFB2CB 100%)',
  /** The lining, only on show once the flap is up. */
  envelopeLining: 'linear-gradient(180deg, #C9718F 0%, #E58AAD 62%, #F2A3C0 100%)',
  /** Front pocket: catches more light at the bottom, like a folded panel. */
  envelopePocket: 'linear-gradient(172deg, #FFC3D9 0%, #FFD6E4 54%, #FFE6EE 100%)',
  /** Flap, outer face — one continuous fold off the back panel. */
  envelopeFlapFace: 'linear-gradient(180deg, #FFDCE7 0%, #FFC3D8 62%, #FFB3CC 100%)',
  /** Flap, inner face — in shade, and a shade cooler. */
  envelopeFlapBack: 'linear-gradient(0deg, #F2A9C4 0%, #E793B3 62%, #DE87A9 100%)',
  /** The shadow the pocket throws up the back panel. */
  envelopeSeam:
    'linear-gradient(0deg, rgba(122,17,50,0.22) 0%, rgba(122,17,50,0.08) 44%, rgba(122,17,50,0) 100%)',
  /** Sheen raked across the whole envelope so it reads as one solid object. */
  envelopeSheen:
    'linear-gradient(148deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.14) 26%, rgba(255,255,255,0) 54%, rgba(255,255,255,0.16) 100%)',
  /** Contact shadow on the surface underneath. */
  envelopeGround:
    'radial-gradient(ellipse at 50% 50%, rgba(112,16,46,0.42) 0%, rgba(112,16,46,0.18) 46%, rgba(112,16,46,0) 74%)',

  /* ——— the wax seal ———
   * Sampled off the reference: oxblood, not rose. The wax runs from a hot
   * highlight at the upper left down to almost black where the blob rolls
   * away from the light, and the whole thing is lacquer-glossy. */
  /** The poured blob. */
  sealWax:
    'radial-gradient(circle at 30% 24%, #C0463B 0%, #A2251F 18%, #7D1113 44%, #560A0C 72%, #330406 100%)',
  /** Vignette that rolls the wax off at the rim. */
  sealRim:
    'radial-gradient(circle at 46% 40%, rgba(0,0,0,0) 40%, rgba(26,1,3,0.28) 76%, rgba(20,1,2,0.62) 100%)',
  /** Specular sweep — the lacquer. */
  sealSheen:
    'linear-gradient(142deg, rgba(255,236,232,0.66) 0%, rgba(255,214,206,0.2) 18%, rgba(255,255,255,0) 44%, rgba(255,255,255,0.05) 78%, rgba(255,226,220,0.22) 100%)',
  /** The die impression: a dish pressed into the blob, a shade darker. */
  sealDie:
    'radial-gradient(circle at 40% 32%, #8A1917 0%, #6B0F11 38%, #520A0C 72%, #3E0607 100%)',
  /** Soft shadow cast by the raised rim onto the dish below it. */
  sealDieShade:
    'radial-gradient(circle at 50% 46%, rgba(20,1,2,0) 52%, rgba(20,1,2,0.34) 84%, rgba(20,1,2,0.5) 100%)',
  /** Warm glow under the seal, so it reads as the thing to touch. */
  sealHalo:
    'radial-gradient(circle, rgba(214,72,60,0.5) 0%, rgba(178,36,32,0.18) 44%, rgba(178,36,32,0) 72%)',

  /* ——— the rolled scroll ——— */
  parchment: 'linear-gradient(176deg, #FFFCF6 0%, #FFF6F2 42%, #FFF0F4 100%)',
  /** Left and right curl, so the sheet is never a flat rectangle. */
  parchmentCurlLeft:
    'linear-gradient(90deg, rgba(174,84,116,0.16) 0%, rgba(174,84,116,0.04) 42%, rgba(174,84,116,0) 100%)',
  parchmentCurlRight:
    'linear-gradient(270deg, rgba(174,84,116,0.16) 0%, rgba(174,84,116,0.04) 42%, rgba(174,84,116,0) 100%)',
  /** Shadow thrown down the sheet by the roll above it. */
  parchmentShadeTop:
    'linear-gradient(180deg, rgba(122,17,50,0.24) 0%, rgba(122,17,50,0.08) 40%, rgba(122,17,50,0) 100%)',
  parchmentShadeBottom:
    'linear-gradient(0deg, rgba(122,17,50,0.24) 0%, rgba(122,17,50,0.08) 40%, rgba(122,17,50,0) 100%)',
  /** The roll itself, lit from above. */
  scrollRoll:
    'linear-gradient(180deg, #FFF7F1 0%, #FDE7E2 24%, #F3CBD3 62%, #E3A9BC 100%)',
  scrollRollCore:
    'linear-gradient(180deg, rgba(122,17,50,0) 0%, rgba(122,17,50,0.16) 48%, rgba(122,17,50,0) 100%)',
  scrollRibbon: `linear-gradient(180deg, ${DefaultTheme.colors.primarySoft} 0%, ${DefaultTheme.colors.primary} 52%, ${DefaultTheme.colors.primaryDeep} 100%)`,
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
