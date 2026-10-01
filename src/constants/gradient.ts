import { DefaultTheme } from '@/constants/defaultTheme';
import { createGradientStyle } from '@/constants/glassTheme';

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

  envelopeShell: 'linear-gradient(164deg, #AE3439 0%, #A32E33 40%, #98282D 74%, #8C2328 100%)',
  envelopeLining: 'linear-gradient(180deg, #4A1015 0%, #5E171C 54%, #741E24 100%)',
  envelopeFlapFace: 'linear-gradient(164deg, #AE3439 0%, #A63035 41%, #9F2C31 79%, #9C2A2F 100%)',
  envelopeFlapBack: 'linear-gradient(0deg, #6B191E 0%, #7E2126 46%, #8F2A2F 100%)',
  envelopeFlapLift:
    'linear-gradient(180deg, rgba(255,236,230,0.13) 0%, rgba(255,236,230,0.04) 28%, rgba(255,255,255,0) 62%, rgba(255,255,255,0) 100%)',
  envelopeFlapSheen:
    'linear-gradient(148deg, rgba(255,238,234,0.12) 0%, rgba(255,232,228,0.05) 34%, rgba(255,255,255,0) 68%, rgba(255,255,255,0) 100%)',
  envelopeFlapEdge:
    'linear-gradient(0deg, rgba(36,4,8,0.44) 0%, rgba(36,4,8,0.17) 30%, rgba(36,4,8,0) 62%, rgba(255,226,220,0.11) 86%, rgba(255,226,220,0) 100%)',
  envelopeFlapCrease:
    'linear-gradient(0deg, rgba(40,6,10,0.16) 0%, rgba(40,6,10,0.05) 38%, rgba(255,232,226,0.06) 70%, rgba(255,232,226,0) 100%)',
  envelopeSheen:
    'linear-gradient(148deg, rgba(255,236,232,0.22) 0%, rgba(255,230,226,0.07) 28%, rgba(255,255,255,0) 54%, rgba(60,8,12,0.06) 78%, rgba(48,6,10,0.18) 100%)',
  envelopeGrainLight:
    'radial-gradient(ellipse at 26% 20%, rgba(255,238,234,0.18) 0%, rgba(255,238,234,0.05) 34%, rgba(255,238,234,0) 58%)',
  envelopeGrainDark:
    'radial-gradient(ellipse at 76% 78%, rgba(58,8,12,0.18) 0%, rgba(58,8,12,0.05) 40%, rgba(58,8,12,0) 66%)',
  envelopeVignette:
    'radial-gradient(ellipse at 46% 32%, rgba(48,6,10,0) 36%, rgba(48,6,10,0.1) 72%, rgba(48,6,10,0.24) 100%)',
  envelopeEdge:
    'linear-gradient(180deg, rgba(58,8,12,0.16) 0%, rgba(58,8,12,0) 20%, rgba(58,8,12,0) 76%, rgba(58,8,12,0.22) 100%)',
  envelopeGround:
    'radial-gradient(ellipse at 50% 50%, rgba(74,10,34,0.34) 0%, rgba(74,10,34,0.13) 48%, rgba(74,10,34,0) 76%)',
  envelopeGroundCore:
    'radial-gradient(ellipse at 50% 50%, rgba(60,8,26,0.38) 0%, rgba(60,8,26,0.14) 44%, rgba(60,8,26,0) 72%)',

  sealWax:
    'radial-gradient(circle at 34% 26%, #F0E7D2 0%, #E3D6B9 20%, #D2C29F 48%, #C0AD87 76%, #B09A72 100%)',
  sealRim:
    'radial-gradient(circle at 44% 36%, rgba(84,66,40,0) 34%, rgba(84,66,40,0.13) 66%, rgba(74,58,34,0.3) 88%, rgba(62,48,26,0.46) 100%)',
  sealSheen:
    'linear-gradient(146deg, rgba(255,252,240,0.4) 0%, rgba(255,248,230,0.13) 26%, rgba(255,255,255,0) 52%, rgba(86,68,42,0.05) 76%, rgba(70,54,32,0.16) 100%)',
  sealBand:
    'linear-gradient(146deg, rgba(255,252,242,0.42) 0%, rgba(255,248,232,0.11) 32%, rgba(90,70,44,0.07) 66%, rgba(74,56,34,0.24) 100%)',
  sealField:
    'radial-gradient(circle at 40% 32%, #E2D5B6 0%, #CFBD99 38%, #BBA57C 74%, #A9926A 100%)',
  sealFieldShade:
    'radial-gradient(circle at 50% 44%, rgba(70,54,32,0) 54%, rgba(70,54,32,0.2) 84%, rgba(70,54,32,0.32) 100%)',
  sealCast:
    'radial-gradient(ellipse at 50% 50%, rgba(50,8,12,0.36) 0%, rgba(50,8,12,0.15) 56%, rgba(50,8,12,0) 74%)',

  parchment: 'linear-gradient(168deg, #FFFDF9 0%, #FFF7F1 34%, #FCEDE9 68%, #F6E1E1 100%)',
  parchmentMottle:
    'radial-gradient(ellipse at 32% 26%, rgba(255,255,255,0.72) 0%, rgba(255,253,250,0.22) 38%, rgba(255,253,250,0) 62%)',
  parchmentFoxing:
    'radial-gradient(circle, rgba(178,104,104,0.16) 0%, rgba(178,104,104,0.05) 46%, rgba(178,104,104,0) 72%)',
  parchmentAgeTop:
    'linear-gradient(180deg, rgba(166,98,112,0.2) 0%, rgba(166,98,112,0.06) 40%, rgba(166,98,112,0) 100%)',
  parchmentAgeBottom:
    'linear-gradient(0deg, rgba(166,98,112,0.22) 0%, rgba(166,98,112,0.07) 40%, rgba(166,98,112,0) 100%)',
  parchmentCurlLeft:
    'linear-gradient(90deg, rgba(150,74,102,0.26) 0%, rgba(166,98,120,0.07) 34%, rgba(166,98,120,0) 100%)',
  parchmentCurlRight:
    'linear-gradient(270deg, rgba(150,74,102,0.26) 0%, rgba(166,98,120,0.07) 34%, rgba(166,98,120,0) 100%)',
  parchmentShadeTop:
    'linear-gradient(180deg, rgba(122,17,50,0.28) 0%, rgba(122,17,50,0.09) 40%, rgba(122,17,50,0) 100%)',
  parchmentShadeBottom:
    'linear-gradient(0deg, rgba(122,17,50,0.28) 0%, rgba(122,17,50,0.09) 40%, rgba(122,17,50,0) 100%)',
  scrollRoll:
    'linear-gradient(180deg, #FFFDF7 0%, #FBEEE8 22%, #F0D8D6 58%, #DCB2BE 100%)',
  scrollRollCore:
    'linear-gradient(180deg, rgba(122,17,50,0) 0%, rgba(122,17,50,0.19) 48%, rgba(122,17,50,0) 100%)',
  scrollRollCap:
    'radial-gradient(circle at 50% 50%, rgba(122,17,50,0.32) 0%, rgba(122,17,50,0.1) 44%, rgba(255,251,246,0.3) 100%)',
  scrollGround:
    'radial-gradient(ellipse at 50% 50%, rgba(112,16,46,0.34) 0%, rgba(112,16,46,0.13) 46%, rgba(112,16,46,0) 74%)',
  scrollTie:
    'linear-gradient(180deg, #4E0718 0%, #7C0C2C 12%, #B01B42 34%, #E2456F 47%, #C22450 58%, #8E0F35 78%, #560A1E 100%)',
  scrollTieRound:
    'linear-gradient(90deg, rgba(32,2,11,0.66) 0%, rgba(32,2,11,0.3) 5%, rgba(32,2,11,0) 18%, rgba(32,2,11,0) 82%, rgba(32,2,11,0.3) 95%, rgba(32,2,11,0.66) 100%)',
  scrollTieSheen:
    'linear-gradient(96deg, rgba(255,255,255,0) 0%, rgba(255,214,230,0.26) 30%, rgba(255,238,245,0.44) 47%, rgba(255,214,230,0.2) 64%, rgba(255,255,255,0) 100%)',
  scrollTieTail:
    'linear-gradient(96deg, rgba(34,2,12,0.52) 0%, rgba(176,27,66,0.12) 26%, rgba(255,222,236,0.4) 48%, rgba(150,20,58,0.18) 70%, rgba(40,3,14,0.5) 100%)',
  scrollTieKnot:
    'radial-gradient(ellipse at 36% 28%, #D6335E 0%, #B01B42 40%, #7E0C2D 76%, #530819 100%)',
  scrollFinial:
    'radial-gradient(circle at 33% 27%, #FFF8E6 0%, #F3E2BA 24%, #DCC292 54%, #BFA26E 80%, #A2854F 100%)',
  scrollFinialShade:
    'radial-gradient(circle at 64% 76%, rgba(76,56,26,0.36) 0%, rgba(76,56,26,0.11) 42%, rgba(76,56,26,0) 68%)',
  scrollRodTrim:
    'linear-gradient(180deg, #FFF7E6 0%, #EEDCAE 30%, #CDAE79 70%, #A98B57 100%)',
  halo:
    'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 62%)',
  haloSoft:
    'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 65%)',
  envelopeScrim:
    'radial-gradient(circle at 50% 20%, rgba(124,26,40,0.54) 0%, rgba(90,18,32,0.6) 42%, rgba(58,15,30,0.68) 100%)',
  dotHighlight: `linear-gradient(${ANGLE}, #FFFFFF 0%, ${DefaultTheme.colors.primarySoft} 100%)`,
  edgeLeft:
    'linear-gradient(90deg, rgba(240,159,192,0.9) 0%, rgba(240,159,192,0) 100%)',
  edgeRight:
    'linear-gradient(270deg, rgba(240,159,192,0.9) 0%, rgba(240,159,192,0) 100%)',
  scrimTop:
    'linear-gradient(180deg, rgba(255,230,240,0.16) 0%, rgba(255,214,228,0.07) 34%, rgba(255,210,224,0.08) 68%, rgba(255,222,234,0.18) 100%)',
  scrimCenter:
    'radial-gradient(circle at 50% 46%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 58%)',
  vignette:
    'radial-gradient(circle at 50% 100%, rgba(226,44,86,0.22) 0%, rgba(226,44,86,0) 58%)',
  captionScrim:
    'linear-gradient(0deg, rgba(60,10,30,0.7) 0%, rgba(60,10,30,0) 100%)',

  stageWash: `linear-gradient(${ANGLE}, rgba(226,44,86,0.3) 0%, rgba(255,127,176,0.12) 37%, rgba(90,17,40,0.36) 100%)`,
  stageScrimSide:
    'linear-gradient(90deg, rgba(58,15,30,0.88) 0%, rgba(58,15,30,0.62) 32%, rgba(58,15,30,0.2) 64%, rgba(58,15,30,0) 100%)',
  stageScrimFoot:
    'linear-gradient(0deg, rgba(58,15,30,0.82) 0%, rgba(58,15,30,0.24) 46%, rgba(58,15,30,0) 100%)',
  stageScrimHead:
    'linear-gradient(180deg, rgba(58,15,30,0.62) 0%, rgba(58,15,30,0.14) 54%, rgba(58,15,30,0) 100%)',
  hairline:
    'linear-gradient(90deg, rgba(231,162,188,0) 0%, #E7A2BC 50%, rgba(231,162,188,0) 100%)',
  timeline:
    'linear-gradient(180deg, rgba(226,44,86,0) 0%, #FF8FB8 12%, #E22C56 88%, rgba(226,44,86,0) 100%)',
} as const;

export const GradientStyles = Object.fromEntries(
  Object.entries(Gradient).map(([name, image]) => [name, createGradientStyle(image)]),
) as { [K in keyof typeof Gradient]: ReturnType<typeof createGradientStyle> };

export const gradientStyle = createGradientStyle;

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
