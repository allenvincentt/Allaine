import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useRevealed } from '@/components/ui/Reveal';
import { DefaultTheme } from '@/constants/defaultTheme';
import { GradientStyles, gradientStyle } from '@/constants/gradient';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * The scalloped rim, which is the whole silhouette of the reference seal: a
 * ring of soft lobes pushed out by the wax as the die came down. Each lobe is
 * a disc sitting on a ring just inside the box, wide enough that neighbours
 * overlap and close into one continuous outline.
 *
 * The reference's wave is *shallow* — the outline swells and dips by a few
 * per cent, not a third. Deep lobes turn the seal into a flower. What sells it
 * instead is the jitter: sixteen identical bumps evenly spaced is a cog,
 * sixteen slightly different ones slightly out of step is a hand pour. Pairs
 * are `[how far the lobe swells, how far it drifts off its station]`.
 */
const SCALLOP_JITTER = [
  [1.02, 0.3],
  [0.94, -0.54],
  [1.07, 0.16],
  [0.97, 0.62],
  [1.03, -0.24],
  [0.92, 0.46],
  [1.05, -0.7],
  [0.98, 0.06],
  [1.01, 0.58],
  [0.93, -0.32],
  [1.06, 0.22],
  [0.96, -0.48],
  [1.04, 0.62],
  [0.95, -0.18],
  [1.08, 0.4],
  [0.99, -0.64],
] as const;

/** Radius the lobe centres sit on, and their base diameter. Both fractions of
 *  the box, so the seal scales cleanly. */
const SCALLOP_RING = 0.4;
const SCALLOP_SIZE = 0.18;

/** The body under the lobes. Has to reach past where neighbouring lobes cross,
 *  or the valleys open up — but not past the lobes themselves, or the outline
 *  goes back to being a plain circle. */
const CORE = 0.84;
/** The dish pressed into the pour, and the band left standing around it. */
const FIELD = 0.64;
/** Where the struck lettering runs, midway along that band. */
const LEGEND = 0.375;
/** How many marks are in it. At this size they read as a beaded ring, which is
 *  exactly what a ring of 2px letters looks like. */
const LEGEND_MARKS = 20;

const SCALLOPS = SCALLOP_JITTER.map(([grow, drift], index) => {
  const turn = ((index + drift * 0.3) / SCALLOP_JITTER.length) * Math.PI * 2 - Math.PI / 2;

  return {
    d: SCALLOP_SIZE * grow,
    /* A shade wider than tall — the pour spread sideways under the press. */
    cx: 0.5 + Math.cos(turn) * SCALLOP_RING,
    cy: 0.5 + Math.sin(turn) * SCALLOP_RING * 0.97,
  };
});

/** Chips that come away from the break. Direction is in fractions of the box. */
const CRUMBS = [
  { cx: 0.38, cy: 0.44, d: 0.1, dx: -0.5, dy: 0.62, spin: '-120deg' },
  { cx: 0.58, cy: 0.5, d: 0.08, dx: 0.56, dy: 0.5, spin: '140deg' },
  { cx: 0.5, cy: 0.66, d: 0.06, dx: 0.12, dy: 0.78, spin: '-70deg' },
] as const;

const SPECULAR = gradientStyle(
  'radial-gradient(circle, rgba(255,253,244,0.58) 0%, rgba(255,250,236,0.18) 44%, rgba(255,250,236,0) 74%)',
);

/** Never animated — the stand-in when a caller does not pass a `fracture`. */
const INTACT = new Animated.Value(0);

type WaxSealProps = {
  size: number;
  /** The letter pressed into the die, when `emblem` is `monogram`. */
  monogram?: string;
  /**
   * What the die carries. `floral` is the little botanical sprig from the
   * reference photograph; `monogram` presses a single letter instead.
   */
  emblem?: 'floral' | 'monogram';
  /** 0 keeps the seal whole; driving it to 1 snaps it in two and drops it. */
  fracture?: Animated.Value | Animated.AnimatedInterpolation<number>;
  onPress?: () => void;
  disabled?: boolean;
  /**
   * Whether the seal breathes. It is the only affordance the envelope has, so
   * it needs *something* — but the reference seal is pressed flat onto the
   * paper, so this is a slow swell of the wax and its own sheen rather than a
   * glow ring, which would read as a bubble drawn round it.
   */
  glow?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A hand-poured wax seal: a scalloped satin blob with a die struck into it,
 * the device standing proud of a recessed field and a ring of lettering round
 * the band between the two. Built out of layered gradients rather than an
 * image so it stays sharp at any size, and so it can be broken cleanly in half
 * — the two halves are the same drawing behind two adjacent clips, so at rest
 * the seam is invisible.
 */
export function WaxSeal({
  size,
  monogram = 'A',
  emblem = 'monogram',
  fracture,
  onPress,
  disabled = false,
  glow = true,
  accessibilityLabel = 'Break the seal',
  style,
}: WaxSealProps) {
  const reducedMotion = useReducedMotion();
  /* True the moment the enclosing section reveals, and always outside a reveal
     provider — the envelope's seal is unaffected. On the landing page the seal
     is mounted screens before it is seen, and a glow that pulses at zero
     opacity from the first frame is a loop the compositor pays for on behalf
     of nobody. */
  const revealed = useRevealed();
  const split = fracture ?? INTACT;
  const press = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion || !glow || !revealed) {
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1900,
          easing: Easing.inOut(Easing.ease),
          isInteraction: false,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1900,
          easing: Easing.inOut(Easing.ease),
          isInteraction: false,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reducedMotion, glow, revealed]);

  /* The seam. The left half is dealt the extra half pixel and the right half
     is laid over it, so the two overlap rather than butting: butted clips let
     sub-pixel rounding open a hairline straight down the middle of the seal,
     and the overlap cannot show because both halves are the same drawing at
     the same place. */
  const leftWidth = Math.ceil(size / 2);
  const rightWidth = size - leftWidth;

  const motion = useMemo(() => {
    const drift = size * 0.36;
    return {
      /* A beat of resistance, then it gives. */
      scale: split.interpolate({
        inputRange: [0, 0.2, 1],
        outputRange: [1, 1.07, 0.9],
        extrapolate: 'clamp',
      }),
      leftX: split.interpolate({
        inputRange: [0, 0.18, 1],
        outputRange: [0, 0, -drift],
        extrapolate: 'clamp',
      }),
      rightX: split.interpolate({
        inputRange: [0, 0.18, 1],
        outputRange: [0, 0, drift],
        extrapolate: 'clamp',
      }),
      leftSpin: split.interpolate({
        inputRange: [0, 0.18, 1],
        outputRange: ['0deg', '0deg', '-19deg'],
        extrapolate: 'clamp',
      }),
      rightSpin: split.interpolate({
        inputRange: [0, 0.18, 1],
        outputRange: ['0deg', '0deg', '17deg'],
        extrapolate: 'clamp',
      }),
      fall: split.interpolate({
        inputRange: [0, 0.18, 1],
        outputRange: [0, 0, size * 0.5],
        extrapolate: 'clamp',
      }),
      fade: split.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, 0.92, 0],
        extrapolate: 'clamp',
      }),
      /* The shadow the wax throws goes the moment the wax lifts off the sheet. */
      castFade: split.interpolate({
        inputRange: [0, 0.24],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
      /* The fracture line itself: dark, and only on show while the two halves
         are still close enough together for it to be a crack rather than a gap. */
      crackFade: split.interpolate({
        inputRange: [0, 0.16, 0.34, 0.72],
        outputRange: [0, 0.9, 0.55, 0],
        extrapolate: 'clamp',
      }),
      crumbFade: split.interpolate({
        inputRange: [0, 0.14, 0.3, 0.9],
        outputRange: [0, 0, 1, 0],
        extrapolate: 'clamp',
      }),
      crumbTravel: split.interpolate({
        inputRange: [0, 0.16, 1],
        outputRange: [0, 0, 1],
        extrapolate: 'clamp',
      }),
    };
  }, [split, size]);

  const pressScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] });
  /* The breath, such as it is: a couple of per cent of swell, which catches
     the eye in motion and is invisible in a screenshot. */
  const breath = glow
    ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] })
    : undefined;

  const half = { position: 'absolute' as const, top: 0, height: size, overflow: 'hidden' as const };

  return (
    <Animated.View
      style={[
        { width: size, height: size },
        style,
        {
          transform: [
            { scale: motion.scale },
            { scale: pressScale },
            ...(breath ? [{ scale: breath }] : []),
          ],
        },
      ]}>
      {/* The shadow the wax lays on the sheet. It stops just short of the wax's
          own edge, so what you see is a seal pressed onto paper rather than one
          sitting inside a halo. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.underlay,
          GradientStyles.sealCast,
          {
            width: size * 1.1,
            height: size * 1.08,
            borderRadius: size * 0.55,
            left: -size * 0.05,
            top: -size * 0.01,
            opacity: motion.castFade,
          },
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          half,
          {
            left: 0,
            width: leftWidth + 0.5,
            opacity: motion.fade,
            transform: [
              { translateX: motion.leftX },
              { translateY: motion.fall },
              { rotate: motion.leftSpin },
            ],
          },
        ]}>
        <View style={[styles.faceHolder, { width: size, height: size, left: 0 }]}>
          <SealFace size={size} monogram={monogram} emblem={emblem} />
        </View>
        {/* The torn face of the break, only visible on the inside edge. */}
        <Animated.View
          style={[
            styles.crackFace,
            { right: 0, width: Math.max(1, size * 0.05), opacity: motion.crackFade },
          ]}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          half,
          {
            left: leftWidth,
            width: rightWidth,
            opacity: motion.fade,
            transform: [
              { translateX: motion.rightX },
              { translateY: motion.fall },
              { rotate: motion.rightSpin },
            ],
          },
        ]}>
        <View style={[styles.faceHolder, { width: size, height: size, left: -leftWidth }]}>
          <SealFace size={size} monogram={monogram} emblem={emblem} />
        </View>
        <Animated.View
          style={[
            styles.crackFace,
            { left: 0, width: Math.max(1, size * 0.05), opacity: motion.crackFade },
          ]}
        />
      </Animated.View>

      {/* Wax is brittle: a few chips come away from the seam and drop. */}
      {CRUMBS.map((crumb) => (
        <Animated.View
          key={`${crumb.cx}-${crumb.cy}`}
          pointerEvents="none"
          style={[
            styles.crumb,
            {
              width: size * crumb.d,
              height: size * crumb.d * 0.78,
              borderRadius: size * crumb.d * 0.34,
              left: size * crumb.cx,
              top: size * crumb.cy,
              opacity: motion.crumbFade,
              transform: [
                {
                  translateX: motion.crumbTravel.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, size * crumb.dx],
                  }),
                },
                {
                  translateY: motion.crumbTravel.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, size * crumb.dy],
                  }),
                },
                {
                  rotate: motion.crumbTravel.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', crumb.spin],
                  }),
                },
              ],
            },
          ]}
        />
      ))}

      {onPress && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          disabled={disabled}
          onPress={onPress}
          onPressIn={() => {
            Animated.timing(press, {
              toValue: 1,
              duration: 110,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(press, {
              toValue: 0,
              damping: 13,
              stiffness: 320,
              mass: 0.6,
              useNativeDriver: true,
            }).start();
          }}
          hitSlop={Math.round(size * 0.3)}
          style={styles.pressable}
        />
      )}
    </Animated.View>
  );
}

/** One complete drawing of the seal. Rendered twice, behind the two clips. */
function SealFace({
  size,
  monogram,
  emblem,
}: {
  size: number;
  monogram: string;
  emblem: 'floral' | 'monogram';
}) {
  const core = size * CORE;
  const field = size * FIELD;
  const legend = size * LEGEND;
  const emboss = Math.max(1, size * 0.02);

  /* The lettering. Rotating each mark about the seal's centre rather than its
     own means one view per mark instead of a wrapper apiece. */
  const markWidth = Math.max(1, size * 0.017);
  const markHeight = Math.max(1.5, size * 0.034);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* the lobes the wax was pushed out into */}
      {SCALLOPS.map((lobe) => (
        <View
          key={`${lobe.cx}-${lobe.cy}`}
          style={[
            styles.scallop,
            {
              width: size * lobe.d,
              height: size * lobe.d,
              borderRadius: (size * lobe.d) / 2,
              left: size * (lobe.cx - lobe.d / 2),
              top: size * (lobe.cy - lobe.d / 2),
            },
          ]}
        />
      ))}

      {/* the body of the pour, laid over the middle of them */}
      <View
        style={[
          styles.core,
          GradientStyles.sealWax,
          {
            width: core,
            height: core,
            borderRadius: core / 2,
            left: (size - core) / 2,
            top: (size - core) / 2,
          },
        ]}
      />

      {/* One vignette over body *and* lobes, which is what fuses them into a
          single piece of wax rather than a disc with bumps stuck on. Clipped to
          a circle, or its corners would paint shade onto bare paper. */}
      <View
        pointerEvents="none"
        style={[styles.glaze, { borderRadius: size / 2 }]}>
        <View style={[StyleSheet.absoluteFill, GradientStyles.sealRim]} />
      </View>

      {/* the flat band the die left standing, lit along its upper left */}
      <View
        pointerEvents="none"
        style={[
          styles.band,
          GradientStyles.sealBand,
          {
            width: core,
            height: core,
            borderRadius: core / 2,
            left: (size - core) / 2,
            top: (size - core) / 2,
          },
        ]}
      />

      {/* and the ring of lettering struck into it */}
      {Array.from({ length: LEGEND_MARKS }, (_, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={[
            styles.mark,
            {
              width: markWidth,
              height: markHeight,
              borderRadius: markWidth / 2,
              left: (size - markWidth) / 2,
              top: size / 2 - legend - markHeight / 2,
              // The seal's centre, expressed in this mark's own box.
              transformOrigin: `${markWidth / 2}px ${markHeight / 2 + legend}px`,
              transform: [{ rotate: `${(index / LEGEND_MARKS) * 360}deg` }],
            },
          ]}
        />
      ))}

      {/* the dish pressed into the pour */}
      <View
        style={[
          styles.field,
          GradientStyles.sealField,
          {
            width: field,
            height: field,
            borderRadius: field / 2,
            left: (size - field) / 2,
            top: (size - field) / 2,
          },
        ]}>
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, GradientStyles.sealFieldShade, { borderRadius: field / 2 }]}
        />

        {/* the rule cut round the lip of the dish */}
        <View
          pointerEvents="none"
          style={[
            styles.rule,
            {
              top: field * 0.045,
              left: field * 0.045,
              right: field * 0.045,
              bottom: field * 0.045,
              borderRadius: field / 2,
              borderColor: 'rgba(92,72,44,0.34)',
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.rule,
            {
              top: field * 0.055,
              left: field * 0.055,
              right: field * 0.055,
              bottom: field * 0.035,
              borderRadius: field / 2,
              borderColor: 'rgba(255,250,232,0.22)',
            },
          ]}
        />

        {/* the device, standing proud of the recessed field — drawn twice or
            three times over at slight offsets, and never outlined: what makes
            it read as raised is where its shadow and its lip fall */}
        {emblem === 'floral' ? (
          <View pointerEvents="none" style={styles.emblem}>
            <Sprig
              size={field * 0.78}
              color="rgba(84,64,38,0.5)"
              offset={{ x: emboss * 0.7, y: emboss }}
            />
            <Sprig size={field * 0.78} color="#E4D8BC" offset={{ x: 0, y: 0 }} />
          </View>
        ) : (
          <Monogram field={field} letter={monogram} />
        )}
      </View>

      {/* the satin sweep, and the two soft glints on the rim — again inside a
          circular clip so nothing lands outside the wax */}
      <View pointerEvents="none" style={[styles.glaze, { borderRadius: size / 2 }]}>
        <View style={[StyleSheet.absoluteFill, GradientStyles.sealSheen]} />
        <View
          style={[
            styles.glint,
            SPECULAR,
            {
              width: size * 0.34,
              height: size * 0.2,
              borderRadius: size * 0.17,
              left: size * 0.1,
              top: size * 0.12,
              transform: [{ rotate: '-36deg' }],
            },
          ]}
        />
        <View
          style={[
            styles.glint,
            SPECULAR,
            {
              width: size * 0.16,
              height: size * 0.1,
              borderRadius: size * 0.08,
              right: size * 0.06,
              top: size * 0.46,
              opacity: 0.7,
              transform: [{ rotate: '62deg' }],
            },
          ]}
        />
      </View>
    </View>
  );
}

/**
 * The single letter cut into the die, standing proud of the dish it sits in.
 *
 * A struck letter is not a coloured letter — it is the *same wax* as the floor
 * around it, an eighth of a millimetre higher, and the only thing that tells
 * you so is what the light does at its two edges. So it is drawn three times
 * over: the shadow the raised stroke throws, offset away from the light; the
 * lip the die pulled up on the near side, offset into it; and the flat top of
 * the stroke laid over the middle of both, a shade lighter than the dish
 * because it is that much closer to the source. Nothing is outlined and
 * nothing is tinted — all three passes are the letter in the same face at the
 * same size, and the relief is entirely in the two or three points between
 * them.
 *
 * Each pass is centred by its own box rather than positioned, so the letter
 * sits on the middle of the dish at every size the seal is used at.
 */
function Monogram({ field, letter }: { field: number; letter: string }) {
  /* How far the stroke stands off the floor. Everything else is measured off
     this, so the relief stays in proportion as the seal scales. */
  const relief = Math.max(1, field * 0.042);

  const glyph = {
    fontFamily: DefaultTheme.fonts.script,
    fontSize: field * 0.66,
    lineHeight: field * 0.92,
    textAlign: 'center' as const,
    /* Parisienne hangs its capitals a touch low in the line box, and the eye
       reads a monogram off its ink, not off its metrics. */
    marginTop: -field * 0.035,
  };

  const pass = (x: number, y: number) => [
    styles.emblem,
    { transform: [{ translateX: x }, { translateY: y }] },
  ];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={pass(relief * 0.9, relief * 1.1)}>
        <Text style={[glyph, styles.monogramShadow]}>{letter}</Text>
      </View>
      <View style={pass(-relief * 0.55, -relief * 0.6)}>
        <Text style={[glyph, styles.monogramLip]}>{letter}</Text>
      </View>
      <View style={styles.emblem}>
        <Text style={[glyph, styles.monogramFace]}>{letter}</Text>
      </View>
    </View>
  );
}

/**
 * The device on the die: a blossom over a pair of leafed stems, the botanical
 * sprig from the reference stamp. One flat colour per pass — the relief comes
 * from stacking two of these at slightly different offsets.
 */
function Sprig({
  size,
  color,
  offset,
}: {
  size: number;
  color: string;
  offset: { x: number; y: number };
}) {
  const petalWidth = size * 0.2;
  const petalHeight = size * 0.3;
  const stemWidth = Math.max(1, size * 0.045);

  const petal = {
    position: 'absolute' as const,
    width: petalWidth,
    height: petalHeight,
    left: (size - petalWidth) / 2,
    // The base of every petal sits on the flower's centre, which is where they
    // all pivot from.
    top: size * 0.34 - petalHeight,
    transformOrigin: 'bottom' as const,
    borderTopLeftRadius: petalWidth / 2,
    borderTopRightRadius: petalWidth / 2,
    borderBottomLeftRadius: petalWidth * 0.14,
    borderBottomRightRadius: petalWidth * 0.14,
    backgroundColor: color,
  };

  const stem = {
    position: 'absolute' as const,
    width: stemWidth,
    height: size * 0.36,
    left: (size - stemWidth) / 2,
    top: size * 0.4,
    transformOrigin: 'top' as const,
    borderRadius: stemWidth,
    backgroundColor: color,
  };

  const leaf = (span: number) => ({
    position: 'absolute' as const,
    width: size * span,
    height: size * span * 0.5,
    borderTopLeftRadius: size * span * 0.5,
    borderBottomRightRadius: size * span * 0.5,
    borderTopRightRadius: size * span * 0.14,
    borderBottomLeftRadius: size * span * 0.14,
    backgroundColor: color,
  });

  return (
    <View
      style={[
        styles.sprig,
        {
          width: size,
          height: size,
          transform: [{ translateX: offset.x }, { translateY: offset.y }],
        },
      ]}>
      {[-68, -34, 0, 34, 68].map((angle) => (
        <View key={angle} style={[petal, { transform: [{ rotate: `${angle}deg` }] }]} />
      ))}

      {/* the eye of the flower */}
      <View
        style={{
          position: 'absolute',
          width: size * 0.14,
          height: size * 0.14,
          borderRadius: size * 0.07,
          left: size * 0.43,
          top: size * 0.27,
          backgroundColor: color,
        }}
      />

      {/* the two stems, and the leaves off them */}
      <View style={[stem, { transform: [{ rotate: '-30deg' }] }]} />
      <View style={[stem, { transform: [{ rotate: '30deg' }] }]} />

      <View style={[leaf(0.2), { left: size * 0.2, top: size * 0.54, transform: [{ rotate: '-24deg' }] }]} />
      <View style={[leaf(0.16), { left: size * 0.13, top: size * 0.72, transform: [{ rotate: '-12deg' }] }]} />
      <View
        style={[
          leaf(0.2),
          { right: size * 0.2, top: size * 0.54, transform: [{ scaleX: -1 }, { rotate: '-24deg' }] },
        ]}
      />
      <View
        style={[
          leaf(0.16),
          { right: size * 0.13, top: size * 0.72, transform: [{ scaleX: -1 }, { rotate: '-12deg' }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /** The glow and the cast shadow, both of which sit behind the wax. */
  underlay: {
    position: 'absolute',
    zIndex: -1,
  },
  faceHolder: {
    position: 'absolute',
    top: 0,
  },
  /** Flat, and matched to where `sealWax` ends, so the join is invisible and
   *  the lighting across body and lobes comes from `sealRim` and `sealSheen`. */
  scallop: {
    position: 'absolute',
    backgroundColor: '#B09A72',
  },
  core: {
    position: 'absolute',
    backgroundColor: '#B09A72',
  },
  /** A coat that has to stop at the wax's edge rather than the box's. */
  glaze: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
  },
  /** One struck letter of the ring legend, at this size a bead. */
  mark: {
    position: 'absolute',
    backgroundColor: 'rgba(88,68,42,0.4)',
  },
  field: {
    position: 'absolute',
    backgroundColor: '#BBA57C',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rule: {
    position: 'absolute',
    borderWidth: 1,
  },
  emblem: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** What the raised stroke throws down onto the floor of the dish. Carries a
   *  soft shadow of its own, because wax takes no hard edge. */
  monogramShadow: {
    color: 'rgba(74, 56, 30, 0.6)',
    textShadowColor: 'rgba(74, 56, 30, 0.42)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  /** The lip on the side the light comes from, where the die lifted the wax. */
  monogramLip: {
    color: 'rgba(255, 251, 238, 0.72)',
  },
  /** And the flat top of the stroke — the dish's own colour, one step up. */
  monogramFace: {
    color: '#E7DBBE',
    textShadowColor: 'rgba(96, 74, 44, 0.34)',
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 1.4,
  },
  sprig: {
    position: 'absolute',
  },
  glint: {
    position: 'absolute',
  },
  /** The raw inside of the break — wax has no gloss on a fresh fracture. */
  crackFace: {
    position: 'absolute',
    top: '14%',
    bottom: '14%',
    backgroundColor: '#6E5B3C',
  },
  crumb: {
    position: 'absolute',
    backgroundColor: '#9A8562',
  },
  pressable: {
    ...StyleSheet.absoluteFill,
    cursor: 'pointer',
  },
});
