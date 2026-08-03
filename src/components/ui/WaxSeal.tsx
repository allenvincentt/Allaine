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

import { DefaultTheme } from '@/constants/defaultTheme';
import { GradientStyles, gradientStyle } from '@/constants/gradient';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Poured wax never lands as a circle. These lobes sit *behind* the main blob
 * and poke past it, which is what gives the outline its molten, uneven edge —
 * the big one on the right is the bulge from the reference. Fractions of the
 * box, so the whole thing scales cleanly.
 */
const LOBES = [
  { cx: 0.85, cy: 0.36, d: 0.44 },
  { cx: 0.17, cy: 0.31, d: 0.36 },
  { cx: 0.12, cy: 0.63, d: 0.32 },
  { cx: 0.33, cy: 0.85, d: 0.38 },
  { cx: 0.68, cy: 0.87, d: 0.34 },
  { cx: 0.5, cy: 0.1, d: 0.3 },
] as const;

const SPECULAR = gradientStyle(
  'radial-gradient(circle, rgba(255,242,238,0.9) 0%, rgba(255,236,230,0.34) 42%, rgba(255,236,230,0) 72%)',
);

/** Never animated — the stand-in when a caller does not pass a `fracture`. */
const INTACT = new Animated.Value(0);

type WaxSealProps = {
  size: number;
  /** The letter pressed into the die. */
  monogram?: string;
  /** 0 keeps the seal whole; driving it to 1 snaps it in two and drops it. */
  fracture?: Animated.Value | Animated.AnimatedInterpolation<number>;
  onPress?: () => void;
  disabled?: boolean;
  /** The breathing glow underneath — the only affordance the envelope has. */
  glow?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A hand-poured wax seal: an uneven glossy blob with a die pressed into it,
 * the monogram standing proud of the recessed field. Built out of layered
 * gradients rather than an image so it stays sharp at any size, and so it can
 * be broken cleanly in half — the two halves are the same drawing behind two
 * adjacent clips, so at rest the seam is invisible.
 */
export function WaxSeal({
  size,
  monogram = 'A',
  fracture,
  onPress,
  disabled = false,
  glow = true,
  accessibilityLabel = 'Break the seal',
  style,
}: WaxSealProps) {
  const reducedMotion = useReducedMotion();
  const split = fracture ?? INTACT;
  const press = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion || !glow) {
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reducedMotion, glow]);

  /* The seam. A half-pixel of overlap keeps rounding from opening a hairline
     gap down the middle while the seal is still whole. */
  const leftWidth = Math.ceil(size / 2);
  const rightWidth = size - leftWidth + 0.5;

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
      haloFade: split.interpolate({
        inputRange: [0, 0.35],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    };
  }, [split, size]);

  const pressScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] });

  const half = { position: 'absolute' as const, top: 0, height: size, overflow: 'hidden' as const };

  return (
    <Animated.View
      style={[
        { width: size, height: size },
        style,
        { transform: [{ scale: motion.scale }, { scale: pressScale }] },
      ]}>
      {glow && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            GradientStyles.sealHalo,
            {
              width: size * 2.3,
              height: size * 2.3,
              borderRadius: size * 1.15,
              left: -size * 0.65,
              top: -size * 0.65,
              opacity: Animated.multiply(
                motion.haloFade,
                pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.95] }),
              ),
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) },
              ],
            },
          ]}
        />
      )}

      <Animated.View
        pointerEvents="none"
        style={[
          half,
          {
            left: 0,
            width: leftWidth,
            opacity: motion.fade,
            transform: [
              { translateX: motion.leftX },
              { translateY: motion.fall },
              { rotate: motion.leftSpin },
            ],
          },
        ]}>
        <View style={[styles.faceHolder, { width: size, height: size, left: 0 }]}>
          <SealFace size={size} monogram={monogram} />
        </View>
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
          <SealFace size={size} monogram={monogram} />
        </View>
      </Animated.View>

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
function SealFace({ size, monogram }: { size: number; monogram: string }) {
  /* The die sits a touch up and left of centre, the way a stamp lands when the
     wax spreads out under it unevenly. */
  const die = size * 0.66;
  const dieLeft = size * 0.46 - die / 2;
  const dieTop = size * 0.45 - die / 2;
  const emboss = Math.max(1, size * 0.022);

  const glyph = {
    position: 'absolute' as const,
    fontFamily: DefaultTheme.fonts.script,
    fontSize: die * 0.62,
    lineHeight: die * 0.86,
    textAlign: 'center' as const,
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* the molten edge */}
      {LOBES.map((lobe) => (
        <View
          key={`${lobe.cx}-${lobe.cy}`}
          style={[
            styles.lobe,
            {
              width: size * lobe.d,
              height: size * lobe.d,
              borderRadius: (size * lobe.d) / 2,
              left: size * lobe.cx - (size * lobe.d) / 2,
              top: size * lobe.cy - (size * lobe.d) / 2,
            },
          ]}
        />
      ))}

      {/* the nub where the wax stick was pulled away */}
      <View
        style={[
          styles.tail,
          {
            width: size * 0.26,
            height: size * 0.17,
            borderRadius: size * 0.085,
            right: size * 0.02,
            top: size * 0.11,
          },
        ]}
      />

      {/* the blob proper — deliberately unequal corners */}
      <View
        style={[
          styles.blob,
          GradientStyles.sealWax,
          {
            top: size * 0.05,
            left: size * 0.05,
            right: size * 0.05,
            bottom: size * 0.05,
            borderTopLeftRadius: size * 0.5,
            borderTopRightRadius: size * 0.42,
            borderBottomRightRadius: size * 0.48,
            borderBottomLeftRadius: size * 0.44,
          },
        ]}
      />

      {/* one vignette over blob *and* lobes, which is what fuses them into a
          single piece of wax rather than a circle with bumps stuck on */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, GradientStyles.sealRim]} />

      {/* the die impression */}
      <View
        style={[
          styles.die,
          GradientStyles.sealDie,
          { width: die, height: die, borderRadius: die / 2, left: dieLeft, top: dieTop },
        ]}>
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, GradientStyles.sealDieShade, { borderRadius: die / 2 }]}
        />

        {/* concentric marks left by the rim of the stamp */}
        <View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              top: die * 0.035,
              left: die * 0.035,
              right: die * 0.035,
              bottom: die * 0.035,
              borderRadius: die / 2,
              borderColor: 'rgba(24,2,3,0.4)',
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              top: die * 0.045,
              left: die * 0.045,
              right: die * 0.045,
              bottom: die * 0.025,
              borderRadius: die / 2,
              borderColor: 'rgba(226,132,110,0.16)',
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              top: die * 0.1,
              left: die * 0.1,
              right: die * 0.1,
              bottom: die * 0.1,
              borderRadius: die / 2,
              borderColor: 'rgba(24,2,3,0.28)',
            },
          ]}
        />

        {/* the monogram, standing proud of the recessed field: dark side away
            from the light, hot rim towards it, face on top of both */}
        <View pointerEvents="none" style={styles.monogram}>
          <Text
            style={[
              glyph,
              {
                color: 'rgba(20,1,2,0.92)',
                transform: [{ translateX: emboss * 0.8 }, { translateY: emboss * 1.2 }],
              },
            ]}>
            {monogram}
          </Text>
          <Text
            style={[
              glyph,
              {
                color: 'rgba(236,148,124,0.5)',
                transform: [{ translateX: -emboss * 0.6 }, { translateY: -emboss * 0.8 }],
              },
            ]}>
            {monogram}
          </Text>
          <Text
            style={[
              glyph,
              {
                color: '#9C2720',
                textShadowColor: 'rgba(20,1,2,0.55)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              },
            ]}>
            {monogram}
          </Text>
        </View>
      </View>

      {/* lacquer: one continuous sweep across rim and die alike */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, GradientStyles.sealSheen]} />

      {/* the two hard catchlights */}
      <View
        pointerEvents="none"
        style={[
          styles.catchlight,
          SPECULAR,
          {
            width: size * 0.3,
            height: size * 0.17,
            borderRadius: size * 0.15,
            left: size * 0.11,
            top: size * 0.13,
            transform: [{ rotate: '-38deg' }],
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.catchlight,
          SPECULAR,
          {
            width: size * 0.17,
            height: size * 0.1,
            borderRadius: size * 0.085,
            right: size * 0.04,
            top: size * 0.44,
            opacity: 0.75,
            transform: [{ rotate: '62deg' }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    zIndex: -1,
  },
  faceHolder: {
    position: 'absolute',
    top: 0,
  },
  lobe: {
    position: 'absolute',
    backgroundColor: '#7D1113',
  },
  tail: {
    position: 'absolute',
    backgroundColor: '#8C1715',
    transform: [{ rotate: '-32deg' }],
  },
  blob: {
    position: 'absolute',
    backgroundColor: '#7D1113',
  },
  die: {
    position: 'absolute',
    backgroundColor: '#6B0F11',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  monogram: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catchlight: {
    position: 'absolute',
  },
  pressable: {
    ...StyleSheet.absoluteFill,
    cursor: 'pointer',
  },
});
