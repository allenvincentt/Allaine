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

const SCALLOP_RING = 0.4;
const SCALLOP_SIZE = 0.18;

const CORE = 0.84;
const FIELD = 0.64;
const LEGEND = 0.375;
const LEGEND_MARKS = 20;

const SCALLOPS = SCALLOP_JITTER.map(([grow, drift], index) => {
  const turn = ((index + drift * 0.3) / SCALLOP_JITTER.length) * Math.PI * 2 - Math.PI / 2;

  return {
    d: SCALLOP_SIZE * grow,
    cx: 0.5 + Math.cos(turn) * SCALLOP_RING,
    cy: 0.5 + Math.sin(turn) * SCALLOP_RING * 0.97,
  };
});

const CRUMBS = [
  { cx: 0.38, cy: 0.44, d: 0.1, dx: -0.5, dy: 0.62, spin: '-120deg' },
  { cx: 0.58, cy: 0.5, d: 0.08, dx: 0.56, dy: 0.5, spin: '140deg' },
  { cx: 0.5, cy: 0.66, d: 0.06, dx: 0.12, dy: 0.78, spin: '-70deg' },
] as const;

const SPECULAR = gradientStyle(
  'radial-gradient(circle, rgba(255,253,244,0.58) 0%, rgba(255,250,236,0.18) 44%, rgba(255,250,236,0) 74%)',
);

const INTACT = new Animated.Value(0);

type WaxSealProps = {
  size: number;
  monogram?: string;
  emblem?: 'floral' | 'monogram';
  fracture?: Animated.Value | Animated.AnimatedInterpolation<number>;
  onPress?: () => void;
  disabled?: boolean;
  glow?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

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

  const leftWidth = Math.ceil(size / 2);
  const rightWidth = size - leftWidth;

  const motion = useMemo(() => {
    const drift = size * 0.36;
    return {
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
      castFade: split.interpolate({
        inputRange: [0, 0.24],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
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

  const markWidth = Math.max(1, size * 0.017);
  const markHeight = Math.max(1.5, size * 0.034);

  return (
    <View style={StyleSheet.absoluteFill}>
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

      <View
        pointerEvents="none"
        style={[styles.glaze, { borderRadius: size / 2 }]}>
        <View style={[StyleSheet.absoluteFill, GradientStyles.sealRim]} />
      </View>

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
              transformOrigin: `${markWidth / 2}px ${markHeight / 2 + legend}px`,
              transform: [{ rotate: `${(index / LEGEND_MARKS) * 360}deg` }],
            },
          ]}
        />
      ))}

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

function Monogram({ field, letter }: { field: number; letter: string }) {
  const relief = Math.max(1, field * 0.042);

  const glyph = {
    fontFamily: DefaultTheme.fonts.script,
    fontSize: field * 0.66,
    lineHeight: field * 0.92,
    textAlign: 'center' as const,
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
  underlay: {
    position: 'absolute',
    zIndex: -1,
  },
  faceHolder: {
    position: 'absolute',
    top: 0,
  },
  scallop: {
    position: 'absolute',
    backgroundColor: '#B09A72',
  },
  core: {
    position: 'absolute',
    backgroundColor: '#B09A72',
  },
  glaze: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
  },
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
  monogramShadow: {
    color: 'rgba(74, 56, 30, 0.6)',
    textShadowColor: 'rgba(74, 56, 30, 0.42)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  monogramLip: {
    color: 'rgba(255, 251, 238, 0.72)',
  },
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
